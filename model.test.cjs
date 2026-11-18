/* Author: Pablo Ib | Last modified by: Pablo Ib */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const close = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual-expected) <= tolerance, `${actual} != ${expected}`);
test('Three alternatives, three criteria and no complete match with either ideal', () => {
  for (const idealMode of ['fixed','observed']) {
    const state = {...M.example(), idealMode};
    const result = M.calculate(state);
    assert.equal(result.rows.length, 3);
    assert.ok(result.rows.every(row => row.values.length === 3 && !row.isIdeal && row.distance > 0));
    assert.deepEqual(result.ideal, idealMode === 'fixed' ? [100,100,100] : [88,91,94]);
    close(result.weights.reduce((a,b) => a+b), 1);
  }
});
test('Independent Euclidean oracle and initial winner B', () => {
  const result = M.calculate(M.example());
  close(result.rows[0].distance, Math.sqrt(.34*.12*.12 + .33*.48*.48 + .33*.54*.54));
  assert.equal(result.winners[0].index, 1);
});
test('Manhattan oracle; importance can reverse the preferred alternative', () => {
  const state = M.example(); state.p = 1;
  close(M.calculate(state).rows[0].distance, .34*.12+.33*.48+.33*.54);
  state.weights = [100,0,0]; assert.equal(M.calculate(state).winners[0].index, 0);
  state.weights = [0,100,0]; assert.equal(M.calculate(state).winners[0].index, 1);
  state.weights = [0,0,100]; assert.equal(M.calculate(state).winners[0].index, 2);
});
test('Zero weights disable ranking instead of displaying meaningless zero distances', () => {
  const result = M.calculate({...M.example(), weights:[0,0,0]});
  assert.equal(result.valid, false); assert.deepEqual(result.ranking, []);
  assert.ok(result.rows.every(row => row.distance === null));
});
test('Minimization uses lower ideal, with a fixed normalization range', () => {
  const state = {...M.example(), directions:['min','max','max'], weights:[100,0,0]};
  close(M.calculate(state).rows[0].distance, .88);
  state.idealMode = 'observed'; const result = M.calculate(state);
  assert.equal(result.ideal[0], 56); close(result.rows[0].distance, .32);
  assert.equal(result.winners[0].index, 2);
});
test('Ties share the correct competition rank', () => {
  const state = M.example(); state.values[1] = [...state.values[0]]; state.weights=[100,0,0];
  const result = M.calculate(state);
  assert.equal(result.winners.length, 2); assert.equal(result.ranking[0].rank, 1); assert.equal(result.ranking[1].rank, 1); assert.equal(result.ranking[2].rank, 3);
});
test('Zero distance with an inactive criterion is distinguished from a complete match', () => {
  const state = M.example(); state.values[0] = [100,20,30]; state.weights=[100,0,0];
  const result = M.calculate(state);
  close(result.rows[0].distance, 0); assert.equal(result.rows[0].isIdeal, false);
});
test('Interpolation recovers both endpoints and preserves current categorical controls', () => {
  const a = M.example(), b = M.example(); b.weights=[80,10,10]; b.p=4; b.values[0][0]=20;
  const current = {...a, directions:['min','max','max'], idealMode:'observed'};
  assert.deepEqual(M.interpolate(a,b,0).values, a.values); assert.deepEqual(M.interpolate(a,b,1).values, b.values);
  const half = M.interpolate(a,b,.5,current);
  close(half.values[0][0],54); close(half.p,3); assert.deepEqual(half.weights,[57,21.5,21.5]);
  assert.deepEqual(half.directions,current.directions); assert.equal(half.idealMode,'observed');
  assert.throws(() => M.interpolate(a,b,2));
});
test('Exported author metadata and exact import/export round trip', () => {
  const state = M.example(), endpoints=[M.example(),M.example()];
  const output=M.exported(state,endpoints);
  assert.equal(output.author,'Pablo Ib'); assert.equal(output.lastModifiedBy,'Pablo Ib');
  const restored=M.imported(JSON.parse(JSON.stringify(output)));
  assert.deepEqual(restored,{state,endpoints});
  restored.state.values[0][0]=0; assert.equal(state.values[0][0],88);
});
test('Malformed imports are rejected', () => {
  assert.throws(() => M.imported({schemaVersion:1,state:M.example(),endpoints:[]}));
  assert.throws(() => M.validate({...M.example(),values:[[NaN]]}));
  assert.throws(() => M.validate({...M.example(),weights:[-1,1,1]}));
  assert.throws(() => M.validate({...M.example(),p:0}));
});
test('Distance remains finite in [0,1] across boundary cases and p; larger p never reduces it', () => {
  for (const values of [Array.from({length:3},()=>[0,0,0]),Array.from({length:3},()=>[100,100,100]),M.example().values]) {
    for (const directions of [['max','max','max'],['min','max','min']]) {
      for (const idealMode of ['fixed','observed']) {
        let previous = Array(3).fill(-1);
        for (const p of [1,1.5,2,3,6]) {
          const result = M.calculate({...M.example(),values,directions,idealMode,p});
          result.rows.forEach((row,i) => { assert.ok(Number.isFinite(row.distance) && row.distance>=0 && row.distance<=1+1e-12); assert.ok(row.distance+1e-12 >= previous[i]); previous[i]=row.distance; });
        }
      }
    }
  }
});
