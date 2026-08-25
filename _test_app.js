/* 파일을 넣는 데서 화면을 그리는 데까지, 한 번에 지나가 보는 검사. (배포 불필요)

   다른 검사들은 계산부만 떼어 본다. 그런데 실제로 부러지는 자리는 대개 그 사이
   — 표를 합치고, 열을 알아보고, 결과를 화면에 얹는 대목 — 이다. 여기서는
   index.html 의 <script> 를 통째로 돌린다. 브라우저 대신 아주 작은 가짜 DOM(_dom.js)
   을 쓰고, 자료는 index.html 에 심어 둔 예시 학년을 그대로 쓴다.
   실제 학생 파일은 쓰지 않는다 — 어디서 돌려도 같은 결과가 나와야 하기 때문이다. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeDom } = require('./_dom.js');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1] +
  '\n;globalThis.__app = { state, rebuild, runAnalysis, visibleOrder, renderGrade,' +
  ' renderList, renderDoc, renderTable, renderPhrases, renderNet, showTab, SAMPLE, flattenNeisPaged };';

const { doc, win, q } = makeDom();
const box = Object.assign({}, win, { window:win, document:doc, console,
  setTimeout, clearTimeout, setInterval, clearInterval });
box.globalThis = box;
vm.createContext(box);

// 조절판 기본값을 화면과 같게 맞춘다
const def = id => {
  const m = html.match(new RegExp('id="' + id + '"[^>]*value="(\d+)"'));
  return m ? m[1] : '';
};
['minSpan','commonPct','charN','wordK','minOthers','properDf'].forEach(id => { q('#' + id).value = def(id); });
[['#commonList',''],['#limitSel','1500'],['#sortBy','alive'],
 ['#clsFilter',''],['#subjFilter',''],['#search','']].forEach(([s, v]) => { q(s).value = v; });
q('#showName').checked = false;
q('#onlyFlag').checked = false;

vm.runInContext(src, box, { filename:'index.html<script>' });
const app = box.__app;

const ok = [], fail = [];
const chk = (n, c) => (c ? ok : fail).push(n);
chk('<script> 가 끝까지 돈다', !!app && !!app.state);

app.state.src = [{ name:'예시 학년 (지어낸 자료)', grid: app.SAMPLE.map(r => r.slice()) }];
app.rebuild();
chk('합친 표가 만들어진다', !!app.state.grid && app.state.grid.length === app.SAMPLE.length);
chk('세특 열을 알아본다', +q('#colText').value >= 0);
chk('반/번호 열을 알아본다', +q('#colId').value >= 0);
chk('성명 열을 알아본다', +q('#colName').value >= 0);
chk('과목 열을 알아본다', app.state.subjCol >= 0);

app.runAnalysis();
const res = app.state.res;
console.log(`기록 ${res.per.length}건 · 과목 ${res.subjects.map(x => x.subj + '(' + x.n + ')').join(' ')}`);

chk('작업 화면으로 넘어간다', doc.body.dataset.phase === 'work');
chk('예시 학년이 두 과목으로 나뉜다', res.subjects.length === 2);
chk('이름표에 과목이 붙는다', res.rows.every(r => r.label.indexOf(' · ') > 0));
chk('과목 거르개가 채워진다', q('#subjFilter').innerHTML.indexOf('문학') > 0);
chk('반 거르개가 채워진다', q('#clsFilter').innerHTML.indexOf('3반') > 0);

/* 화면을 실제로 그려 본다 — 여기서 터지면 브라우저에서도 터진다 */
chk('학년 화면이 그려진다', q('#gradeSum').innerHTML.length > 100);
chk('과목표가 과목 수만큼 그려진다',
    (q('#subjBody').innerHTML.match(/<tr/g) || []).length === res.subjects.length);
chk('과목 × 반 표가 그려진다', q('#heatTab').innerHTML.indexOf('<thead>') === 0);
chk('명단이 그려진다', q('#listBody').innerHTML.indexOf('row-item') > 0);
chk('표 탭이 그려진다', (q('#tableBody').innerHTML.match(/<tr/g) || []).length === res.per.length);
chk('반복 표현에 과목표가 붙는다', q('#phraseA').innerHTML.indexOf('sjtag') > 0);

/* 거르개가 실제로 좁히는지 */
const all = app.visibleOrder().length;
q('#subjFilter').value = '문학';
const lit = app.visibleOrder();
chk('과목을 고르면 그 과목만 남는다',
    lit.length < all && lit.every(i => res.rows[i].subj === '문학'));
q('#clsFilter').value = '2';
const lit2 = app.visibleOrder();
chk('반까지 고르면 더 좁아진다',
    lit2.length < lit.length && lit2.every(i => res.rows[i].cls === '2'));
q('#subjFilter').value = ''; q('#clsFilter').value = '';

/* 심어 둔 그림이 그대로 나오는지 — 따라 하기 안내가 이 숫자를 가리킨다 */
const at = (c, no, sj) => res.rows.findIndex(r => r.cls === c && r.no === no && r.subj === sj);
const P = (c, no, sj) => res.per[at(c, no, sj)];
chk('대수 1반 5번은 토씨까지 같은 짝이 있다', P('1','5','대수').a.length > 0);
chk('문학 2반은 여섯 명이 같은 틀을 쓴다', P('2','1','문학').peerCount === 5);
chk('문학 2반 겹침은 모두 같은 반이다', P('2','1','문학').sameCls === 5);
chk('문학 1반 2번과 4번은 토씨까지 같다',
    P('1','2','문학').a.length > 0 && P('1','2','문학').peers.has(at('1','4','문학')));
chk('과목이 다르면 서로 겹치지 않는다',
    res.per.every((p, i) => [...p.peers.keys()].every(j => res.rows[j].subj === res.rows[i].subj)));

console.log(`\n통과 ${ok.length} / ${ok.length + fail.length}`);
fail.forEach(n => console.log('  ✗ ' + n));
process.exit(fail.length ? 1 : 0);
