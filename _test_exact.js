/* 토씨까지 같은데도 '그대로' 로 안 잡히던 자리를 붙잡아 둔다. (배포 불필요)

   pickSpans 는 자리마다 **가장 큰 무리**를 골라 붙이고 무리가 바뀌면 구간을 자른다.
   그런데 토씨까지 같은 문장이라도 어절마다 함께 쓴 인원은 들쭉날쭉해서
   (「판례를 비교 분석하여」 는 여럿이, 그 앞뒤는 둘만) 긴 베낌이 짧은 조각으로
   갈리고, 조각마다 최소 구간 길이에 못 미쳐 **전부 버려졌다.**
   고유명사를 지운 골격(B)은 살아남으므로 화면에는 하늘색만 남았다 —
   글자 그대로 베낀 자리가 '주제어만 바꾼 문형' 으로 보이던 것이다.

   되살리되, **큰 무리가 통째로 나눠 쓴 긴 구간은 건드리지 않아야** 한다.
   그게 공통 활동(활동명)을 가려내는 근거이기 때문이다. 둘 다 여기서 확인한다. */
const lib = require('./_lib.js');
const { analyze } = lib.algo();
const o = Object.assign({}, lib.defaults(), { declared: [] });

/* 활동명 — 열두 명이 모두 쓴다. 길이가 넉넉해 한 덩이로 남고 공통 활동으로 빠져야 한다. */
const OPEN = '형사사건 판결문 작성하기 수행평가 활동에서 ';
/* 여럿이 함께 쓰는 상투구 — 낱낱으로는 최소 구간 길이에 못 미친다 */
const MID  = ' 판례를 비교 분석하여 ';
const TAIL = ' 물을 수 있는지 검토함.';
/* 짝만 나눠 쓰는 대목 — 역시 낱낱으로는 짧다 */
const P1 = '대화방 비하 사건에서';
const P2 = ' 공동 책임을';

// 0번과 1번은 OPEN 뒤가 토씨까지 같다. 서로 다른 반이다.
const TWIN = P1 + MID + P2 + TAIL;
const others = [
  '게시글 명예훼손 사건에서', '초상권 침해 사건에서', '허위사실 유포 사건에서',
  '저작권 침해 사건에서', '개인정보 유출 사건에서', '업무방해 사건에서',
  '모욕 사건에서', '협박 사건에서', '사기 사건에서', '절도 사건에서'
];
const rows = [
  { cls:'1', no:'1', text: OPEN + TWIN },
  { cls:'3', no:'7', text: OPEN + TWIN },
].concat(others.map((t, k) => ({
  cls: String((k % 4) + 1), no: String(k + 10),
  text: OPEN + t + MID + ' 어떤 조치를' + TAIL
})));
rows.forEach(r => { r.label = `${r.cls}반 ${r.no}번`; });

const res = analyze(rows, o);
const p = res.per[0], doc = p.doc;
const twinDoc = res.per[1].doc;

console.log(`학생 ${rows.length}명 · 공통 활동 기준 ${res.commonN}명 이상`);
console.log(`0번 본문 ${doc.length}자 · 최소 구간 길이 ${o.minSpan}자`);
const show = (t, list) => { console.log(t);
  list.forEach(s => console.log(`  ${String(s.start).padStart(3)}~${String(s.end).padStart(3)}` +
    ` (${String(s.end-s.start).padStart(3)}자) ${String(s.n).padStart(2)}명  "${doc.slice(s.start, s.end).slice(0,34)}"`)); };
show('그대로(A):', p.a);
show('문형(B):', p.b);
show('공통 활동:', p.common);

const ok = [], fail = [];
const chk = (n, c) => (c ? ok : fail).push(n);

/* ① 토씨까지 같은 대목이 '그대로' 로 잡혀야 한다 */
const exact = p.a.filter(s => twinDoc.indexOf(doc.slice(s.start, s.end)) >= 0);
chk('토씨까지 같은 대목이 그대로(A)로 잡힌다', exact.length > 0);
chk('그 구간이 짝의 본문에도 글자 그대로 있다',
    exact.some(s => s.end - s.start >= o.minSpan));
const covered = exact.reduce((a, s) => a + (s.end - s.start), 0);
chk('베낀 대목의 절반 이상을 그대로로 덮는다', covered >= TWIN.length / 2);

/* ② 화면에서 노랑이 하늘색을 덮는지 — markup 이 A 를 마지막에 칠한다 */
const cov = new Uint8Array(doc.length);
p.a.forEach(s => cov.fill(1, s.start, s.end));
const stillCyan = p.b.filter(s => {
  const t = doc.slice(s.start, s.end);
  if (t.length < o.minSpan) return false;
  if (!twinDoc.includes(t)) return false;
  let y = 0; for (let k = s.start; k < s.end; k++) y += cov[k];
  return y === 0;                                  // 노랑이 하나도 안 깔린 채 하늘색만
});
chk('토씨까지 같은 자리가 하늘색만으로 남지 않는다', stillCyan.length === 0);

/* ③ 큰 무리가 통째로 나눠 쓴 **긴** 활동명은 손대지 않아야 한다.
      되살리기가 이 자리를 삼키면 공통 활동을 가려내는 근거가 무너진다. */
chk('활동명은 공통 활동으로 빠진다',
    p.common.some(s => doc.slice(s.start, s.end).indexOf('판결문 작성하기') >= 0));
chk('활동명이 그대로(A)에 섞여 들어가지 않는다',
    !p.a.some(s => doc.slice(s.start, s.end).indexOf('판결문 작성하기') >= 0));

/* ④ 짧은 상투구가 베낌 한가운데 끼어 있으면 갈라 세우지 않는다.
      연결부까지 토씨가 같으면 활동명이 겹친 게 아니라 문장을 베낀 것이다.
      대신 직접 적어 두면 그 자리만 도려낸다 — 그 길이 열려 있는지 확인한다. */
const res2 = analyze(rows, Object.assign({}, o, { declared: [MID.trim()] }));
const p2 = res2.per[0];
chk('적어 둔 상투구는 도려내어 점선으로 뺀다',
    p2.common.some(s => s.dec && p2.doc.slice(s.start, s.end).indexOf('판례를 비교') >= 0));
chk('도려낸 뒤에도 베낀 대목은 그대로로 남는다',
    p2.a.some(s => twinDoc.indexOf(p2.doc.slice(s.start, s.end)) >= 0));

/* ④ 되살린 구간도 최소 길이 규칙을 지킨다 */
chk('모든 그대로 구간이 최소 길이 이상', p.a.every(s => s.end - s.start >= o.minSpan));

/* ⑤ 고유하게 쓴 학생이 늘어나면 안 된다 */
const flagged = res.per.filter(x => x.a.length || x.b.length).length;
console.log(`\n확인 대상 ${flagged}명 / ${rows.length}명`);
chk('짝 둘은 확인 대상이다', res.per[0].a.length > 0 && res.per[1].a.length > 0);

console.log(`\n통과 ${ok.length} / ${ok.length + fail.length}`);
fail.forEach(n => console.log('  ✗ ' + n));
process.exit(fail.length ? 1 : 0);
