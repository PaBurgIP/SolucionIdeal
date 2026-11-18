/* Author: Pablo Ib | Last modified by: Pablo Ib */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('./model.js'),G=require('./graph.js');
test('3D coordinates match the weighted matrix and both Euclidean distances for all senses',()=>{
  for(const directions of [['max','max','max'],['min','max','min']]) for(const weights of [[34,33,33],[100,0,0],[0,25,75],[20,20,20]]) {
    const state={...M.example(),directions,weights},result=M.calculate(state),space=G.geometry(state,result);
    assert.deepEqual(space.points,result.weighted);assert.deepEqual(space.ideal,result.weightedIdeal);assert.deepEqual(space.antiIdeal,result.weightedAntiIdeal);
    space.points.forEach((point,i)=>{
      for(const [target,key] of [[space.ideal,'distance'],[space.antiIdeal,'distanceAntiIdeal']]) {
        const distance=Math.sqrt(point.reduce((sum,x,j)=>sum+(x-target[j])**2,0));
        assert.ok(Math.abs(distance-result.rows[i][key])<1e-12);
      }
    });
  }
});
test('Camera operations change projection, never the underlying state or distance',()=>{
  const state=M.example(),before=JSON.stringify(state),result=M.calculate(state),space=G.geometry(state,result),camera=G.initialCamera();
  const initial=G.project(space.points[0],space.extents,camera);
  assert.notDeepEqual(initial,G.project(space.points[0],space.extents,{...camera,yaw:camera.yaw+.6}));
  const panned=G.project(space.points[0],space.extents,{...camera,panX:20,panY:-10});
  assert.equal(panned[0],initial[0]+20);assert.equal(panned[1],initial[1]-10);
  assert.notDeepEqual(initial,G.project(space.points[0],space.extents,{...camera,zoom:2}));
  assert.equal(JSON.stringify(state),before);
});
test('Projection remains finite for collapsed dimensions',()=>{
  for(const weights of [[0,0,0],[100,0,0],[0.001,0,0]]) {
    const state={...M.example(),weights},space=G.geometry(state,M.calculate(state));
    [...space.points,space.ideal,space.antiIdeal].forEach(point=>assert.ok(G.project(point,space.extents,G.initialCamera()).every(Number.isFinite)));
  }
});
test('Rendered chart includes both references and names, escapes custom labels, and has no distance segments or readouts',()=>{
  const state={...M.example(),criteria:['<script> & frío','Humedales','DiFLUsion']},result=M.calculate(state),content={innerHTML:''};
  const svg={querySelector:()=>content,addEventListener:()=>{}},chart=new G.Chart(svg);
  chart.update(state,result);
  assert.match(content.innerHTML,/class="ideal-point"/);assert.match(content.innerHTML,/class="antiideal-point"/);
  for(const name of M.NAMES) assert.ok(content.innerHTML.includes(name));
  assert.ok(content.innerHTML.includes('&lt;script&gt; &amp; frío'));
  assert.ok(!content.innerHTML.includes('<script>'));
  assert.ok(!/distancia|stroke-dasharray|· 0[,\.]/i.test(content.innerHTML));
  chart.update({...state,weights:[0,0,0]},M.calculate({...state,weights:[0,0,0]}));
  assert.match(content.innerHTML,/Activa al menos un peso/);
});

