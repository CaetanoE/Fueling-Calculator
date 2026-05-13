// Toggle setup
document.getElementById('temp').addEventListener('input', function(){
  document.getElementById('tempVal').textContent = this.value + '°C';
});

function setupToggles(groupId) {
  document.getElementById(groupId).querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(groupId).querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
setupToggles('altitud');

function getToggleVal(groupId) {
  const active = document.querySelector('#' + groupId + ' .toggle-btn.active');
  return active ? active.dataset.val : null;
}

function togglePanel(name) {
  const panel = document.getElementById('panel-' + name);
  const btn = document.getElementById('btn-' + name);
  const isOpen = panel.classList.contains('open');
  document.querySelectorAll('.expand-panel').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.extra-btn').forEach(b => b.classList.remove('active'));
  if (!isOpen) {
    panel.classList.add('open');
    btn.classList.add('active');
    panel.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
}

function fmtTime(min) {
  const h = Math.floor(min / 60).toString().padStart(2,'0');
  const m = (min % 60).toString().padStart(2,'0');
  return h + ':' + m;
}

function calcular() {
  const peso = parseFloat(document.getElementById('peso').value) || 70;
  const edad = parseFloat(document.getElementById('edad').value) || 30;
  const sexo = document.getElementById('sexo').value;
  const nivel = document.getElementById('nivel').value;
  const deporte = document.getElementById('deporte').value;
  const duracion = parseFloat(document.getElementById('duracion').value) || 90;
  const intensidad = document.getElementById('intensidad').value;
  const temp = parseFloat(document.getElementById('temp').value);
  const humedad = document.getElementById('humedad').value;
  const altitud = getToggleVal('altitud');
  const hidratPrev = document.getElementById('hidratPrev').value;
  const tolGI = document.getElementById('tolGI').value;
  const objetivo = document.getElementById('objetivo').value;

  const durH = duracion / 60;

  // Sweat rate — Sawka et al. 2007
  let sudorBase = 800;
  if(sexo === 'f') sudorBase *= 0.85;
  const intMult = {low:0.6, mod:1.0, high:1.4, vhigh:1.8}[intensidad];
  sudorBase *= intMult;
  if(temp > 20) sudorBase += Math.round((temp - 20) / 5) * 100;
  if(temp < 15) sudorBase -= 100;
  if(humedad === 'humedo') sudorBase *= 1.1;
  if(altitud === 'medium') sudorBase *= 1.05;
  if(altitud === 'high') sudorBase *= 1.12;
  sudorBase = sudorBase * (peso / 70);
  sudorBase = Math.round(sudorBase);

  // Fluid — Sawka 2007, Burke 2011
  let aguaRec = sudorBase;
  if(duracion > 180 && aguaRec > 1200) aguaRec = 1200;
  if(objetivo === 'weight') aguaRec = Math.round(aguaRec * 0.9);
  if(hidratPrev === 'poor') aguaRec = Math.min(aguaRec * 1.15, 1400);
  aguaRec = Math.round(aguaRec / 10) * 10;

  // CHO — Jeukendrup 2004, 2014
  let carbsRec = 0;
  if(duracion >= 45 && duracion < 75) carbsRec = 20;
  else if(duracion >= 75 && duracion < 120) carbsRec = 40;
  else if(duracion >= 120 && duracion < 150) carbsRec = 55;
  else if(duracion >= 150) carbsRec = durH >= 2.5 ? 70 : 60;
  if(intensidad === 'high') carbsRec = Math.min(carbsRec + 10, 90);
  if(intensidad === 'vhigh') carbsRec = Math.min(carbsRec + 20, 90);
  if(nivel === 'elite') carbsRec = Math.min(carbsRec + 5, 90);
  if(tolGI === 'low') carbsRec = Math.min(carbsRec, 40);
  if(tolGI === 'med') carbsRec = Math.min(carbsRec, 65);
  if(objetivo === 'weight') carbsRec = Math.round(carbsRec * 0.6);
  if(objetivo === 'health') carbsRec = Math.round(carbsRec * 0.8);
  if(deporte === 'gym') carbsRec = Math.min(carbsRec, 50);
  carbsRec = Math.round(carbsRec);

  // Sodium — Maughan & Shirreffs 2010, Stofan 2005
  let sodioRec = 600;
  if(temp > 25) sodioRec += 100;
  if(temp > 35) sodioRec += 150;
  if(intensidad === 'high' || intensidad === 'vhigh') sodioRec += 100;
  if(duracion > 120) sodioRec += 100;
  if(sexo === 'm' && peso > 80) sodioRec += 100;
  if(altitud === 'high') sodioRec -= 50;
  sodioRec = Math.round(sodioRec / 50) * 50;

  // Per 500ml
  const carbsPerml = aguaRec > 0 ? carbsRec / aguaRec : 0;
  const carbsPor500 = Math.round(carbsPerml * 500 * 10) / 10;
  const sodioPerml = aguaRec > 0 ? sodioRec / aguaRec : 0;
  const sodioPor500 = Math.round(sodioPerml * 500);
  const salPor500g = Math.round((sodioPor500 / 393) * 10) / 10;
  const osmReal = Math.round(carbsPor500 / 500 * 1000 * 5.55 * 2 + sodioPor500 / 500 * 1000 * 2);
  const concPct = Math.round(carbsPor500 / 500 * 100 * 10) / 10;
  const totalPerdida = Math.round(sudorBase * durH / 100) / 10;
  const kcalTotal = Math.round(carbsRec * durH * 4);

  // Show results
  document.getElementById('placeholder').style.display = 'none';
  document.getElementById('results').style.display = 'block';

  // KPIs
  const deporteNames = {running:'Running / Trail',cycling:'Ciclismo',triathlon:'Triatlón',gym:'Gimnasio'};
  const intNames = {low:'baja (Z1-Z2)',mod:'moderada (Z3)',high:'alta (Z4)',vhigh:'máxima (Z5)'};
  const textoHumedad = humedad === 'seco' ? 'Seco' : (humedad === 'humedo' ? 'Húmedo' : 'Normal');
  document.getElementById('res-sport-label').textContent = deporteNames[deporte] + ' · Intensidad ' + intNames[intensidad];
  document.getElementById('res-summary-line').textContent = peso + 'kg · ' + temp + '°C · ' + textoHumedad + ' · ' + (tolGI==='low'?'GI sensible':tolGI==='med'?'GI normal':'GI resistente');
  document.getElementById('res-duration').textContent = fmtTime(duracion);
  document.getElementById('m-agua').textContent = aguaRec;
  document.getElementById('m-agua-sub').textContent = Math.round(aguaRec * durH / 100)/10 + ' L total';
  document.getElementById('m-carbs').textContent = carbsRec;
  document.getElementById('m-carbs-sub').textContent = Math.round(carbsRec * durH) + ' g total';
  document.getElementById('m-sodio').textContent = sodioRec;
  document.getElementById('m-sodio-sub').textContent = Math.round(sodioRec/393*durH*10)/10 + ' g sal total';
  document.getElementById('m-sweat').textContent = totalPerdida;

  const sweatCard = document.getElementById('kpi-sweat-card');
  if(totalPerdida > 2.5) sweatCard.classList.add('danger');
  else { sweatCard.classList.remove('danger'); }

  // Sweat alert
  const sweatAlert = document.getElementById('sweat-alert');
  if(totalPerdida > 2) {
    sweatAlert.style.display = 'block';
    document.getElementById('sweat-alert-text').textContent = 'Pérdida estimada de ' + totalPerdida + 'L — riesgo elevado de deshidratación. Prioriza la hidratación antes del ejercicio.';
  } else { sweatAlert.style.display = 'none'; }

  // Recipe
  let rows = '';
  rows += `<div class="recipe-item"><span class="recipe-ing"><i class="fa-solid fa-droplet" style="color:var(--cyan);margin-right:8px;font-size:12px"></i>Agua</span><span class="recipe-qty">500 <span>ml</span></span></div>`;
  if(carbsPor500 > 0) {
    rows += `<div class="recipe-item"><span class="recipe-ing"><i class="fa-solid fa-cubes-stacked" style="color:#60a5fa;margin-right:8px;font-size:12px"></i>Azúcar de mesa</span><span class="recipe-qty">${carbsPor500} <span>g</span></span></div>`;
  }
  rows += `<div class="recipe-item"><span class="recipe-ing"><i class="fa-solid fa-circle-dot" style="color:var(--warn);margin-right:8px;font-size:12px"></i>Sal (NaCl)</span><span class="recipe-qty">${salPor500g} <span>g</span></span></div>`;
  rows += `<div class="recipe-item" style="border-top:1px solid var(--border2);margin-top:4px"><span class="recipe-ing" style="color:var(--text3)">Calorías / 500ml</span><span class="recipe-qty" style="color:var(--text2)">${Math.round(carbsPor500*4)} <span>kcal</span></span></div>`;
  document.getElementById('recipe-rows').innerHTML = rows;

  let osmoPill = '';
  if(osmReal < 270) osmoPill = `<span class="osmo-pill osmo-hypo">Hipotónica · ${osmReal} mOsm/kg</span>`;
  else if(osmReal <= 330) osmoPill = `<span class="osmo-pill osmo-iso">Isotónica · ${osmReal} mOsm/kg</span>`;
  else osmoPill = `<span class="osmo-pill osmo-hyper">Hipertónica · ${osmReal} mOsm/kg</span>`;
  document.getElementById('osmo-pill-wrap').innerHTML = osmoPill;

  let isoNote = '';
  if(osmReal < 270) isoNote = 'Absorción de agua muy rápida. Ideal para calor extremo.';
  else if(osmReal <= 330) isoNote = 'Equilibrio óptimo absorción agua/energía. Vaciado gástrico rápido.';
  else isoNote = 'Mayor densidad energética. Puede ralentizar absorción hídrica.';
  document.getElementById('recipe-note').innerHTML = `<strong>Azúcar de mesa = sacarosa</strong> (50% glucosa + 50% fructosa). Activa transportadores SGLT1 y GLUT5 de forma independiente, maximizando la absorción.<br><br><span style="color:var(--text2)">${isoNote}</span>`;

  const giAlert = document.getElementById('gi-alert');
  if(tolGI === 'low') {
    giAlert.style.display = 'block';
    giAlert.innerHTML = '<i class="fa-solid fa-stomach" style="margin-right:6px"></i> GI sensible: comienza con dosis bajas e incrementa gradualmente. Evita concentraciones >6% CHO.';
  } else { giAlert.style.display = 'none'; }

  // Visual Timeline
  const tInterval = duracion <= 60 ? 15 : duracion <= 120 ? 20 : 25;
  const steps = [];
  for(let t = 0; t <= duracion; t += tInterval) {
    if(t > duracion) break;
    steps.push(t);
  }
  if(steps[steps.length-1] !== duracion) steps.push(duracion);

  const trackEl = document.getElementById('tl-track');
  trackEl.innerHTML = '';

  steps.forEach((t, i) => {
    const isFirst = i === 0;
    const isLast = t === duracion;
    const hasCarbs = carbsRec > 0 && !isFirst;
    const mlEste = isFirst ? Math.round(aguaRec * tInterval/60 * 1.2) : Math.round(aguaRec * tInterval/60);
    const carbEste = hasCarbs ? Math.round(carbsRec * tInterval/60) : 0;
    const kcalEste = Math.round(carbEste * 4);

    let type = 'type-water';
    let icon = 'fa-droplet';
    let desc = 'Agua + Electrolitos';
    if(isFirst) { type='type-start'; icon='fa-flag'; desc='Inicio'; }
    else if(isLast) { type='type-end'; icon='fa-flag-checkered'; desc='Fin'; }
    else if(hasCarbs) { type='type-gel'; icon='fa-bolt'; desc='Bebida energética'; }

    const item = document.createElement('div');
    item.className = 'tl-item';
    item.innerHTML = `
      <div class="tl-icon-wrap">
        <div class="tl-circle ${type}"><i class="fa-solid ${icon}"></i></div>
        <div class="tl-num">${i+1}</div>
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

  document.getElementById('tl-totals').innerHTML = `Tomar cada ${tInterval} min · Total: <span style="color:var(--cyan)">${Math.round(aguaRec*durH/100)/10} L</span> fluidos · <span style="color:var(--cyan)">${Math.round(carbsRec*durH)} g</span> CHO · <span style="color:var(--cyan)">${kcalTotal} kcal</span>`;

  // Reposition line after render to align with circle centers
  requestAnimationFrame(() => {
    const track = document.getElementById('tl-track');
    const items = track.querySelectorAll('.tl-item');
    const line = document.getElementById('tl-line');
    if(items.length >= 2) {
      const first = items[0].querySelector('.tl-circle').getBoundingClientRect();
      const last = items[items.length-1].querySelector('.tl-circle').getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const leftPx = first.left + first.width/2 - trackRect.left;
      const rightPx = trackRect.right - (last.left + last.width/2);
      line.style.left = leftPx + 'px';
      line.style.right = rightPx + 'px';
      line.style.top = (first.top + first.height/2 - trackRect.top) + 'px';
    }
  });

  // References
  const refs = [
    {id:'[1]', autor:'Jeukendrup, A.E. (2004)', titulo:'Carbohydrate intake during exercise and performance', hallazgo:'60g/h de glucosa = absorción máxima del transportador SGLT1. Mezcla glucosa+fructosa (ratio 2:1) permite hasta 90g/h al activar GLUT5.', journal:'Nutrition'},
    {id:'[2]', autor:'Sawka et al. (2007)', titulo:'ACSM Position Stand: Exercise and Fluid Replacement', hallazgo:'Tasa de sudoración 0.5-2.0 L/h según intensidad y temperatura. Déficit >2% del peso corporal deteriora el rendimiento aeróbico.', journal:'Med Sci Sports Exerc'},
    {id:'[3]', autor:'Maughan & Shirreffs (2010)', titulo:'Dehydration and rehydration in competitive sport', hallazgo:'Concentración de Na⁺ en sudor: 20-80 mmol/L (media 35-50). Soluciones con 400-700mg Na/L optimizan la absorción intestinal.', journal:'Scand J Med Sci Sports'},
    {id:'[4]', autor:'Stofan et al. (2005)', titulo:'Sweat and sodium losses in NCAA football players', hallazgo:'Atletas con alta tasa de sudoración pierden hasta 1750mg Na/h. La sal en la bebida es esencial para prevenir hiponatremia.', journal:'Int J Sport Nutr Exerc Metab'},
    {id:'[5]', autor:'Jeukendrup, A.E. (2014)', titulo:'A step towards personalized sports nutrition: carbohydrate intake during exercise', hallazgo:'Soluciones isotónicas (270-330 mOsm/kg) se vacían del estómago más rápido. Sacarosa (azúcar de mesa) = fuente ideal glucosa+fructosa 1:1.', journal:'Sports Medicine'},
    {id:'[6]', autor:'Burke et al. (2011)', titulo:'Carbohydrates for training and competition', hallazgo:'El entrenamiento intestinal (gut training) incrementa la tolerancia a CHO hasta 90g/h. Recomendado empezar con dosis bajas e incrementar.', journal:'J Sports Sci'},
  ];
  document.getElementById('refs-content').innerHTML = refs.map(r =>
    `<div class="ref-item"><div><span class="ref-badge">${r.id}</span><span class="ref-author">${r.autor}</span> — <span class="ref-journal">${r.titulo} (${r.journal})</span></div><div class="ref-finding">${r.hallazgo}</div></div>`
  ).join('');

  // Formulas
  document.getElementById('formulas-content').innerHTML = `
    <div class="formula-block">
      <div class="formula-title"><i class="fa-solid fa-temperature-half" style="margin-right:6px"></i>1. Estimación de sudoración (Sawka 2007)</div>
      <div class="formula-text">Base 800ml/h × Multiplicador intensidad <span class="formula-result">${intMult}</span> × Corrección peso (${peso}/70) ± Ajustes temperatura/clima/altitud = <span class="formula-result">${sudorBase} ml/h</span></div>
    </div>
    <div class="formula-block">
      <div class="formula-title"><i class="fa-solid fa-cubes-stacked" style="margin-right:6px"></i>2. Carbohidratos recomendados (Jeukendrup 2004)</div>
      <div class="formula-text">Base según duración (${duracion}min) + Modificador intensidad − Tope tolerancia GI (${tolGI}) = <span class="formula-result">${carbsRec} g/h</span></div>
    </div>
    <div class="formula-block">
      <div class="formula-title"><i class="fa-solid fa-circle-dot" style="margin-right:6px"></i>3. Reposición de sodio (Maughan 2010)</div>
      <div class="formula-text">Base 600mg/h + Modificadores calor/intensidad/duración = <span class="formula-result">${sodioRec} mg Na/h</span><br>Conversión a sal: ${sodioRec}mg ÷ 393 = <span class="formula-result">${Math.round(sodioRec/393*durH*10)/10} g NaCl total</span></div>
    </div>
    <div class="formula-block">
      <div class="formula-title"><i class="fa-solid fa-vial" style="margin-right:6px"></i>4. Concentración y osmolalidad</div>
      <div class="formula-text">Concentración CHO: (${carbsPor500}g ÷ 500ml) × 100 = <span class="formula-result">${concPct}%</span><br>Osmolalidad estimada: <span class="formula-result">${osmReal} mOsm/kg</span> (rango isotónico: 270–330)</div>
    </div>
  `;

  document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
}
