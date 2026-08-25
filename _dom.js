/* 아주 작은 가짜 DOM — 이 앱이 실제로 만지는 것만 흉내 낸다 */
function mkEl(sel){
  const el = {
    _sel: sel, value:'', textContent:'', _html:'', hidden:false, disabled:false,
    checked:false, className:'', style:{}, dataset:{}, children:[],
    classList:{ _s:new Set(), add(x){this._s.add(x);}, remove(x){this._s.delete(x);},
                toggle(x){this._s.has(x)?this._s.delete(x):this._s.add(x);},
                contains(x){return this._s.has(x);} },
    addEventListener(){}, removeEventListener(){}, setAttribute(){}, getAttribute(){return null;},
    querySelectorAll(){ return []; }, querySelector(){ return null; },
    appendChild(){}, remove(){}, focus(){}, scrollIntoView(){}, click(){},
    getContext(){ return null; },
    getBoundingClientRect(){ return {width:600,height:400,left:0,top:0}; },
    get innerHTML(){ return this._html; },
    set innerHTML(v){
      this._html = String(v);
      // <option value="3" selected> 을 본따 value 를 정한다
      const m = this._html.match(/<option value="(-?\d+)"[^>]*selected/);
      if (m) this.value = m[1];
      else {
        const f = this._html.match(/<option value="([^"]*)"/);
        if (f && this._sel && this._sel.indexOf('col') >= 0) this.value = f[1];
      }
    }
  };
  el.parentElement = { hidden:false };
  return el;
}
function makeDom(){
  const cache = new Map();
  const q = sel => { if (!cache.has(sel)) cache.set(sel, mkEl(sel)); return cache.get(sel); };
  const body = mkEl('body');
  const doc = {
    body, head: mkEl('head'),
    querySelector: q, querySelectorAll: () => [],
    createElement: t => mkEl(t),
    addEventListener(){}, documentElement: mkEl('html')
  };
  const win = {
    document: doc, self:1, top:1,
    matchMedia: () => ({ matches:false, addEventListener(){} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame(){},
    addEventListener(){}, getComputedStyle: () => ({ getPropertyValue: () => '#000000' }),
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL(){} },
    Blob: class { constructor(){} },
    navigator: { clipboard: { writeText: async () => {} } },
    devicePixelRatio: 1,
    alert(){}, confirm(){ return true; },
    setTimeout: (f,t) => setTimeout(f,t), clearTimeout: t => clearTimeout(t),
    DOMParser: class { parseFromString(){ return { querySelectorAll: () => [] }; } }
  };
  return { doc, win, q, cache };
}
module.exports = { makeDom };
