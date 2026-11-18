/* Author: Pablo Ib | Last modified by: Pablo Ib */
(function () {
  'use strict';
  const M = window.IdealModel;
  const $ = id => document.getElementById(id);
  const fmt = (n, digits = 0) => n.toLocaleString('es-ES', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const safe = text => String(text).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const criterionColors = ['#3268c4', '#b76c2d', '#8b5bb5'];
  let state = M.example();
  let endpoints = [M.clone(state), {...M.clone(state), weights: [80, 10, 10]}];
  let selected = null;
  let playing = false;
  let animation = null;
  let toastTimer = null;
  let lastLiveMessage = '';
  const storageKey = 'distancia-ideal-v2';
  let loaded = false;
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('distancia-ideal-v1');
    if (saved) { const data = M.imported(JSON.parse(saved)); state = data.state; endpoints = data.endpoints; loaded = true; }
  } catch { /* Persistence is optional, including on file://. */ }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(M.exported(state, endpoints))); } catch { /* Local file privacy settings can disable storage. */ }
  }
  function toast(message) {
    $('toast').textContent = message; $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
  }
  function paintRange(input, value = Number(input.value)) {
    const fill = 100 * (value - Number(input.min)) / (Number(input.max) - Number(input.min));
    input.style.setProperty('--fill', `${Math.max(0, Math.min(100, fill))}%`);
  }
  function initControls() {
    $('weight-controls').innerHTML = M.CRITERIA.map((name, j) => `
      <div class="weight-control" style="--criterion-color:${criterionColors[j]}">
        <div class="label-line"><label class="weight-name" for="weight-${j}"><span class="criterion-dot" aria-hidden="true"></span>${name}</label><output class="weight-readout" id="weight-output-${j}" for="weight-${j}"></output></div>
        <input id="weight-${j}" type="range" min="0" max="100" step="0.1" value="${state.weights[j]}" style="--slider-color:${criterionColors[j]}" aria-describedby="weight-summary">
      </div>`).join('');
    $('matrix-body').innerHTML = M.NAMES.map((name, i) => `
      <tr><th scope="row"><span class="legend-dot" style="--alt-color:${M.COLORS[i]}" aria-hidden="true"></span>${name}</th>
      ${M.CRITERIA.map((criterion, j) => `<td><div class="value-cell"><input id="value-${i}-${j}" type="range" min="0" max="100" step="0.1" value="${state.values[i][j]}" style="--slider-color:${M.COLORS[i]}" aria-label="${name}, ${criterion}"><output class="value-number" id="value-output-${i}-${j}" for="value-${i}-${j}"></output></div></td>`).join('')}
      <td class="distance-cell" id="distance-${i}"></td></tr>`).join('');
    $('legend').innerHTML = M.NAMES.map((name, i) => `<button data-alternative="${i}" aria-pressed="false" aria-label="Resaltar ${name}"><span class="legend-dot" style="--alt-color:${M.COLORS[i]}" aria-hidden="true"></span>${String.fromCharCode(65 + i)}</button>`).join('');
    M.CRITERIA.forEach((_, j) => {
      $(`weight-${j}`).addEventListener('input', event => { manualEdit(); state.weights[j] = Number(event.target.value); render(); persist(); });
      M.NAMES.forEach((_, i) => $(`value-${i}-${j}`).addEventListener('input', event => { manualEdit(); state.values[i][j] = Number(event.target.value); render(); persist(); }));
    });
  }
  function manualEdit() {
    stop();
    $('timeline-status').textContent = 'Escenario editado. Guarda el inicio o el final para incorporarlo al recorrido temporal.';
    $('time-output').textContent = 'Edición libre';
  }
  function stop() {
    playing = false;
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    $('play').textContent = '▶'; $('play').setAttribute('aria-label', 'Reproducir transición'); $('play').setAttribute('aria-pressed', 'false');
  }
  const chart = new window.IdealChart.Chart($('scene'), {
    criteria: M.CRITERIA,
    onSelect(index) { selected = selected === index ? null : index; drawChart(M.calculate(state)); },
    onView(camera) { $('zoom-readout').textContent = `Zoom ${Math.round(camera.zoom * 100)} %`; }
  });
  function drawChart(result) {
    chart.update(state, result, selected);
    document.querySelectorAll('[data-alternative]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.alternative) === selected)));
    $('geometry-help').textContent = state.p === 2
      ? 'Espacio ponderado: con p = 2, cada segmento representa la distancia euclídea al ideal. Los ejes se ajustan a los pesos.'
      : 'Espacio ponderado: los valores numéricos usan la distancia de orden p. Con p distinto de 2, la longitud recta de los segmentos no equivale a esa distancia.';
  }
  $('camera-left').addEventListener('click', () => chart.orbit(-.25));
  $('camera-right').addEventListener('click', () => chart.orbit(.25));
  $('camera-in').addEventListener('click', () => chart.zoom(1.2));
  $('camera-out').addEventListener('click', () => chart.zoom(1/1.2));
  $('camera-reset').addEventListener('click', () => chart.reset());
  function render() {
    const result = M.calculate(state);
    $('validation').hidden = result.valid;
    M.CRITERIA.forEach((name, j) => {
      const weight = $(`weight-${j}`);
      weight.value = state.weights[j]; paintRange(weight, state.weights[j]);
      weight.setAttribute('aria-valuetext', `${fmt(state.weights[j], 1)} de 100; peso efectivo ${fmt(result.weights[j] * 100, 1)} por ciento`);
      $(`weight-output-${j}`).innerHTML = `<strong>${fmt(result.weights[j] * 100, 1)} %</strong><span title="Valor del deslizador">${fmt(state.weights[j], 1)}</span>`;
      M.NAMES.forEach((_, i) => {
        const input = $(`value-${i}-${j}`); input.value = state.values[i][j]; paintRange(input, state.values[i][j]);
        input.setAttribute('aria-valuetext', fmt(state.values[i][j], 1));
        $(`value-output-${i}-${j}`).textContent = fmt(state.values[i][j], state.values[i][j] % 1 ? 1 : 0);
      });
    });
    $('weight-strip').innerHTML = result.weights.map((w,j) => `<span style="width:${w*100}%;background:${criterionColors[j]}"></span>`).join('');
    $('weight-summary').textContent = result.valid ? 'Peso efectivo = valor del deslizador ÷ suma de los tres valores.' : 'Los tres pesos están a cero. Activa al menos uno.';
    $('ideal-mode').value = state.idealMode;
    document.querySelectorAll('.direction').forEach(select => { select.value = state.directions[Number(select.dataset.criterion)]; });
    $('ideal-help').textContent = state.idealMode === 'fixed' ? 'Una referencia aspiracional fija, independiente de los datos de las alternativas.' : 'Un vector formado por el mejor valor actual de cada criterio. Cambia al editar la matriz.';
    $('ideal-vector').innerHTML = result.ideal.map((value,j) => `<span title="${M.CRITERIA[j]}">C${j+1}<b>${fmt(value, value % 1 ? 1 : 0)}</b></span>`).join('');
    $('p-slider').value = state.p; paintRange($('p-slider'), state.p);
    $('p-output').textContent = `p = ${fmt(state.p, 1)}`;
    document.querySelectorAll('[data-p]').forEach(button => button.classList.toggle('active', Math.abs(Number(button.dataset.p) - state.p) < 1e-8));
    $('ranking').innerHTML = result.valid ? result.ranking.map(row => `<div class="rank-row ${row.rank === 1 ? 'best' : ''}" style="--alt-color:${row.color}"><div class="rank-info"><span class="rank-number">${row.rank}</span><span class="rank-name">${safe(row.name)}</span><span class="rank-value">${fmt(row.distance, 3)}</span></div><div class="rank-track"><div class="rank-fill" style="width:${row.distance*100}%"></div></div></div>`).join('') : '<p class="muted">Sin clasificación: activa al menos un criterio.</p>';
    result.rows.forEach(row => { $(`distance-${row.index}`).innerHTML = result.valid ? `${fmt(row.distance, 3)}<span class="position">${row.rank}º</span>` : '—'; });
    const matched = result.rows.filter(row => row.isIdeal);
    $('ideal-match').textContent = matched.length ? `${matched.length} alternativa${matched.length > 1 ? 's' : ''} coincide${matched.length > 1 ? 'n' : ''} con el ideal en los tres criterios.` : 'Ninguna alternativa coincide con el ideal en los tres criterios.';
    let insight = 'Activa al menos un peso para comparar las alternativas.';
    if (result.valid) {
      const winner = result.winners[0];
      const names = result.winners.map(row => row.name.replace('Alternativa ', '')).join(', ');
      if (result.winners.length > 1) insight = `Empate entre ${names}: distancia ${fmt(winner.distance, 3)}. Los empates comparten posición.`;
      else insight = `${winner.name} es la más cercana al ideal: distancia ${fmt(winner.distance, 3)}. ${winner.isIdeal ? 'Coincide con el ideal en los tres criterios.' : (winner.distance < 1e-10 ? 'La desviación restante está en criterios con peso cero.' : 'Todavía hay margen de mejora respecto a la referencia ideal.')}`;
    }
    // Avoid repeatedly announcing identical text during pointer movement.
    if (lastLiveMessage !== insight) { $('insight').textContent = insight; lastLiveMessage = insight; }
    drawChart(result);
    return result;
  }
  function endpointPreview() {
    $('timeline-preview').innerHTML = endpoints.map((endpoint, i) => {
      const result = M.calculate(endpoint);
      return `<div class="endpoint-card"><strong>${i ? 'FINAL' : 'INICIO'}</strong>Pesos: ${result.weights.map(w => fmt(w * 100, 1) + ' %').join(' / ')} · p=${fmt(endpoint.p, 1)}</div>`;
    }).join('');
  }
  function applyTime(value) {
    $('time-slider').value = value;
    paintRange($('time-slider'), value);
    $('time-output').textContent = `${fmt(value, 1)} %`;
    state = M.interpolate(endpoints[0], endpoints[1], value / 100, state);
    $('timeline-status').textContent = 'Interpolación lineal de los valores, pesos y p guardados. El sentido de los criterios y la referencia ideal se mantienen.';
    render();
  }
  initControls();
  $('p-slider').addEventListener('input', event => { manualEdit(); state.p = Number(event.target.value); render(); persist(); });
  document.querySelectorAll('[data-p]').forEach(button => button.addEventListener('click', () => { manualEdit(); state.p = Number(button.dataset.p); render(); persist(); }));
  $('ideal-mode').addEventListener('change', event => { stop(); state.idealMode = event.target.value; render(); persist(); });
  document.querySelectorAll('.direction').forEach(select => select.addEventListener('change', event => { stop(); state.directions[Number(select.dataset.criterion)] = event.target.value; render(); persist(); }));
  $('legend').addEventListener('click', event => {
    const button = event.target.closest('button[data-alternative]');
    if (!button) return;
    const index = Number(button.dataset.alternative); selected = selected === index ? null : index; drawChart(M.calculate(state));
  });
  $('reset').addEventListener('click', () => {
    stop(); state = M.example(); endpoints = [M.clone(state), {...M.clone(state), weights:[80,10,10]}]; selected = null;
    $('time-slider').value = 0; paintRange($('time-slider')); $('time-output').textContent = '0 %';
    $('timeline-status').textContent = 'Ejemplo temporal: de pesos equilibrados a priorizar la eficacia (80 / 10 / 10). Duración: 12 segundos.';
    render(); chart.reset(); endpointPreview(); persist(); toast('Ejemplo original restablecido.');
  });
  $('randomize').addEventListener('click', () => {
    manualEdit();
    state.values = Array.from({length:3}, () => Array.from({length:3}, () => 20 + Math.floor(Math.random() * 76)));
    // Ensure distinct observed optima: each criterion's best belongs to a different alternative.
    state.directions.forEach((direction,j) => { state.values[j][j] = direction === 'max' ? 98 : 2; });
    render(); persist(); toast('Nuevo ejemplo: ninguna alternativa alcanza el vector ideal completo.');
  });
  $('time-slider').addEventListener('input', event => { stop(); applyTime(Number(event.target.value)); persist(); });
  ['save-start', 'save-end'].forEach((id,i) => $(id).addEventListener('click', () => {
    stop(); endpoints[i] = M.clone(state); endpointPreview(); persist();
    $('timeline-status').textContent = `${i ? 'Final' : 'Inicio'} guardado con los valores, pesos y p actuales. Mueve el control temporal para recorrer la transición.`;
    toast(`Estado ${i ? 'final' : 'inicial'} guardado.`);
  }));
  $('play').addEventListener('click', () => {
    if (playing) { stop(); persist(); return; }
    let startValue = Number($('time-slider').value);
    if (startValue >= 100 || $('time-output').textContent === 'Edición libre') startValue = 0;
    applyTime(startValue);
    playing = true; $('play').textContent = 'Ⅱ'; $('play').setAttribute('aria-label','Pausar transición'); $('play').setAttribute('aria-pressed','true');
    let started = null;
    function frame(timestamp) {
      if (!playing) return;
      if (started === null) started = timestamp;
      const value = Math.min(100, startValue + (timestamp - started) / 120);
      applyTime(value);
      if (value < 100) animation = requestAnimationFrame(frame);
      else { stop(); persist(); }
    }
    animation = requestAnimationFrame(frame);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) { stop(); persist(); } });
  $('export').addEventListener('click', () => {
    const payload = JSON.stringify(M.exported(state, endpoints), null, 2);
    const url = URL.createObjectURL(new Blob([payload], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'escenario-distancia-ideal.json'; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Escenario exportado con autor y última modificación por Pablo Ib.');
  });
  $('import').addEventListener('click', () => { stop(); $('import-file').click(); });
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 100000) throw new Error('El archivo supera el tamaño máximo de 100 KB.');
      const data = M.imported(JSON.parse(await file.text()));
      stop(); state = data.state; endpoints = data.endpoints; selected = null;
      $('time-slider').value = 0; paintRange($('time-slider')); $('time-output').textContent = 'Edición libre';
      $('timeline-status').textContent = 'Escenario y estados temporales importados. Mueve el control temporal para explorar la transición.';
      render(); endpointPreview(); persist(); toast('Escenario importado.');
    } catch(error) { toast(`No se ha importado el escenario: ${error.message}`); }
    event.target.value = '';
  });
  window.addEventListener('pagehide', persist);
  render(); endpointPreview(); paintRange($('time-slider'));
  if (loaded) { $('time-output').textContent = 'Edición libre'; $('timeline-status').textContent = 'Experimento recuperado de este navegador, incluidos sus dos estados temporales.'; }
})();
