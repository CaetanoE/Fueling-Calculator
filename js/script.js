/* =============================================================
   script.js — Fueling App
   Lógica principal: cálculos de hidratación, UI y timeline
   ============================================================= */


/* ─────────────────────────────────────────────────────────────
   1. INICIALIZACIÓN Y EVENTOS BÁSICOS
   ───────────────────────────────────────────────────────────── */

// Actualiza el label de temperatura en tiempo real al mover el slider
document.getElementById('temp').addEventListener('input', function () {
  document.getElementById('tempVal').textContent = this.value + '°C';
});


/* ─────────────────────────────────────────────────────────────
   2. NAVEGACIÓN MÓVIL — sidebar deslizante
   ───────────────────────────────────────────────────────────── */

/**
 * Abre o cierra el sidebar en móvil.
 * El botón flotante (hamburger) lo llama desde el HTML.
 */

// Abre el sidebar automáticamente si estamos en móvil al cargar la página
if (window.innerWidth <= 640) {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const isOpen  = sidebar.classList.contains('open');

  if (isOpen) {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  }
}

/**
 * Cierra el sidebar al pulsar fuera (overlay oscuro).
 * Se llama desde onclick del overlay en el HTML.
 */
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}


/* ─────────────────────────────────────────────────────────────
   3. PANELES EXPANDIBLES (bibliografía / fórmulas)
   ───────────────────────────────────────────────────────────── */

/**
 * Alterna la visibilidad de un panel extra (refs o formulas).
 * Si el panel ya estaba abierto, lo cierra. Si estaba cerrado,
 * cierra cualquier otro abierto y abre el solicitado.
 * @param {string} name - 'refs' | 'formulas'
 */
function togglePanel(name) {
  const panel  = document.getElementById('panel-' + name);
  const btn    = document.getElementById('btn-' + name);
  const isOpen = panel.classList.contains('open');

  // Cierra todos primero
  document.querySelectorAll('.expand-panel').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.extra-btn').forEach(b => b.classList.remove('active'));

  // Si estaba cerrado, lo abre
  if (!isOpen) {
    panel.classList.add('open');
    btn.classList.add('active');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}


/* ─────────────────────────────────────────────────────────────
   4. UTILIDADES
   ───────────────────────────────────────────────────────────── */

/**
 * Formatea minutos en HH:MM
 * @param {number} min - minutos totales
 * @returns {string} p.ej. "01:30"
 */
function fmtTime(min) {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return h + ':' + m;
}


/* ─────────────────────────────────────────────────────────────
   5. FUNCIÓN PRINCIPAL: CALCULAR PLAN
   ───────────────────────────────────────────────────────────── */

function calcular() {

  /* 5.1 — Lectura de inputs
     ─────────────────────── */
  const peso       = parseFloat(document.getElementById('peso').value)     || 70;
  const edad       = parseFloat(document.getElementById('edad').value)     || 30;
  const sexo       = document.getElementById('sexo').value;
  const nivel      = document.getElementById('nivel').value;
  const deporte    = document.getElementById('deporte').value;
  const duracion   = parseFloat(document.getElementById('duracion').value) || 90;
  const intensidad = document.getElementById('intensidad').value;
  const temp       = parseFloat(document.getElementById('temp').value);
  const humedad    = document.getElementById('humedad').value;
  const altitud    = document.getElementById('altitud').value;
  const hidratPrev = document.getElementById('hidratPrev').value;
  const tolGI      = document.getElementById('tolGI').value;
  const objetivo   = document.getElementById('objetivo').value;

  const durH = duracion / 60; // duración en horas

  /* 5.2 — Tasa de sudoración estimada
     Referencia: NATA Position Statement (Update 2025)
     Cálculo basado en ml/kg/h según intensidad, con ajustes
     por sexo, temperatura, humedad y altitud.
     ─────────────────────────────────────────────────────────── */
  let tasaMlKg = 7; // Base moderada
  if (intensidad === 'low') tasaMlKg = 5;
  if (intensidad === 'high') tasaMlKg = 9;
  if (intensidad === 'vhigh') tasaMlKg = 11;

  let sudorBase = peso * tasaMlKg;

  // Las mujeres sudan ~10-15% menos en promedio a igual intensidad
  if (sexo === 'f') sudorBase *= 0.9;

  // Corrección térmica: +/- ml por cada grado de desviación de los 20°C
  if (temp > 20) sudorBase += (temp - 20) * 15;
  if (temp < 15) sudorBase -= (15 - temp) * 10;

  // Humedad alta dificulta la evaporación → mayor acumulación de calor
  if (humedad === 'humedo') sudorBase *= 1.1;

  // Altitud → mayor tasa respiratoria → más pérdida de fluido
  if (altitud === 'medium') sudorBase *= 1.05;
  if (altitud === 'high')   sudorBase *= 1.10;

  sudorBase = Math.round(sudorBase);

  /* 5.3 — Fluidos recomendados por hora
     Referencia: ACSM y NATA
     Mantener la variación del peso corporal entre +1% y -1%.
     ─────────────────────────────────────────────────────────── */
  let aguaRec = sudorBase;

  // Ajustes de seguridad fisiológica
  if (aguaRec > 1000) aguaRec = 1000; // Tope máximo de vaciado gástrico
  if (aguaRec < 200) aguaRec = 200;   // Mínimo vital en ejercicio

  // Ajustes por estado previo
  if (hidratPrev === 'poor') aguaRec = Math.min(aguaRec * 1.15, 1000);

  aguaRec = Math.round(aguaRec / 10) * 10; // Redondeo a decenas

  /* 5.4 — Carbohidratos recomendados por hora
     Referencia: Jeukendrup (2014), Viribay et al. (2020/2024)
     - <60 min: 0g (Foco en post-entrenamiento)
     - 60-90 min: 30g (Solo si hay intensidad)
     - 90-150 min: 30-45g
     - >150 min: 60-80g (Protección contra daño muscular EIMD)
     ─────────────────────────────────────────────────────────── */
  let carbsRec = 0;

  if (duracion < 60) {
    carbsRec = 0; 
  } else if (duracion >= 60 && duracion < 90) {
    carbsRec = (intensidad === 'low') ? 0 : 30;
  } else if (duracion >= 90 && duracion <= 150) {
    carbsRec = (intensidad === 'low') ? 30 : 45;
  } else {
    // Ultra resistencia (>2.5h)
    carbsRec = 60;
    if (nivel === 'elite' || tolGI === 'high') carbsRec = 80;
  }

  // Tope estricto por sensibilidad gastrointestinal
  if (tolGI === 'low' && carbsRec > 40) carbsRec = 40;

  // Ajuste por deporte intermitente (Gimnasio)
  if (deporte === 'gym') carbsRec = Math.min(carbsRec, 30);

  carbsRec = Math.round(carbsRec);

  /* 5.5 — Sodio recomendado por hora
     Referencia: ACSM / Sawka et al.
     Ligado proporcionalmente al volumen de agua ingerido para
     evitar hiponatremia (concentración isotónica ideal).
     ─────────────────────────────────────────────────────────── */
  let concentracionNa = 700; // mg de Sodio por Litro de agua (isotónico base)
  
  // Calor o humedad extrema = sudor más concentrado en minerales
  if (temp >= 28 || humedad === 'humedo') concentracionNa = 900; 
  
  // Cálculo final de sodio basado en lo que realmente va a beber
  let sodioRec = (aguaRec / 1000) * concentracionNa;
  sodioRec = Math.round(sodioRec / 10) * 10; // Redondeo a decenas

  /* 5.6 — Concentraciones por botella de 500ml
     (Para la receta práctica)
     ─────────────────────────────────────────────────────────── */
  const carbsPerml  = aguaRec > 0 ? carbsRec / aguaRec : 0;
  const carbsPor500 = Math.round(carbsPerml * 500 * 10) / 10;       // g CHO por 500ml

  const sodioPerml  = aguaRec > 0 ? sodioRec / aguaRec : 0;
  const sodioPor500 = Math.round(sodioPerml * 500);                  // mg Na por 500ml
  const salPor500g  = Math.round((sodioPor500 / 393) * 10) / 10;    // g NaCl (1g NaCl = 393mg Na)

  // Osmolalidad estimada (mOsm/kg): CHO contribuyen ~5.55 mOsm/g, Na+Cl ~2 mOsm/mmol
  const osmReal  = Math.round(carbsPor500 / 500 * 1000 * 5.55 * 2 + sodioPor500 / 500 * 1000 * 2);
  const concPct  = Math.round(carbsPor500 / 500 * 100 * 10) / 10;   // % concentración CHO

  // Totales de la sesión
  const totalPerdida = Math.round(sudorBase * durH / 100) / 10;     // litros totales perdidos
  const kcalTotal    = Math.round(carbsRec * durH * 4);              // kcal totales de CHO


  /* ───────────────────────────────────────────────────────────
     6. ACTUALIZACIÓN DEL DOM
     ─────────────────────────────────────────────────────────── */

  // Muestra el panel de resultados y oculta el placeholder
  document.getElementById('placeholder').style.display = 'none';
  document.getElementById('results').style.display     = 'block';

  // En móvil: cierra el sidebar automáticamente tras calcular
  closeSidebar();

  /* 6.1 — Cabecera de resultados (KPI header) */
  const deporteNames = { running: 'Running / Trail', cycling: 'Ciclismo', triathlon: 'Triatlón', gym: 'Gimnasio' };
  const intNames     = { low: 'baja (Z1-Z2)', mod: 'moderada (Z3)', high: 'alta (Z4)', vhigh: 'máxima (Z5)' };
  const textoHumedad = humedad === 'seco' ? 'Seco' : (humedad === 'humedo' ? 'Húmedo' : 'Normal');

  document.getElementById('res-sport-label').textContent  = deporteNames[deporte] + ' · Intensidad ' + intNames[intensidad];
  document.getElementById('res-summary-line').textContent = peso + 'kg · ' + temp + '°C · ' + textoHumedad + ' · ' +
    (tolGI === 'low' ? 'GI sensible' : tolGI === 'med' ? 'GI normal' : 'GI resistente');
  document.getElementById('res-duration').textContent = fmtTime(duracion);

  /* 6.2 — Tarjetas KPI */
  document.getElementById('m-agua').textContent     = aguaRec;
  document.getElementById('m-agua-sub').textContent = Math.round(aguaRec * durH / 100) / 10 + ' L total';

  document.getElementById('m-carbs').textContent     = carbsRec;
  document.getElementById('m-carbs-sub').textContent = Math.round(carbsRec * durH) + ' g total';

  document.getElementById('m-sodio').textContent     = sodioRec;
  document.getElementById('m-sodio-sub').textContent = Math.round(sodioRec / 393 * durH * 10) / 10 + ' g sal total';

  document.getElementById('m-sweat').textContent = totalPerdida;

  // Cambia el color de la tarjeta de sudor si la pérdida es muy alta
  const sweatCard = document.getElementById('kpi-sweat-card');
  if (totalPerdida > 2.5) sweatCard.classList.add('danger');
  else                    sweatCard.classList.remove('danger');

  /* 6.3 — Alerta de deshidratación */
  const sweatAlert = document.getElementById('sweat-alert');
  if (totalPerdida > 2) {
    sweatAlert.style.display = 'block';
    document.getElementById('sweat-alert-text').textContent =
      'Pérdida estimada de ' + totalPerdida + 'L — riesgo elevado de deshidratación. Prioriza la hidratación antes del ejercicio.';
  } else {
    sweatAlert.style.display = 'none';
  }

  /* 6.4 — Receta por 500ml */
  let rows = '';
  rows += `<div class="recipe-item">
    <span class="recipe-ing"><i class="fa-solid fa-droplet" style="color:var(--cyan);margin-right:8px;font-size:12px"></i>Agua</span>
    <span class="recipe-qty">500 <span>ml</span></span>
  </div>`;

  if (carbsPor500 > 0) {
    rows += `<div class="recipe-item">
      <span class="recipe-ing"><i class="fa-solid fa-cubes-stacked" style="color:#60a5fa;margin-right:8px;font-size:12px"></i>Azúcar de mesa</span>
      <span class="recipe-qty">${carbsPor500} <span>g</span></span>
    </div>`;
  }

  rows += `<div class="recipe-item">
    <span class="recipe-ing"><i class="fa-solid fa-circle-dot" style="color:var(--warn);margin-right:8px;font-size:12px"></i>Sal (NaCl)</span>
    <span class="recipe-qty">${salPor500g} <span>g</span></span>
  </div>`;

  rows += `<div class="recipe-item" style="border-top:1px solid var(--border2);margin-top:4px">
    <span class="recipe-ing" style="color:var(--text3)">Calorías / 500ml</span>
    <span class="recipe-qty" style="color:var(--text2)">${Math.round(carbsPor500 * 4)} <span>kcal</span></span>
  </div>`;

  document.getElementById('recipe-rows').innerHTML = rows;

  /* 6.5 — Píldora de osmolalidad */
  let osmoPill = '';
  if      (osmReal < 270) osmoPill = `<span class="osmo-pill osmo-hypo">Hipotónica · ${osmReal} mOsm/kg</span>`;
  else if (osmReal <= 330) osmoPill = `<span class="osmo-pill osmo-iso">Isotónica · ${osmReal} mOsm/kg</span>`;
  else                     osmoPill = `<span class="osmo-pill osmo-hyper">Hipertónica · ${osmReal} mOsm/kg</span>`;
  document.getElementById('osmo-pill-wrap').innerHTML = osmoPill;

  // Nota explicativa según osmolalidad
  let isoNote = '';
  if      (osmReal < 270) isoNote = 'Absorción de agua muy rápida. Ideal para calor extremo.';
  else if (osmReal <= 330) isoNote = 'Equilibrio óptimo absorción agua/energía. Vaciado gástrico rápido.';
  else                     isoNote = 'Mayor densidad energética. Puede ralentizar absorción hídrica.';

  document.getElementById('recipe-note').innerHTML =
    `<strong>Azúcar de mesa = sacarosa</strong> (50% glucosa + 50% fructosa). Activa transportadores SGLT1 y GLUT5 de forma independiente, maximizando la absorción.<br><br>
     <span style="color:var(--text2)">${isoNote}</span>`;

  /* 6.6 — Alerta GI */
  const giAlert = document.getElementById('gi-alert');
  if (tolGI === 'low') {
    giAlert.style.display = 'block';
    giAlert.innerHTML = '<i class="fa-solid fa-stomach" style="margin-right:6px"></i> GI sensible: comienza con dosis bajas e incrementa gradualmente. Evita concentraciones >6% CHO.';
  } else {
    giAlert.style.display = 'none';
  }

  /* 6.7 — Alerta 0g Carbohidratos */
  const zeroCarbsAlert = document.getElementById('zero-carbs-alert');
  if (carbsRec === 0) {
    zeroCarbsAlert.style.display = 'block';
    zeroCarbsAlert.innerHTML = '<i class="fa-solid fa-utensils" style="margin-right:6px"></i> Para esta sesión no necesitas azúcar durante la prueba; tu objetivo principal debe ser la comida de recuperación post-entrenamiento.';
  } else {
    zeroCarbsAlert.style.display = 'none';
  }

  /* ───────────────────────────────────────────────────────────
     7. TIMELINE VISUAL HORIZONTAL
     Genera un nodo por cada toma de bebida a lo largo del tiempo.
     El intervalo se ajusta según la duración total del esfuerzo.
     ─────────────────────────────────────────────────────────── */

  // Intervalo entre tomas según duración total
  const tInterval = duracion <= 60 ? 15 : duracion <= 120 ? 20 : 25;

  // Construye el array de tiempos de toma
  const steps = [];
  for (let t = 0; t <= duracion; t += tInterval) {
    if (t > duracion) break;
    steps.push(t);
  }
  // Asegura que el último punto sea el final exacto
  if (steps[steps.length - 1] !== duracion) steps.push(duracion);

  // Limpia el contenedor y añade los nodos
  const trackEl = document.getElementById('tl-track');
  trackEl.innerHTML = '';

  steps.forEach((t, i) => {
    const isFirst  = i === 0;
    const isLast   = t === duracion;
    const hasCarbs = carbsRec > 0 && !isFirst && !isLast;

    // ml recomendados en este intervalo (un poco más al inicio para pre-carga)
    const mlEste   = isFirst ? Math.round(aguaRec * tInterval / 60 * 1.2) : Math.round(aguaRec * tInterval / 60);
    const carbEste = hasCarbs ? Math.round(carbsRec * tInterval / 60) : 0;
    const kcalEste = Math.round(carbEste * 4);

    // Tipo visual del nodo según posición y contenido
    let type = 'type-water';
    let icon = 'fa-droplet';
    let desc = carbsRec > 0 ? 'Toma de bebida' : 'Agua + sal';

    if (isFirst) { type = 'type-start'; icon = 'fa-flag';             desc = 'Inicio'; }
    if (isLast)  { type = 'type-end';   icon = 'fa-flag-checkered';   desc = 'Fin'; }

    const item = document.createElement('div');
    item.className = 'tl-item';
    item.innerHTML = `
      <div class="tl-icon-wrap">
        <div class="tl-circle ${type}"><i class="fa-solid ${icon}"></i></div>
        <div class="tl-num">${i + 1}</div>
      </div>
      <div class="tl-info">
        <div class="tl-time">${fmtTime(t)}</div>
        <div class="tl-desc">${desc}</div>
        <div class="tl-ml">${mlEste}ml</div>
        ${kcalEste > 0 ? `<div class="tl-kcal">${kcalEste}kcal</div>` : ''}
      </div>
    `;
    trackEl.appendChild(item);
  });

  // Totales de la sesión bajo el timeline
  document.getElementById('tl-totals').innerHTML =
    `Tomar cada ${tInterval} min · Total: <span style="color:var(--cyan)">${Math.round(aguaRec * durH / 100) / 10} L</span> fluidos · ` +
    `<span style="color:var(--cyan)">${Math.round(carbsRec * durH)} g</span> CHO · ` +
    `<span style="color:var(--cyan)">${kcalTotal} kcal</span>`;

  // Reposiciona la línea conectora alineándola con el centro de los círculos,
  // tras el repintado del navegador (requestAnimationFrame)
  requestAnimationFrame(() => {
    const track = document.getElementById('tl-track');
    const items = track.querySelectorAll('.tl-item');
    const line  = document.getElementById('tl-line');
    if (items.length >= 2) {
      const first    = items[0].querySelector('.tl-circle').getBoundingClientRect();
      const last     = items[items.length - 1].querySelector('.tl-circle').getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      line.style.left  = (first.left + first.width / 2 - trackRect.left) + 'px';
      line.style.right = (trackRect.right - (last.left + last.width / 2)) + 'px';
      line.style.top   = (first.top + first.height / 2 - trackRect.top) + 'px';
    }
  });


  /* ───────────────────────────────────────────────────────────
     8. BIBLIOGRAFÍA CIENTÍFICA
     ─────────────────────────────────────────────────────────── */
  const refs = [
    {
      id: '[1]',
      autor: 'Jeukendrup, A.E. (2014)',
      titulo: 'A step towards personalized sports nutrition',
      hallazgo: 'Las soluciones de carbohidratos de múltiples transportadores (sacarosa = glucosa+fructosa) permiten altas tasas de absorción. En esfuerzos de ~1h, pequeños sorbos o enjuagues bucales mejoran el rendimiento en alta intensidad.',
      journal: 'Sports Medicine'
    },
    {
      id: '[2]',
      autor: 'Viribay et al. (2020/2024)',
      titulo: 'Effects of 120 g/h of Carbohydrates Intake during a Mountain Marathon',
      hallazgo: 'La ingesta de 120 g/h en atletas de ultra-resistencia no solo mejora el rendimiento, sino que limita significativamente el daño muscular inducido por el ejercicio (EIMD) comparado con 60 o 90 g/h.',
      journal: 'Nutrients / PMC'
    },
    {
      id: '[3]',
      autor: 'NATA Position Statement (Update 2025)',
      titulo: 'Fluid Replacement for the Physically Active',
      hallazgo: 'Mantener el peso corporal con una variación mínima (+1% a -1%) previene el aumento de la temperatura central. El reemplazo de fluidos debe ser totalmente individualizado según la tasa de sudoración.',
      journal: 'Journal of Athletic Training'
    },
    {
      id: '[4]',
      autor: 'ISSN (Review Update)',
      titulo: 'Exercise & Sport Nutrition Review',
      hallazgo: 'La personalización de la nutrición debe considerar la tolerancia gastrointestinal. Entrenar el intestino (Gut Training) es imperativo para tolerar cargas altas de carbohidratos en intensidad sin molestias.',
      journal: 'JISSN'
    },
    {
      id: '[5]',
      autor: 'ACSM / Sawka et al.',
      titulo: 'Exercise and Fluid Replacement',
      hallazgo: 'La concentración de sodio en el sudor es altamente variable. Las bebidas isotónicas con sales previenen eficazmente la hiponatremia en esfuerzos prolongados.',
      journal: 'Med Sci Sports Exerc'
    }
  ];

  document.getElementById('refs-content').innerHTML = refs.map(r =>
    `<div class="ref-item">
      <div><span class="ref-badge">${r.id}</span><span class="ref-author">${r.autor}</span> — <span class="ref-journal">${r.titulo} (${r.journal})</span></div>
      <div class="ref-finding">${r.hallazgo}</div>
    </div>`
  ).join('');

  /* ───────────────────────────────────────────────────────────
     9. FÓRMULAS APLICADAS (panel expandible)
     Muestra los valores concretos usados en el cálculo del usuario
     ─────────────────────────────────────────────────────────── */
  document.getElementById('formulas-content').innerHTML = `
    <div class="formula-block">
      <div class="formula-title"><i class="fa-solid fa-temperature-half" style="margin-right:6px"></i>1. Estimación de sudoración (Sawka 2007)</div>
      <div class="formula-text">
        Base 800ml/h × Multiplicador intensidad <span class="formula-result">${intMult}</span>
        × Corrección peso (${peso}/70) ± Ajustes temperatura/clima/altitud
        = <span class="formula-result">${sudorBase} ml/h</span>
      </div>
    </div>
    <div class="formula-block">
      <div class="formula-title"><i class="fa-solid fa-cubes-stacked" style="margin-right:6px"></i>2. Carbohidratos recomendados (Jeukendrup 2004)</div>
      <div class="formula-text">
        Base según duración (${duracion}min) + Modificador intensidad − Tope tolerancia GI (${tolGI})
        = <span class="formula-result">${carbsRec} g/h</span>
      </div>
    </div>
    <div class="formula-block">
      <div class="formula-title"><i class="fa-solid fa-circle-dot" style="margin-right:6px"></i>3. Reposición de sodio (Maughan 2010)</div>
      <div class="formula-text">
        Base 600mg/h + Modificadores calor/intensidad/duración
        = <span class="formula-result">${sodioRec} mg Na/h</span><br>
        Conversión a sal: ${sodioRec}mg ÷ 393
        = <span class="formula-result">${Math.round(sodioRec / 393 * durH * 10) / 10} g NaCl total</span>
      </div>
    </div>
    <div class="formula-block">
      <div class="formula-title"><i class="fa-solid fa-vial" style="margin-right:6px"></i>4. Concentración y osmolalidad</div>
      <div class="formula-text">
        Concentración CHO: (${carbsPor500}g ÷ 500ml) × 100
        = <span class="formula-result">${concPct}%</span><br>
        Osmolalidad estimada: <span class="formula-result">${osmReal} mOsm/kg</span> (rango isotónico: 270–330)
      </div>
    </div>
  `;

  // Hace scroll suave hasta los resultados
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}