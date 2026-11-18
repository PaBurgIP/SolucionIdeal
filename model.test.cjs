/* Author: Pablo Ib | Last modified by: Pablo Ib */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, a + ' != ' + b);
test('Independent oracle: normalize, multiply literal percentages, then Euclidean distance to both references', () => {
  const state = {...M.example(), values:[[20,80,40],[0,100,0],[100,0,100]], weights:[50,30,20], directions:['min','max','min']};
  const result = M.calculate(state);
  assert.deepEqual(result.ideal, [0,100,0]); assert.deepEqual(result.antiIdeal, [100,0,100]);
  assert.deepEqual(result.normalized[0], [.2,.8,.4]);
  [.1,.24,.08].forEach((x,j) => close(result.weighted[0][j], x));
  close(result.rows[0].distance, Math.sqrt(.02));
  close(result.rows[0].distanceAntiIdeal, Math.sqrt(.232));
  close(result.rows[1].distance, 0); close(result.rows[2].distanceAntiIdeal, 0);
});
test('Percentages are not silently renormalized when their sum differs from 100', () => {
  const result = M.calculate({...M.example(), weights:[20,20,20]});
  assert.equal(result.total, 60); assert.deepEqual(result.weights, [.2,.2,.2]);
  close(result.weighted[0][0], .176);
  close(result.rows[0].distance, Math.hypot(0,.078,.096));
});
test('Ideal and antiideal reverse with criterion direction; a single active criterion can change the ranking', () => {
  for (let j=0;j<3;j++) {
    const state = {...M.example(), weights:[0,0,0]}; state.weights[j]=100;
    assert.equal(M.calculate(state).ranking[0].index, j);
    state.directions[j]='min';
    const result = M.calculate(state), values=state.values.map(row=>row[j]);
    assert.equal(result.ideal[j],Math.min(...values)); assert.equal(result.antiIdeal[j],Math.max(...values));
    assert.equal(result.ranking[0].values[j],Math.min(...values));
  }
});
test('All zero weights disable distances and ranking while keeping both matrices defined', () => {
  const result=M.calculate({...M.example(),weights:[0,0,0]});
  assert.equal(result.valid,false); assert.deepEqual(result.ranking,[]);
  result.rows.forEach(row=>{assert.equal(row.distance,null);assert.equal(row.distanceAntiIdeal,null);});
  assert.ok(result.weighted.flat().every(x=>x===0)); assert.ok(result.normalized.flat().some(x=>x>0));
});
test('Ties use competition ranks and zero distance need not be a complete raw match', () => {
  const state=M.example(); state.weights=[100,0,0]; state.values[1]=[88,0,0];
  const result=M.calculate(state);
  assert.deepEqual(result.ranking.map(row=>row.rank),[1,1,3]);
  assert.equal(result.rows[1].isIdeal,false); close(result.rows[1].distance,0);
});
test('Constant columns and coincident references remain finite and tied', () => {
  const result=M.calculate({...M.example(),values:[[50,50,50],[50,50,50],[50,50,50]]});
  assert.deepEqual(result.ideal,result.antiIdeal);
  assert.deepEqual(result.ranking.map(row=>row.rank),[1,1,1]);
  result.rows.forEach(row=>{close(row.distance,0);close(row.distanceAntiIdeal,0);});
});
test('Boundary values and arbitrary allowed percentages obey Euclidean norm bound', () => {
  for(const weights of [[34,33,33],[100,100,100],[0,0,100],[0.1,3.7,95.2]]) {
    for(const directions of [['min','max','min'],['max','max','max']]) {
      const state={...M.example(),weights,directions,values:[[0,100,0],[100,0,100],[100,100,100]]},r=M.calculate(state);
      const bound=Math.hypot(...weights.map(x=>x/100));
      r.rows.forEach(row=>[row.distance,row.distanceAntiIdeal].forEach(d=>assert.ok(Number.isFinite(d)&&d>=0&&d<=bound+1e-12)));
    }
  }
});
test('State validation rejects malformed values, percentages, directions and names', () => {
  for(const bad of [{values:[[NaN]]},{weights:[-1,1,1]},{weights:[101,0,0]},{directions:['max','bad','min']},{criteria:['','b','c']},{criteria:['x'.repeat(81),'b','c']}]) assert.throws(()=>M.validate({...M.example(),...bad}));
  assert.doesNotThrow(()=>M.validate({...M.example(),criteria:['Frío & calor','<Factor>','DiFLUsion']}));
});
test('Authorship and names survive exact schema 3 persistence round trip without aliasing', () => {
  const state=M.example();state.criteria[0]='Temperatura máxima';
  const payload=M.exported(state);
  assert.equal(payload.author,'Pablo Ib');assert.equal(payload.lastModifiedBy,'Pablo Ib');
  assert.deepEqual(M.imported(JSON.parse(JSON.stringify(payload))),{state});
  payload.state.values[0][0]=0;assert.equal(state.values[0][0],88);
});
test('Legacy browser scenarios migrate percentages, defaults and three alternatives without temporal/metric controls', () => {
  const old={values:[...M.example().values,[1,2,3],[4,5,6]],weights:[20,30,50],directions:['min','max','max'],p:5,idealMode:'fixed'};
  const state=M.imported({schemaVersion:1,state:old}).state;
  assert.equal(state.values.length,3);assert.deepEqual(state.criteria,M.CRITERIA);assert.ok(!('p' in state));assert.ok(!('idealMode' in state));
  const version2={...old,values:old.values.slice(0,3),weights:[10,10,10]};
  M.imported({schemaVersion:2,state:version2}).state.weights.forEach(x=>close(x,100/3));
  assert.throws(()=>M.imported({schemaVersion:3,state:old}));
  assert.throws(()=>M.imported({schemaVersion:99,state:M.example()}));
});

