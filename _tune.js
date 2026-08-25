/* 초깃값을 정하기 위한 측정. (배포 불필요)
   사용: node _tune.js ["<실제 나이스 파일>"]

   예시 학년은 정답을 안다 — 아홉 명은 일부러 심었고 스물일곱 명은 고유하게 썼다.
   그래서 설정을 바꿔 가며 '놓친 것' 과 '헛짚은 것' 을 직접 셀 수 있다. */
const path = require('path');
const lib = require('./_lib.js');
const analyze = lib.algo().analyze;
const base = lib.defaults();
/* 겹침은 과목마다 따로 잰다. 두 과목을 한 솥에 넣고 재면 서로 걸려
   헛짚음이 부풀어 오르므로, 정답을 아는 「대수」 묶음만 본다. */
const rows = lib.sampleRows('대수');

const at = (c, n) => rows.findIndex(r => r.cls === String(c) && r.no === String(n));
const PLANTED = new Set([at(1,5), at(1,11),                       // 그대로 베낀 둘
                         at(2,3), at(2,6), at(2,9), at(2,12),     // 문형 넷
                         at(1,2), at(2,7), at(3,4)]);             // 반을 넘은 문형 셋
const ACT = '2학기 수학 융합탐구 프로젝트 수행평가에서';

function score(o){
  const r = analyze(rows, o);
  let miss = 0, wrong = 0;
  r.per.forEach((p, i) => {
    const flagged = p.a.length > 0 || p.b.length > 0;
    if (PLANTED.has(i) && !flagged) miss++;          // 놓침 — 심어 둔 것을 못 잡음
    if (!PLANTED.has(i) && flagged) wrong++;         // 헛짚음 — 고유하게 쓴 사람을 잡음
  });
  const actOut = r.phraseC.some(x => x.t.indexOf('융합탐구 프로젝트') >= 0);
  return { miss, wrong, actOut, r };
}

console.log('■ 예시 학년 36명 — 정답을 아는 자료로 재기\n');
console.log('  세로: 최소 구간 길이 · 가로: 공통 활동 기준');
console.log('  칸 안은 「놓침/헛짚음」. 0/0 이 가장 좋다.\n');

const SPANS = [8, 12, 16, 20, 24, 28, 32];
const PCTS  = [8, 12, 20, 30, 40, 50, 60];
process.stdout.write('        ');
PCTS.forEach(p => process.stdout.write(String(p + '%').padStart(8)));
console.log();
for (const sp of SPANS){
  process.stdout.write(String(sp + '자').padStart(8));
  for (const pc of PCTS){
    const s = score(Object.assign({}, base, { minSpan:sp, commonPct:pc, declared:[] }));
    const cell = `${s.miss}/${s.wrong}` + (s.actOut ? '' : '*');
    process.stdout.write(cell.padStart(8));
  }
  console.log();
}
console.log('\n  * 표는 수행평가명이 공통 활동으로 안 빠진 경우 (직접 적으면 해결됨)');

/* 활동명을 직접 적으면 공통 활동 기준이 할 일이 줄어든다.
   그때도 같은 초깃값이 맞는지 본다. */
console.log('\n■ 활동명을 직접 적어 두면 어떻게 달라지나\n');
console.log('  기준     안 적었을 때        적었을 때');
for (const pc of PCTS){
  const a = score(Object.assign({}, base, { commonPct:pc, declared:[] }));
  const b = score(Object.assign({}, base, { commonPct:pc, declared:[ACT] }));
  console.log(`  ${String(pc+'%').padStart(4)}     놓침 ${a.miss} · 헛짚음 ${a.wrong}` +
              `        놓침 ${b.miss} · 헛짚음 ${b.wrong}`);
}

/* 한 반이 통째로 돌려 쓰면 그 반은 전체의 몇 %인가.
   공통 활동 기준이 그보다 낮으면 그 문형이 활동명으로 빠져 버린다 —
   가장 중요한 신호가 조용히 사라지는 것이다. */
console.log('\n■ 한 반이 전체에서 차지하는 몫\n');
console.log('  반 수   한 반 몫   이 값보다 기준이 낮으면 한 반 돌려쓰기가 통째로 빠진다');
for (const c of [2, 3, 4, 5, 6, 7]){
  const share = 100 / c;
  console.log(`  ${c}개반   ${share.toFixed(1).padStart(5)}%    ` +
              (share >= base.commonPct ? `← 지금 기본값 ${base.commonPct}% 는 위험` : '안전'));
}

/* 실제 기록에서 짧은 겹침이 얼마나 흔한지 — 최소 구간 길이의 근거 */
const files = process.argv.slice(2);
if (files.length){
  const rx = require('./_readxlsx.js');
  const { flattenNeisPaged } = lib.paged();
  /* 파일은 반별 인쇄 양식일 수도, 예전 업로드 양식일 수도 있다. 둘 다 받는다. */
  const real = [];
  for (const file of files){
    const g0 = rx.read(file);
    const flat = flattenNeisPaged(g0);
    if (flat){
      flat.slice(1).forEach(r => real.push({ cls:r[0], no:r[1], subj:r[3],
        label:`${r[0]}반 ${r[1]}번`, text:r[6] }));
      continue;
    }
    const head2 = g0[0].map(h => String(h).replace(/_x000D_/g,'').replace(/\s/g,''));
    const ct = head2.findIndex(h => h.indexOf('세부능력') >= 0 || h.indexOf('특기사항') >= 0);
    const ci = head2.indexOf('반/번호');
    const cs = head2.indexOf('과목');
    for (let i = 1; i < g0.length; i++){
      const t = String(g0[i][ct] == null ? '' : g0[i][ct]).trim();
      if (t.length < 10) continue;
      const [cls, no] = String(g0[i][ci] == null ? ('/' + i) : g0[i][ci]).split('/');
      real.push({ cls, no, subj: cs >= 0 ? String(g0[i][cs] || '') : '',
                  label:`${cls}반 ${no}번`, text:t });
    }
  }

  /* 화면과 같게 **과목마다 따로** 재고 합친다 */
  const bySubj = new Map();
  real.forEach(r => { const k = r.subj || '(과목 미상)';
    if (!bySubj.has(k)) bySubj.set(k, []); bySubj.get(k).push(r); });

  console.log(`\n■ 실제 기록 ${real.length}건 · 과목 ${bySubj.size}개 — 최소 구간 길이를 바꾸면 어떻게 되나\n`);
  console.log('  길이    확인 대상        평균 생존   같은 반 겹침   공통으로 빠진 표현');
  for (const sp of [12, 16, 18, 20, 22, 24, 28]){
    const o = Object.assign({}, base, { minSpan:sp, declared:[] });
    let flag = 0, same = 0, alive = 0, n = 0, common = 0;
    for (const [, sub] of bySubj){
      if (sub.length < 2){ n += sub.length; alive += sub.length; continue; }
      const r = analyze(sub, o);
      r.per.forEach(p => { n++; alive += p.alive;
        if (p.a.length || p.b.length) flag++;
        if (p.sameCls) same++; });
      common += r.phraseC.length;
    }
    console.log(`  ${String(sp+'자').padStart(5)}   ${String(flag+'건').padStart(7)} (${String(Math.round(flag/n*100)+'%').padStart(4)})` +
                `   ${String((alive/n*100).toFixed(1)+'%').padStart(9)}   ${String(same+'건').padStart(9)}` +
                `   ${String(common+'개').padStart(10)}`);
  }
} else {
  console.log('\n(실제 파일 경로를 주면 진짜 기록에서도 재 봅니다 — 여러 개를 한꺼번에 주셔도 됩니다)');
}
