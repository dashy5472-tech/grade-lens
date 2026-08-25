/* 과목마다 따로 재고 다시 하나로 잇는 부분을 확인한다. (배포 불필요)

   학년 전체를 한 솥에 넣고 재면 「문학」과 「화학」이 서로 겹치는 것으로 잡히고,
   공통 활동 기준도 과목 수만큼 부풀어 아무것도 걸리지 않는다. 그래서 과목마다
   따로 재는데, 그러면 **과목 안 번호**로 나온 결과를 학년 전체 번호로 되돌려야 한다.
   여기서 어긋나면 "겹치는 상대"를 눌렀을 때 엉뚱한 학생이 열린다. */
const lib = require('./_lib.js');
const { analyzeGrouped } = lib.algo();
const base = lib.defaults();
const o = Object.assign({}, base, { declared: [] });

/* 서로 다른 과목에 **똑같은 문장**을 심어 둔다.
   한 솥에 넣고 재면 이 둘이 걸리고, 과목마다 재면 걸리지 않아야 한다. */
const SHARED = '자료를 모으는 단계에서 출처가 언제 조사된 것인지부터 확인하는 습관을 들였고 그 기준을 모둠 전체에 제안함.';

/* 서로 20자 넘게 겹치는 곳이 없어야 한다. 꼬리를 돌려 쓰면 그것부터 걸려
   이 검사가 보려는 것이 가려진다. */
const ONLY = [
  '실험 조건을 바꿔 가며 같은 측정을 세 번 되풀이했고 값이 흩어진 까닭을 온도에서 찾아냄.',
  '발표 준비 중 인용한 통계의 조사 연도가 오래되었다는 지적을 받고 최신 자료로 바꾸어 다시 씀.',
  '모둠에서 맡은 몫을 마친 뒤 다른 조원의 계산을 검토해 부호가 뒤집힌 자리를 짚어 줌.',
  '어려운 낱말이 나오면 앞뒤 문장으로 뜻을 어림한 다음 사전으로 확인하는 순서를 지킴.',
  '결론이 먼저 정해진 채 근거를 찾는 흐름을 경계하고, 반대되는 사례를 일부러 찾아 옴.',
  '수업에서 다룬 물음을 조건 하나만 바꿔 다시 물어 보고 답이 달라지는 지점을 표로 남김.',
  '자기 풀이가 틀린 까닭을 끝까지 찾으려 경우를 하나하나 늘어놓고 빠뜨린 자리를 스스로 짚음.',
  '읽은 책에서 저자가 근거를 대지 않은 대목을 표시해 두고 다른 자료로 사실을 맞춰 봄.',
];
const uniq = n => ONLY[n % ONLY.length];

const rows = [
  // ── 가 과목 — 1반 세 명이 토씨까지 같은 문장을 쓴다 ──────────
  { cls:'1', no:'1', subj:'가', text: SHARED },
  { cls:'1', no:'2', subj:'가', text: SHARED },
  { cls:'1', no:'3', subj:'가', text: SHARED },
  { cls:'2', no:'4', subj:'가', text: uniq(4) },
  { cls:'2', no:'5', subj:'가', text: uniq(5) },
  { cls:'2', no:'6', subj:'가', text: uniq(6) },

  // ── 나 과목 — 한 명이 '가' 과목과 똑같이 썼지만 과목이 다르다 ──
  { cls:'1', no:'1', subj:'나', text: SHARED },
  { cls:'1', no:'2', subj:'나', text: uniq(12) },
  { cls:'2', no:'3', subj:'나', text: uniq(13) },
  { cls:'2', no:'4', subj:'나', text: uniq(14) },

  // ── 다 과목 — 한 명뿐이다 ────────────────────────────────
  { cls:'3', no:'7', subj:'다', text: uniq(21) },
];
rows.forEach(r => { r.label = `${r.cls}반 ${r.no}번 · ${r.subj}`; });

const res = analyzeGrouped(rows, o);
const { per, subjects } = res;
const flagged = i => per[i].a.length > 0 || per[i].b.length > 0;

console.log(`기록 ${per.length}건 · 과목 ${subjects.length}개 · 공통 기준 ${JSON.stringify(res.commonRange)}`);
per.forEach((p, i) => console.log(
  `  ${rows[i].label.padEnd(14)} 생존 ${String((p.alive*100).toFixed(0)).padStart(3)}%` +
  `  그대로 ${p.a.length} · 문형 ${p.b.length} · 유사 ${p.peerCount} · 같은 반 ${p.sameCls}`));

const ok = [], fail = [];
const chk = (n, c) => (c ? ok : fail).push(n);

chk('기록 수가 그대로다', per.length === rows.length);
chk('줄마다 과목이 붙는다', per.every((p, i) => p.subj === rows[i].subj));

chk('같은 과목 안의 베낀 세 명은 걸린다', [0,1,2].every(flagged));
chk('그 세 명은 같은 반으로도 잡힌다', [0,1,2].every(i => per[i].sameCls === 2));

/* 이 도구의 전제 — 과목이 다르면 겹쳐도 겹친 것이 아니다 */
chk('과목이 다르면 똑같이 써도 걸리지 않는다', !flagged(6));
chk('과목이 다른 상대는 유사 인원에 들어오지 않는다', per[6].peerCount === 0);

/* 되돌린 번호가 어긋나면 여기서 걸린다 */
const sameSubj = per.every((p, i) =>
  [...p.peers.keys()].every(j => rows[j].subj === rows[i].subj));
chk('겹친 상대는 언제나 같은 과목이다', sameSubj);
const spanOk = per.every((p, i) => p.a.concat(p.b, p.common).every(sp =>
  [...sp.set].every(v => rows[v].subj === rows[i].subj)));
chk('구간을 나눠 쓴 학생도 모두 같은 과목이다', spanOk);
chk('자기 자신이 구간 집합에 들어 있다',
    per[0].a.every(sp => sp.set.has(0)));
chk('베낀 셋은 서로를 가리킨다',
    [...per[0].peers.keys()].sort().join(',') === '1,2');

chk('혼자인 과목은 생존 100%', per[10].alive === 1);
chk('혼자인 과목은 겹친 상대가 없다', per[10].peerCount === 0 && !flagged(10));

const bySubj = new Map(subjects.map(x => [x.subj, x]));
chk('과목 요약이 세 개다', subjects.length === 3);
chk('과목별 건수가 맞는다',
    bySubj.get('가').n === 6 && bySubj.get('나').n === 4 && bySubj.get('다').n === 1);
chk('과목별 확인 대상이 실제와 맞는다', bySubj.get('가').flagged === 3 && bySubj.get('나').flagged === 0);
chk('반별 요약을 합치면 과목 건수가 된다',
    subjects.every(x => [...x.cls.values()].reduce((a, e) => a + e.n, 0) === x.n));
chk('반별 생존 평균이 0~1 안에 있다',
    subjects.every(x => [...x.cls.values()].every(e => e.alive >= 0 && e.alive <= 1)));

/* 공통 활동 기준은 과목마다 그 과목 인원으로 잰다 — 학년 전체 인원이 아니다 */
chk('공통 기준을 학년 전체 인원으로 잡지 않는다',
    res.commonRange && res.commonRange[1] <= 3);

/* 반복 표현에는 어느 과목 것인지 붙어 있어야 골라 볼 수 있다 */
chk('반복 표현에 과목이 붙는다', res.phraseA.every(x => !!x.subj));
chk('베낀 문장이 반복 표현에 잡힌다',
    res.phraseA.some(x => x.subj === '가' && x.n + 1 === 3));

console.log(`\n통과 ${ok.length} / ${ok.length + fail.length}`);
fail.forEach(n => console.log('  ✗ ' + n));
process.exit(fail.length ? 1 : 0);
