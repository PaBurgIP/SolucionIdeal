/* Author: Pablo Ib | Last modified by: Pablo Ib */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('./model.js');
function harness(saved, blocked=false) {
  const elements=new Map(),storage=new Map(saved ? [['distancia-ideal-v2',JSON.stringify(saved)]] : []),buttons=[];
  const doc={activeElement:null,getElementById:id=>elements.get(id)||null,querySelectorAll:selector=>selector==='[data-alternative]'?buttons:[]};
  class Element {
    constructor(id,attributes='') {
      this.id=id;this.value=(attributes.match(/\bvalue="([^"]*)"/)||[])[1]||'';this.listeners={};this.hidden=false;this.attributes={};this.dataset={};
      this.type=(attributes.match(/\btype="([^"]*)"/)||[])[1]||'';this.checked=/\bchecked\b/.test(attributes);
      this.style={setProperty(){}};this.classList={add(){},remove(){}};this.textContent='';this._html='';
    }
    get valueAsNumber(){return this.value===''?NaN:Number(this.value);}
    set innerHTML(html){this._html=html;parse(html);if(this.id==='legend'){buttons.length=0;for(const match of html.matchAll(/data-alternative="(\d+)"/g)){const e=new Element();e.dataset.alternative=match[1];buttons.push(e);}}}
    get innerHTML(){return this._html;}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    setAttribute(name,value){this.attributes[name]=value;}
    querySelector(selector){return elements.get(selector.slice(1));}
    getBoundingClientRect(){return {width:680,height:440};}
  }
  function parse(html){for(const match of html.matchAll(/<[\w-]+\b([^>]*\bid="([^"]+)"[^>]*)>/g))elements.set(match[2],new Element(match[2],match[1]));}
  parse(fs.readFileSync(__dirname+'/index.html','utf8'));
  const window={addEventListener(){},localStorage:null};
  const localStorage={getItem:key=>{if(blocked)throw new Error('blocked');return storage.get(key)||null;},setItem:(key,value)=>{if(blocked)throw new Error('blocked');storage.set(key,value);}};
  const context=vm.createContext({window,document:doc,localStorage,console});
  for(const file of ['model.js','graph.js']) vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),context);
  window.IdealModel=context.IdealModel;window.IdealChart=context.IdealChart;
  vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),context);
  const fire=(id,type,value)=>{const e=elements.get(id);assert.ok(e,'Missing control '+id);if(value!==undefined){if(e.type==='checkbox')e.checked=Boolean(value);else e.value=String(value);}doc.activeElement=type==='blur'?null:e;for(const fn of e.listeners[type]||[])fn({target:e});};
  return {elements,storage,fire};
}
test('App event wiring updates both matrices, references, ranking, names and persisted percentages',()=>{
  const h=harness();const get=id=>h.elements.get(id);
  assert.equal(get('criterion-0').value,'Criterio 1');assert.equal(get('criterion-1').value,'Criterio 2');assert.equal(get('criterion-2').value,'Criterio 3');
  M.NAMES.forEach((name,i)=>assert.equal(get('alternative-'+i).value,name));
  assert.match(get('ranking').innerHTML,/Al antiideal/);assert.match(get('weighted-matrix').innerHTML,/0,2992/);
  h.fire('weight-0','input',20);assert.match(get('weighted-matrix').innerHTML,/0,1760/);assert.equal(get('weight-notice').hidden,false);
  h.fire('criterion-0','input','Frío <riesgo>');assert.match(get('normalized-matrix').innerHTML,/Frío &lt;riesgo&gt;/);assert.match(get('scene-content').innerHTML,/Frío &lt;riesgo&gt;/);
  h.fire('number-0-0','input',10);h.fire('direction-0','change','min');
  const snapshot=JSON.parse(h.storage.get('distancia-ideal-v3'));assert.equal(snapshot.state.weights[0],20);assert.equal(snapshot.state.criteria[0],'Frío <riesgo>');
  assert.equal(M.calculate(snapshot.state).ideal[0],10);
  h.fire('weight-0','input',0);h.fire('weight-1','input',0);h.fire('weight-2','input',0);
  assert.equal(get('validation').hidden,false);assert.equal(get('ranking').innerHTML,'');assert.match(get('weighted-matrix').innerHTML,/0,0000/);
  h.fire('reset','click');assert.equal(get('criterion-0').value,'Criterio 1');assert.equal(get('weight-0').value,34);assert.equal(get('validation').hidden,true);
});
test('App safely restores empty/invalid number edits and empty factor names',()=>{
  const h=harness();h.fire('weight-0','input','');h.fire('weight-0','blur');assert.equal(h.elements.get('weight-0').value,34);
  h.fire('number-0-0','input',101);h.fire('number-0-0','blur');assert.equal(h.elements.get('number-0-0').value,88);
  h.fire('criterion-0','input','');h.fire('criterion-0','blur');assert.equal(h.elements.get('criterion-0').value,'Criterio 1');
  h.fire('alternative-1','input','  ');h.fire('alternative-1','blur');assert.equal(h.elements.get('alternative-1').value,'Alternativa 2');
});

test('Editable alternative names propagate safely, persist on reload and survive randomization',()=>{
  const h=harness(),get=id=>h.elements.get(id),name='Plan <Norte> & "Sur"';
  h.fire('alternative-1','input',name);
  for(const id of ['ranking','normalized-matrix','weighted-matrix','scene-content']) {
    assert.ok(get(id).innerHTML.includes('Plan &lt;Norte&gt; &amp; &quot;Sur&quot;'));
    assert.ok(!get(id).innerHTML.includes('<Norte>'));
  }
  assert.equal(get('legend-name-1').textContent,name);
  assert.equal(get('value-1-0').attributes['aria-label'],name+', Criterio 1');
  const saved=JSON.parse(h.storage.get('distancia-ideal-v3'));
  assert.equal(saved.state.alternatives[1],name);
  assert.equal(harness(saved).elements.get('alternative-1').value,name);
  h.fire('randomize','click');assert.equal(get('legend-name-1').textContent,name);
  h.fire('reset','click');assert.equal(get('legend-name-1').textContent,'Alternativa 2');
});

test('Distance checkboxes toggle their own lines and keep visibility through data edits',()=>{
  const h=harness(),scene=()=>h.elements.get('scene-content').innerHTML;
  assert.ok(!scene().includes('distance-segment'));
  h.fire('show-ideal-distances','change',true);
  assert.equal((scene().match(/data-distance="ideal"/g)||[]).length,3);assert.ok(!scene().includes('data-distance="antiIdeal"'));
  h.fire('show-antiideal-distances','change',true);
  assert.equal((scene().match(/class="distance-segment"/g)||[]).length,6);
  h.fire('number-0-0','input',25);assert.equal((scene().match(/class="distance-segment"/g)||[]).length,6);
  h.fire('show-ideal-distances','change',false);
  assert.ok(!scene().includes('data-distance="ideal"'));assert.equal((scene().match(/data-distance="antiIdeal"/g)||[]).length,3);
  h.fire('show-antiideal-distances','change',false);assert.ok(!scene().includes('distance-segment'));
});
test('App starts with blocked local storage and migrates old browser scenarios',()=>{
  assert.doesNotThrow(()=>harness(null,true));
  const old={schemaVersion:2,state:{values:M.example().values,weights:[10,10,10],directions:['min','max','max'],p:5,idealMode:'fixed'}};
  const h=harness(old);assert.ok(Math.abs(h.elements.get('weight-0').value-100/3)<1e-10);assert.equal(h.elements.get('direction-0').value,'min');
  const previous=M.example();delete previous.alternatives;previous.criteria[0]='Coste propio';
  const restored=harness({schemaVersion:3,state:previous});
  assert.equal(restored.elements.get('criterion-0').value,'Coste propio');assert.equal(restored.elements.get('alternative-0').value,'Alternativa 1');
});
test('HTML has only the editor, chart with ranking below, and two separate matrices; authorship is exact',()=>{
  const html=fs.readFileSync(__dirname+'/index.html','utf8');
  for(const id of ['ideal-mode','p-slider','weight-controls','time-slider','save-start','save-end','import','export'])assert.ok(!html.includes('id="'+id+'"'));
  assert.ok(!/Menos distancia\s*=\s*mejor/i.test(html));assert.ok(html.indexOf('class="ranking-area"')>html.indexOf('id="scene"'));
  for(const key of ['author','last-modified-by'])assert.ok(html.includes('name="'+key+'" content="Pablo Ib"'));
  assert.ok(html.includes('id="normalized-matrix"'));assert.ok(html.includes('id="weighted-matrix"'));
});

