/* 엑셀을 스스로 읽는 부분을 확인한다. (배포 불필요)

   예전에는 .xlsx 를 올릴 때마다 해석 라이브러리를 바깥에서 내려받았다.
   학교 네트워크가 그 요청을 막으면 반별 파일을 한 개도 못 열었다.
   이제는 브라우저의 압축 풀기(DecompressionStream)로 여기서 직접 읽는다.

   실제 학생 파일은 쓰지 않는다. 대신 **까다로운 자리를 일부러 심은 xlsx** 를
   여기서 만들어 넣는다 — 빈 칸이 <c/> 로 닫히는 자리, 빈 줄이 <row/> 로 닫히는
   자리, 글자를 두 토막으로 나눠 담은 자리, 압축하지 않고 그냥 넣은 조각까지.
   그 자리를 흘리면 세특이 통째로 사라지거나 옆 칸으로 밀린다. */
const zlib = require('zlib');
const lib = require('./_lib.js');

/* index.html 에서 판독기만 꺼내 쓴다 — 원본과 따로 놀 수 없게 */
const M = new Function(lib.cut('/* ─── 1.6 엑셀을 직접 읽기', 'let xlsxReady') +
  '\nreturn { readXlsxHere, unzipHere, sheetRows, sharedStrings, xmlOf, unescXml, colOfRef };')();

/* ── 아주 작은 zip 만들기 ───────────────────────────────── */
const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };

function zip(entries){          // [{ name, data, store }]
  const locals = [], central = [];
  let off = 0;
  for (const e of entries){
    const raw = Buffer.from(e.data, 'utf8');
    const body = e.store ? raw : zlib.deflateRawSync(raw);
    const name = Buffer.from(e.name, 'utf8');
    const method = e.store ? 0 : 8;
    const lh = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0),
      u32(0), u32(body.length), u32(raw.length), u16(name.length), u16(0), name, body]);
    central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(method),
      u16(0), u16(0), u32(0), u32(body.length), u32(raw.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off), name]));
    locals.push(lh);
    off += lh.length;
  }
  const cd = Buffer.concat(central);
  const eocd = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(entries.length),
    u16(entries.length), u32(cd.length), u32(off), u16(0)]);
  return Buffer.concat([...locals, cd, eocd]);
}

const SS = `<?xml version="1.0"?><sst count="5" uniqueCount="5">` +
  `<si><t>과 목</t></si>` +
  `<si><t xml:space="preserve">문학 </t><t>·현대</t><rPh sb="0" eb="2"><t>버릴것</t></rPh></si>` +
  `<si><t/></si>` +
  `<si><t>토씨 &amp; 「&#x3131;」 겹침</t></si>` +
  `<si><t>세부능력 및 특기사항</t></si></sst>`;

/* 2행: 빈 칸이 <c/> 로 닫힌다 · 3행: 빈 줄이 <row/> 로 닫힌다
   4행: 글자를 칸 안에 바로 담은 자리(inlineStr) 와 두 글자짜리 열(AB) */
const SHEET = `<?xml version="1.0"?><worksheet><sheetData>` +
  `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>4</v></c></row>` +
  `<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2" s="3"/><c r="C2" t="s"><v>3</v></c></row>` +
  `<row r="3"/>` +
  `<row r="4"><c r="A4" t="inlineStr"><is><t>속칸글자</t><rPh><t>버릴것</t></rPh></is></c>` +
  `<c r="B4"><v>26</v></c><c r="AB4" t="s"><v>2</v></c><c r="AC4"><v>7</v></c></row>` +
  `</sheetData></worksheet>`;

const book = zip([
  { name:'[Content_Types].xml', data:'<Types/>' },
  { name:'xl/workbook.xml', data:'<workbook><sheets><sheet name="시트1" sheetId="1" r:id="rId9"/></sheets></workbook>' },
  { name:'xl/_rels/workbook.xml.rels',
    data:'<Relationships><Relationship Id="rId9" Type="ws" Target="worksheets/sheet7.xml"/></Relationships>' },
  { name:'xl/sharedStrings.xml', data: SS, store:true },   // 압축하지 않고 넣은 조각
  { name:'xl/worksheets/sheet7.xml', data: SHEET },
  { name:'xl/worksheets/sheet1.xml', data:'<worksheet><sheetData><row r="1"><c r="A1"><v>엉뚱한시트</v></c></row></sheetData></worksheet>' },
]);

const ok = [], fail = [];
const chk = (n, c) => (c ? ok : fail).push(n);

(async () => {
  const ab = book.buffer.slice(book.byteOffset, book.byteOffset + book.byteLength);
  let g = null, err = null;
  try { g = await M.readXlsxHere(ab); } catch(e){ err = e; }

  chk('xlsx 를 스스로 읽는다', !!g);
  if (!g){ console.log('✗ 읽지 못함: ' + (err && err.message)); process.exit(1); }
  g.forEach((r, i) => console.log(`  ${i+1}행  [${r.map(c => JSON.stringify(c)).join(', ')}]`));

  chk('빈 줄은 건너뛴다 (3행)', g.length === 3);
  chk('압축하지 않고 넣은 조각도 읽는다', g[0][0] === '과 목');
  chk('통합 문서가 가리키는 시트를 고른다 (sheet1 이 아니라 sheet7)',
      !g.some(r => r.some(c => String(c).indexOf('엉뚱한시트') >= 0)));
  chk('두 토막으로 나눠 담은 글자를 잇는다', g[1][0] === '문학 ·현대');
  chk('후리가나(rPh)는 본문에 섞지 않는다',
      !g.some(r => r.some(c => String(c).indexOf('버릴것') >= 0)));
  chk('&amp; · &#x3131; 같은 표기를 되돌린다', g[1][2] === '토씨 & 「ㄱ」 겹침');
  chk('빈 칸이 <c/> 로 닫혀도 옆 칸을 삼키지 않는다', g[1][1] === '' && g[1].length === 3);
  chk('칸 안에 바로 담은 글자(inlineStr)를 읽는다', g[2][0] === '속칸글자');
  chk('숫자 칸을 그대로 읽는다', g[2][1] === '26');
  chk('두 글자짜리 열(AB)을 제자리에 놓는다', g[2][27] === '' && g[2][28] === '7');

  /* 열 번호 셈 자체도 한 번 확인한다 */
  chk('열 이름을 번호로 옳게 바꾼다',
      M.colOfRef('A1') === 0 && M.colOfRef('Z9') === 25 &&
      M.colOfRef('AA1') === 26 && M.colOfRef('AB4') === 27);

  /* zip 이 아닌 것을 주면 조용히 실패해서 예전 길로 넘어가야 한다 */
  let threw = false;
  try { await M.readXlsxHere(Buffer.from('이건 zip 이 아니다').buffer); } catch(e){ threw = true; }
  chk('zip 이 아니면 예전 길로 넘길 수 있게 실패한다', threw);

  console.log(`\n통과 ${ok.length} / ${ok.length + fail.length}`);
  fail.forEach(n => console.log('  ✗ ' + n));
  process.exit(fail.length ? 1 : 0);
})();
