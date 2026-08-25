/* 나이스 **인쇄 양식**을 푸는 부분을 확인한다. (배포 불필요)

   부장님이 받는 파일은 [세특 업로드 양식] 이 아니라 인쇄용 조회 화면이다.
   쪽마다 반 라벨과 머리글이 다시 나오고, 쪽이 넘어가면 한 학생의 세특이
   글자 한가운데서 잘려 다음 쪽으로 이어진다. 과목 이름도 칸 안에서 접히면
   조각으로 온다. 그 세 가지를 여기서 확인한다.

   실제 학생 파일은 쓰지 않는다 — 이 검사는 어디서 돌려도 같아야 한다. */
const { flattenNeisPaged, NEIS_HEAD } = require('./_lib.js').paged();

const B=1, C=2, D=3, E=4, F=5, H=7;
const row = o => { const r = new Array(16).fill(''); for (const k in o) r[k] = o[k]; return r; };
const label = cls => row({ [B]: `2학년 ${cls}반` });
const head  = () => row({ [B]:'과 목', [C]:'학 년', [D]:'학기', [E]:'번 호',
                          [F]:'성  명', [H]:'세부능력 및 특기사항 ' });
const foot  = n => row({ 9:String(n), 10:'/', 11:'9', 13:'○○고등학교' });
const rec   = (o) => row({ [B]:o.subj||'', [C]:o.g||'', [D]:o.s||'',
                           [E]:String(o.no), [F]:o.nm, [H]:o.t });

/* 쪽 1 — 문학 세 명, 3번 학생이 쪽 끝에서 잘린다 */
const grid = [
  row({ [B]:'학교생활기록부 세부능력 및 특기사항' }),
  label(3), head(),
  rec({ subj:'문학', g:'2', s:'1', no:1, nm:'김가', t:'첫째 학생의 기록이다. 끝까지 한 쪽에 들어갔다.' }),
  rec({ no:2, nm:'이나', t:'둘째 학생의 기록이다. 이것도 한 쪽에 들어갔다.' }),
  rec({ no:3, nm:'박다', t:'셋째 학생의 기록은 여기서 끊긴다. 낱말 한가운데인 논' }),
  foot(1),

  /* 쪽 2 — 3번의 뒷토막이 먼저 오고, 이어서 4번 */
  label(3), head(),
  rec({ subj:'문학', g:'2', s:'1', no:3, nm:'박다', t:'리적 사고를 이어 간다는 대목까지 적혀 있다.' }),
  rec({ no:4, nm:'최라', t:'넷째 학생의 기록이다.' }),
  foot(2),

  /* 쪽 3 — 과목 이름이 두 줄로 접혀 조각으로 온다 */
  label(3), head(),
  rec({ subj:'현대사회와 윤리', g:'2', s:'1', no:5, nm:'정마', t:'다섯째 학생의 기록이다.' }),
  rec({ no:6, nm:'조바', t:'여섯째 학생의 기록이다.' }),
  rec({ subj:'현대사회와', no:7, nm:'한사', t:'일곱째 학생의 기록은 여기서 끊긴다. 탐' }),
  foot(3),

  /* 쪽 4 — 7번의 뒷토막. 과목 칸에는 접힌 뒷줄만 있다 */
  label(3), head(),
  rec({ subj:'윤리', g:'2', s:'1', no:7, nm:'한사', t:'구를 이어 갔다는 내용이 남아 있다.' }),
  rec({ subj:'현대사회와 윤리', no:8, nm:'서아', t:'여덟째 학생의 기록이다.' }),
  foot(4),

  /* 쪽 5 — 진짜 새 과목. 이름이 앞 과목의 꼬리와 같지만 번호가 1번으로 되돌아간다 */
  label(3), head(),
  rec({ subj:'윤리', g:'2', s:'1', no:1, nm:'김가', t:'윤리 과목의 첫째 학생 기록이다.' }),
  foot(5),
];

const out = flattenNeisPaged(grid);
const ok = [], fail = [];
const chk = (n, c) => (c ? ok : fail).push(n);

chk('인쇄 양식으로 알아본다', !!out);
if (!out){ console.log('✗ 양식을 알아보지 못했습니다'); process.exit(1); }

const body = out.slice(1);
const get = (subj, no) => body.find(r => r[3] === subj && r[1] === String(no));

console.log('머리글:', out[0].join(' | '));
body.forEach(r => console.log(`  ${r[0]}반 ${String(r[1]).padStart(2)}번 ${r[2]} · ${r[3]} · ${r[6].length}자  "${r[6].slice(0,26)}…"`));

chk('머리글이 약속한 모양이다', out[0].join(',') === NEIS_HEAD.join(','));
chk('쪽 라벨·머리글·꼬리말은 걷어낸다', body.length === 9);
chk('반을 라벨에서 읽는다', body.every(r => r[0] === '3'));
chk('학년·학기를 이어 받는다', body.every(r => r[4] === '2' && r[5] === '1'));
chk('과목을 아래로 이어 받는다', get('문학', 2) && get('문학', 4));

/* 쪽이 넘어가며 잘린 기록은 **사이에 아무것도 넣지 않고** 그대로 붙어야 한다.
   공백 한 칸이라도 끼면 "논 리적" 이 되어 겹침을 재는 골격이 어긋난다. */
const r3 = get('문학', 3);
chk('잘린 기록이 한 줄로 합쳐진다', !!r3 && r3[6].indexOf('논리적 사고') >= 0);
chk('합칠 때 사이에 아무것도 넣지 않는다', !!r3 && r3[6].indexOf('논 리적') < 0);

const r7 = get('현대사회와 윤리', 7);
chk('접힌 과목 이름을 이어 붙인다', !!r7 && r7[6].indexOf('탐구를 이어') >= 0);
chk('조각 앞뒤 학생도 같은 과목이 된다',
    !!get('현대사회와 윤리', 5) && !!get('현대사회와 윤리', 8));

/* 번호가 1번으로 되돌아갔으면 조각이 아니라 새 과목이다 */
chk('번호가 되돌아가면 새 과목으로 본다', !!get('윤리', 1));
chk('새 과목이 앞 과목을 삼키지 않는다',
    body.filter(r => r[3] === '현대사회와 윤리').length === 4);

/* 평범한 표는 손대지 않는다 — 여기서 잘못 잡으면 반 열이 통째로 사라진다 */
const plain = [
  ['학년도','학기','학년','과목','번호','성명','세부능력 및 특기사항'],
  ['2026','1','2','문학','1','김가','평범한 표의 첫 줄이다. 충분히 길게 적어 둔다.'],
  ['2026','1','2','문학','2','이나','평범한 표의 둘째 줄이다. 충분히 길게 적어 둔다.'],
];
chk('평범한 표는 그대로 둔다 (null)', flattenNeisPaged(plain) === null);
chk('너무 짧은 표는 그대로 둔다', flattenNeisPaged([['가']]) === null);

console.log(`\n통과 ${ok.length} / ${ok.length + fail.length}`);
fail.forEach(n => console.log('  ✗ ' + n));
process.exit(fail.length ? 1 : 0);
