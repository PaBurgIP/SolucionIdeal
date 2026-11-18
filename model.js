/* Author: Pablo Ib | Last modified by: Pablo Ib */
(function (root) {
  'use strict';
  const AUTHOR = 'Pablo Ib';
  const NAMES = ['Alternativa A', 'Alternativa B', 'Alternativa C'];
  const CRITERIA = ['Eficacia', 'Sostenibilidad', 'Viabilidad'];
  const COLORS = ['#3268c4', '#b76c2d', '#8b5bb5'];
  const clone = value => JSON.parse(JSON.stringify(value));
  function example() {
    return {
      values: [[88, 52, 46], [61, 91, 58], [56, 62, 94]],
      weights: [34, 33, 33], directions: ['max', 'max', 'max'], idealMode: 'fixed', p: 2
    };
  }
  function validate(state) {
    if (!state || !Array.isArray(state.values) || state.values.length !== 3 ||
        !state.values.every(row => Array.isArray(row) && row.length === 3 && row.every(x => Number.isFinite(x) && x >= 0 && x <= 100)) ||
        !Array.isArray(state.weights) || state.weights.length !== 3 || !state.weights.every(x => Number.isFinite(x) && x >= 0 && x <= 100) ||
        !Array.isArray(state.directions) || state.directions.length !== 3 || !state.directions.every(x => x === 'max' || x === 'min') ||
        !['fixed', 'observed'].includes(state.idealMode) || !Number.isFinite(state.p) || state.p < 1 || state.p > 6) {
      throw new Error('El escenario debe contener 3 alternativas, 3 criterios, valores y pesos de 0 a 100, y p entre 1 y 6.');
    }
    return state;
  }
  function calculate(state) {
    validate(state);
    const total = state.weights.reduce((sum, x) => sum + x, 0);
    const weights = state.weights.map(x => total ? x / total : 0);
    const ideal = state.directions.map((direction, j) => state.idealMode === 'fixed'
      ? (direction === 'max' ? 100 : 0)
      : (direction === 'max' ? Math.max(...state.values.map(row => row[j])) : Math.min(...state.values.map(row => row[j]))));
    const rows = state.values.map((values, i) => {
      const gaps = values.map((x, j) => Math.abs(x - ideal[j]) / 100);
      const contributions = gaps.map((gap, j) => weights[j] * gap ** state.p);
      return {
        index: i, name: NAMES[i], color: COLORS[i], values, gaps, contributions,
        distance: total ? Math.pow(contributions.reduce((sum, x) => sum + x, 0), 1 / state.p) : null,
        isIdeal: gaps.every(x => x < 1e-10)
      };
    });
    const ranking = total ? rows.slice().sort((a, b) => a.distance - b.distance || a.index - b.index) : [];
    ranking.forEach((row, i) => {
      row.rank = i > 0 && Math.abs(row.distance - ranking[i - 1].distance) < 1e-10 ? ranking[i - 1].rank : i + 1;
    });
    const winners = ranking.length ? ranking.filter(row => Math.abs(row.distance - ranking[0].distance) < 1e-10) : [];
    return {valid: total > 0, weights, ideal, rows, ranking, winners};
  }
  function interpolate(start, end, t, current = start) {
    validate(start); validate(end); validate(current);
    if (!Number.isFinite(t) || t < 0 || t > 1) throw new Error('El tiempo debe estar entre 0 y 1.');
    const mix = (a, b) => a + (b - a) * t;
    return {
      values: start.values.map((row, i) => row.map((x, j) => mix(x, end.values[i][j]))),
      weights: start.weights.map((x, j) => mix(x, end.weights[j])),
      p: mix(start.p, end.p), directions: current.directions.slice(), idealMode: current.idealMode
    };
  }
  function exported(state, endpoints) {
    validate(state);
    return {schemaVersion: 2, author: AUTHOR, lastModifiedBy: AUTHOR, state: clone(state), endpoints: clone(endpoints)};
  }
  function imported(data) {
    if (![1, 2].includes(data?.schemaVersion)) throw new Error('Formato de escenario no reconocido.');
    data = clone(data);
    if (data.schemaVersion === 1) {
      for (const scenario of [data.state, ...(Array.isArray(data.endpoints) ? data.endpoints : [])]) {
        if (Array.isArray(scenario?.values) && scenario.values.length === 5) scenario.values = scenario.values.slice(0, 3);
      }
    }
    validate(data.state);
    if (!Array.isArray(data.endpoints) || data.endpoints.length !== 2) throw new Error('Faltan los dos estados temporales.');
    data.endpoints.forEach(validate);
    return {state: clone(data.state), endpoints: clone(data.endpoints)};
  }
  const api = {AUTHOR, NAMES, CRITERIA, COLORS, example, clone, validate, calculate, interpolate, exported, imported};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IdealModel = api;
})(globalThis);
