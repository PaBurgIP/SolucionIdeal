/* Author: Pablo Ib | Last modified by: Pablo Ib */
(function (root) {
  'use strict';
  const AUTHOR = 'Pablo Ib';
  const NAMES = ['Alternativa 1', 'Alternativa 2', 'Alternativa 3'];
  const CRITERIA = ['Criterio 1', 'Criterio 2', 'Criterio 3'];
  const COLORS = ['#3268c4', '#b76c2d', '#8b5bb5'];
  const clone = value => JSON.parse(JSON.stringify(value));
  function example() {
    return {
      values: [[88, 52, 46], [61, 91, 58], [56, 62, 94]],
      weights: [34, 33, 33], directions: ['max', 'max', 'max'], criteria: CRITERIA.slice(), alternatives: NAMES.slice()
    };
  }
  function validate(state) {
    const triplet = value => Array.isArray(value) && value.length === 3;
    const percentage = x => Number.isFinite(x) && x >= 0 && x <= 100;
    const names = value => triplet(value) && value.every(x => typeof x === 'string' && x.trim().length > 0 && x.length <= 80);
    if (!state || !triplet(state.values) || !state.values.every(row => triplet(row) && row.every(percentage)) ||
        !triplet(state.weights) || !state.weights.every(percentage) ||
        !triplet(state.directions) || !state.directions.every(x => x === 'max' || x === 'min') ||
        !names(state.criteria) || !names(state.alternatives)) {
      throw new Error('Se necesitan tres alternativas y tres factores con nombre, valores y porcentajes entre 0 y 100.');
    }
    return state;
  }
  function calculate(state) {
    validate(state);
    // Percentages are literal multipliers, never rescaled by their sum.
    const weights = state.weights.map(x => x / 100);
    const total = state.weights.reduce((sum, x) => sum + x, 0);
    const normalized = state.values.map(row => row.map(x => x / 100));
    const weighted = normalized.map(row => row.map((x, j) => x * weights[j]));
    const reference = best => state.directions.map((direction, j) => {
      const column = state.values.map(row => row[j]);
      return (direction === 'max') === best ? Math.max(...column) : Math.min(...column);
    });
    const ideal = reference(true), antiIdeal = reference(false);
    const weightedIdeal = ideal.map((x, j) => x / 100 * weights[j]);
    const weightedAntiIdeal = antiIdeal.map((x, j) => x / 100 * weights[j]);
    const distance = (point, target) => Math.hypot(...point.map((x, j) => x - target[j]));
    const rows = state.values.map((values, i) => ({
      index: i, name: state.alternatives[i], color: COLORS[i], values,
      normalized: normalized[i], weighted: weighted[i],
      distance: total ? distance(weighted[i], weightedIdeal) : null,
      distanceAntiIdeal: total ? distance(weighted[i], weightedAntiIdeal) : null,
      isIdeal: values.every((x, j) => Math.abs(x - ideal[j]) < 1e-10),
      isAntiIdeal: values.every((x, j) => Math.abs(x - antiIdeal[j]) < 1e-10)
    }));
    const ranking = total ? rows.slice().sort((a, b) => a.distance - b.distance || a.index - b.index) : [];
    ranking.forEach((row, i) => {
      row.rank = i > 0 && Math.abs(row.distance - ranking[i - 1].distance) < 1e-10 ? ranking[i - 1].rank : i + 1;
    });
    return {valid: total > 0, total, weights, normalized, weighted, ideal, antiIdeal, weightedIdeal, weightedAntiIdeal, rows, ranking};
  }
  function exported(state) {
    validate(state);
    return {schemaVersion: 3, author: AUTHOR, lastModifiedBy: AUTHOR, state: clone(state)};
  }
  function imported(data) {
    if (![1, 2, 3].includes(data?.schemaVersion)) throw new Error('Formato de escenario no reconocido.');
    const state = clone(data.state);
    if (data.schemaVersion < 3) {
      if (!state || typeof state !== 'object') throw new Error('Falta el escenario.');
      if (data.schemaVersion === 1 && Array.isArray(state.values)) state.values = state.values.slice(0, 3);
      state.criteria = CRITERIA.slice();
      // Preserve effective percentages from the previous slider-based version.
      if (Array.isArray(state.weights) && state.weights.length === 3 && state.weights.every(x => Number.isFinite(x) && x >= 0 && x <= 100)) {
        const sum = state.weights.reduce((a, b) => a + b, 0);
        if (sum) state.weights = state.weights.map(x => x / sum * 100);
      }
    }
    if (state && !Object.prototype.hasOwnProperty.call(state, 'alternatives')) state.alternatives = NAMES.slice();
    validate(state);
    return {state: {values: state.values, weights: state.weights, directions: state.directions, criteria: state.criteria, alternatives: state.alternatives}};
  }
  const api = {AUTHOR, NAMES, CRITERIA, COLORS, example, clone, validate, calculate, exported, imported};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IdealModel = api;
})(globalThis);

