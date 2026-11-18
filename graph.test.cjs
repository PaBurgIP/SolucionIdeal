/* Author: Pablo Ib | Last modified by: Pablo Ib */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('./model.js');
const G=require('./graph.js');
test('3D coordinates reproduce the weighted distance for all supported metrics and senses',()=>{
  for(const p of [1,1.5,2,3,6]) for(const directions of [['max','max','max'],['min','max','min']]) for(const weights of [[34,33,33],[100,0,0],[0,25,75]]) {
    const state={...M.example(),p,directions,weights},result=M.calculate(state),space=G.geometry(state,result);
    space.points.forEach((point,i)=>{
      const distance=Math.pow(point.reduce((sum,x,j)=>sum+Math.abs(x-space.ideal[j])**p,0),1/p);
      assert.ok(Math.abs(distance-result.rows[i].distance)<1e-12);
    });
  }
});
test('Rotating, zooming and panning change the projection, never the decision data',()=>{
  const state=M.example(),before=JSON.stringify(state),result=M.calculate(state),space=G.geometry(state,result),camera=G.initialCamera();
  const initial=G.project(space.points[0],space.extents,camera);
  assert.notDeepEqual(initial,G.project(space.points[0],space.extents,{...camera,yaw:camera.yaw+.6}));
  const panned=G.project(space.points[0],space.extents,{...camera,panX:20,panY:-10});
  assert.equal(panned[0],initial[0]+20);assert.equal(panned[1],initial[1]-10);
  assert.notDeepEqual(initial,G.project(space.points[0],space.extents,{...camera,zoom:2}));
  assert.equal(JSON.stringify(state),before);
});
test('Projection stays finite when dimensions collapse because of zero weights',()=>{
  for(const weights of [[0,0,0],[100,0,0]]) {
    const state={...M.example(),weights},result=M.calculate(state),space=G.geometry(state,result);
    space.points.forEach(point=>assert.ok(G.project(point,space.extents,G.initialCamera()).every(Number.isFinite)));
  }
});
test('Old exported five-alternative scenarios migrate to A, B and C',()=>{
  const old=M.example();old.values.push([77,76,74],[69,84,81]);
  const original=JSON.stringify(old),restored=M.imported({schemaVersion:1,state:old,endpoints:[old,old]});
  assert.equal(restored.state.values.length,3);assert.equal(restored.endpoints[0].values.length,3);
  assert.deepEqual(restored.state.values,M.example().values);assert.equal(JSON.stringify(old),original);
  assert.throws(()=>M.imported({schemaVersion:2,state:old,endpoints:[old,old]}));
});
