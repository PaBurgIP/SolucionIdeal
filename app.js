/* Author: Pablo Ib | Last modified by: Pablo Ib */
(function () {
  'use strict';
  const M = window.IdealModel;
  const $ = id => document.getElementById(id);
  const fmt = (n, digits = 0) => n.toLocaleString('es-ES', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const safe = text => String(text).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  let state = M.example(), selected = null;
  const storageKey = 'distancia-ideal-v3';
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('distancia-ideal-v2') || localStorage.getItem('distancia-ideal-v1');
    if (saved) state = M.imported(JSON.parse(saved)).state;
  } catch { /* Persistence is optional, including on file://. */ }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(M.exported(state))); } catch { /* Storage can be disabled. */ }
  }
  function paintRange(input) { input.style.setProperty('--fill', input.value + '%'); }
  function syncValue(input, value) { if (document.activeElement !== input) input.value = value; }
  function bindNumber(input, getValue, setValue) {
    input.addEventListener('input', () => {
      const value = input.valueAsNumber;
      if (!Number.isFinite(value) || value < 0 || value > 100) return;
      setValue(value); render(); persist();
    });
    input.addEventListener('blur', () => { input.value = getValue(); render(); });
  }
  function initControls() {
    state.criteria.forEach((name, j) => {
      $('factor-' + j).innerHTML = '<label class="input-label" for="criterion-' + j + '">Criterio ' + (j + 1) + '</label>' +
        '<input class="criterion-name" id="criterion-' + j + '" type="text" maxlength="80" value="' + safe(name) + '" aria-label="Nombre del criterio ' + (j + 1) + '">' +
        '<label class="input-label weight-label" for="weight-' + j + '">Peso</label><div class="percent-input"><input id="weight-' + j + '" type="number" min="0" max="100" step="any" inputmode="decimal" value="' + state.weights[j] + '" aria-label="Peso de ' + safe(name) + ' en porcentaje"><span aria-hidden="true">%</span></div>' +
        '<select class="direction" id="direction-' + j + '" aria-label="Sentido de ' + safe(name) + '"><option value="max">↑ Más es mejor</option><option value="min">↓ Menos es mejor</option></select>';
      $('criterion-' + j).addEventListener('input', event => {
        state.criteria[j] = event.target.value.trim() || M.CRITERIA[j]; render(); persist();
      });
      $('criterion-' + j).addEventListener('blur', event => { event.target.value = state.criteria[j]; });
      bindNumber($('weight-' + j), () => state.weights[j], value => { state.weights[j] = value; });
      $('direction-' + j).addEventListener('change', event => { state.directions[j] = event.target.value; render(); persist(); });
    });
    $('matrix-body').innerHTML = state.alternatives.map((name, i) => '<tr><th scope="row"><label class="alternative-label"><span class="legend-dot" style="--alt-color:' + M.COLORS[i] + '" aria-hidden="true"></span><input class="criterion-name alternative-name" id="alternative-' + i + '" type="text" maxlength="80" value="' + safe(name) + '" aria-label="Nombre de la alternativa ' + (i + 1) + '"></label></th>' +
      state.criteria.map((criterion, j) => '<td><div class="value-cell"><input id="value-' + i + '-' + j + '" type="range" min="0" max="100" step="0.1" value="' + state.values[i][j] + '" style="--slider-color:' + M.COLORS[i] + '" aria-label="' + safe(name) + ', ' + safe(criterion) + '"><input class="value-number" id="number-' + i + '-' + j + '" type="number" min="0" max="100" step="any" inputmode="decimal" value="' + state.values[i][j] + '" aria-label="Valor de ' + safe(name) + ', ' + safe(criterion) + '"></div></td>').join('') + '</tr>').join('');
    state.alternatives.forEach((_, i) => {
      $('alternative-' + i).addEventListener('input', event => {
        state.alternatives[i] = event.target.value.trim() || M.NAMES[i]; render(); persist();
      });
      $('alternative-' + i).addEventListener('blur', event => { event.target.value = state.alternatives[i]; });
      state.criteria.forEach((_, j) => {
        $('value-' + i + '-' + j).addEventListener('input', event => { state.values[i][j] = Number(event.target.value); render(); persist(); });
        bindNumber($('number-' + i + '-' + j), () => state.values[i][j], value => { state.values[i][j] = value; });
      });
    });
    $('legend').innerHTML = state.alternatives.map((name, i) => '<button data-alternative="' + i + '" aria-pressed="false"><span class="legend-dot" style="--alt-color:' + M.COLORS[i] + '" aria-hidden="true"></span><span id="legend-name-' + i + '">' + safe(name) + '</span></button>').join('') +
      '<span class="legend-reference"><span class="ideal-symbol">◆</span> Ideal</span><span class="legend-reference"><span class="anti-symbol">◆</span> Antiideal</span>';
  }
  const chart = new window.IdealChart.Chart($('scene'), {
    onSelect(index) { selected = selected === index ? null : index; drawChart(M.calculate(state)); },
    onView(camera) { $('zoom-readout').textContent = 'Zoom ' + Math.round(camera.zoom * 100) + ' %'; }
  });
  function drawChart(result) {
    chart.update(state, result, selected, {ideal: $('show-ideal-distances').checked, antiIdeal: $('show-antiideal-distances').checked});
    document.querySelectorAll('[data-alternative]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.alternative) === selected)));
  }
  function matrixHTML(values, ideal, antiIdeal, caption) {
    const row = (name, cells, className = '') => '<tr class="' + className + '"><th scope="row">' + name + '</th>' + cells.map(x => '<td>' + fmt(x, 4) + '</td>').join('') + '</tr>';
    return '<table class="derived-table"><caption class="sr-only">' + caption + '</caption><thead><tr><th scope="col">Alternativa</th>' +
      state.criteria.map(name => '<th scope="col">' + safe(name) + '</th>').join('') + '</tr></thead><tbody>' +
      values.map((cells, i) => row('<span class="legend-dot" style="--alt-color:' + M.COLORS[i] + '" aria-hidden="true"></span>' + safe(state.alternatives[i]), cells)).join('') +
      row('◆ Ideal', ideal, 'ideal-row') + row('◇ Antiideal', antiIdeal, 'antiideal-row') + '</tbody></table>';
  }
  function render() {
    const result = M.calculate(state);
    state.alternatives.forEach((name, i) => {
      syncValue($('alternative-' + i), name);
      $('legend-name-' + i).textContent = name;
    });
    state.criteria.forEach((name, j) => {
      syncValue($('criterion-' + j), name); syncValue($('weight-' + j), state.weights[j]);
      $('weight-' + j).setAttribute('aria-label', 'Peso de ' + name + ' en porcentaje');
      $('direction-' + j).value = state.directions[j];
      $('direction-' + j).setAttribute('aria-label', 'Sentido de ' + name);
      state.alternatives.forEach((alternative, i) => {
        const slider = $('value-' + i + '-' + j); slider.value = state.values[i][j]; paintRange(slider);
        slider.setAttribute('aria-label', alternative + ', ' + name);
        slider.setAttribute('aria-valuetext', fmt(state.values[i][j], 1));
        syncValue($('number-' + i + '-' + j), state.values[i][j]);
        $('number-' + i + '-' + j).setAttribute('aria-label', 'Valor de ' + alternative + ', ' + name);
      });
    });
    $('weight-total').textContent = 'Suma de porcentajes: ' + fmt(result.total, 2) + ' %';
    $('weight-notice').hidden = Math.abs(result.total - 100) < 1e-8;
    $('weight-notice').textContent = 'Los porcentajes se aplican tal como los escribes, sin reajustarlos para sumar 100 %.';
    $('validation').hidden = result.valid;
    const scale = Math.hypot(...result.weights) || 1;
    $('ranking').innerHTML = result.valid ? '<div class="rank-head"><span>Alternativa</span><span>Al ideal</span><span>Al antiideal</span></div>' +
      result.ranking.map(row => '<div class="rank-row" style="--alt-color:' + row.color + '"><div class="rank-info"><span class="rank-name"><span class="rank-number">' + row.rank + '</span>' + safe(row.name) + '</span><span class="rank-value">' + fmt(row.distance, 3) + '</span><span class="rank-value anti-distance">' + fmt(row.distanceAntiIdeal, 3) + '</span></div><div class="rank-track" aria-hidden="true"><div class="rank-fill" style="width:' + row.distance / scale * 100 + '%"></div></div></div>').join('') : '';
    $('normalized-matrix').innerHTML = matrixHTML(result.normalized, result.ideal.map(x => x / 100), result.antiIdeal.map(x => x / 100), 'Matriz normalizada: valores divididos entre 100, con las referencias ideal y antiideal.');
    $('weighted-matrix').innerHTML = matrixHTML(result.weighted, result.weightedIdeal, result.weightedAntiIdeal, 'Matriz ponderada: valores normalizados multiplicados por peso entre 100, con las referencias ideal y antiideal.');
    drawChart(result);
  }
  initControls();
  ['show-ideal-distances', 'show-antiideal-distances'].forEach(id => {
    $(id).addEventListener('change', () => drawChart(M.calculate(state)));
  });
  $('camera-left').addEventListener('click', () => chart.orbit(-.25));
  $('camera-right').addEventListener('click', () => chart.orbit(.25));
  $('camera-in').addEventListener('click', () => chart.zoom(1.2));
  $('camera-out').addEventListener('click', () => chart.zoom(1/1.2));
  $('camera-reset').addEventListener('click', () => chart.reset());
  $('legend').addEventListener('click', event => {
    const button = event.target.closest('[data-alternative]'); if (!button) return;
    const index = Number(button.dataset.alternative); selected = selected === index ? null : index; drawChart(M.calculate(state));
  });
  $('reset').addEventListener('click', () => { state = M.example(); selected = null; render(); chart.reset(); persist(); });
  $('randomize').addEventListener('click', () => {
    state.values = Array.from({length: 3}, () => Array.from({length: 3}, () => 20 + Math.floor(Math.random() * 76)));
    state.directions.forEach((direction, j) => { state.values[j][j] = direction === 'max' ? 98 : 2; });
    render(); persist();
  });
  window.addEventListener('pagehide', persist);
  render();
})();

