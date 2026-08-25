/* 실제 학년 파일로 시간과 결과를 재 본다. (배포 불필요)

   사용: node _bench_grade.js "…/2-1과세특.xlsx" "…/2-2과세특.xlsx" …

   화면과 **같은 코드**를 씁니다 — index.html 에서 꺼내 씁니다.
   학생 이름과 세특 본문은 한 글자도 찍지 않습니다. 숫자만 나옵니다. */
const path = require('path');
const lib = require('./_lib.js');
const { read } = require('./_readxlsx.js');
const { flattenNeisPaged } = lib.paged();
const { analyzeGrouped } = lib.algo();
const o = Object.assign({}, lib.defaults(), { declared: [] });

const files = process.argv.slice(2);
if (!files.length){
  console.log('사용: node _bench_grade.js "<xlsx 경로>" ...');
  process.exit(1);
}

const rows = [];
let readMs = 0;
for (const f of files){
  const t = process.hrtime.bigint();
  const flat = flattenNeisPaged(read(f));
  readMs += Number(process.hrtime.bigint() - t) / 1e6;
  if (!flat){ console.log(`  ${path.basename(f)} — 인쇄 양식으로 알아보지 못했습니다`); continue; }
  flat.slice(1).forEach(r => rows.push({
    cls:r[0], no:r[1], name:r[2], subj:r[3], text:r[6],
    label:`${r[0]}반 ${r[1]}번 · ${r[3]}`
  }));
  console.log(`  ${path.basename(f).padEnd(22)} ${String(flat.neis.rows).padStart(5)}건 · ` +
              `${flat.neis.cls.join(',')}반 · ${flat.neis.subj}과목`);
}
if (rows.length < 2){ console.log('읽은 기록이 너무 적습니다.'); process.exit(1); }

const t1 = process.hrtime.bigint();
const res = analyzeGrouped(rows, o);
const ms = Number(process.hrtime.bigint() - t1) / 1e6;

const per = res.per;
const flagged = per.filter(p => p.a.length || p.b.length).length;
const same = per.filter(p => p.sameCls > 0).length;
const avg = per.reduce((a, p) => a + p.alive, 0) / per.length;
const students = new Set(rows.map(r => r.cls + '/' + r.no)).size;

console.log(`\n설정 ${JSON.stringify(o)}`);
console.log(`읽기 ${readMs.toFixed(0)}ms · 분석 ${ms.toFixed(0)}ms`);
console.log(`기록 ${per.length}건 · 학생 ${students}명 · 과목 ${res.subjects.length}개`);
console.log(`평균 생존 ${(avg*100).toFixed(1)}% · 확인 대상 ${flagged}건 · 같은 반 겹침 ${same}건`);
console.log(`공통 활동 기준 ${res.commonRange ? res.commonRange.join('~') : '—'}명`);

console.log('\n과목                기록   반  생존  확인  같은반  최다');
res.subjects.slice().sort((a, b) => a.alive - b.alive).forEach(x => console.log(
  `${x.subj.padEnd(18)}${String(x.n).padStart(5)}${String(x.cls.size).padStart(4)}` +
  `${String((x.alive*100).toFixed(0) + '%').padStart(6)}${String(x.flagged).padStart(6)}` +
  `${String(x.sameCls).padStart(7)}${String(x.maxN).padStart(6)}`));

console.log('\n※ 조절판을 움직일 때마다 이만큼 다시 잽니다. 몇 초를 넘으면 손가락이 기다립니다.');
