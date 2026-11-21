'use strict';

/* =========================================================
   1. DATOS: ciudades, periodos y planes
   ========================================================= */
const TZ = 'America/Bogota';

const CITIES = [
  { id: 'barrancabermeja', name: 'Barrancabermeja', lat: 7.0653, lon: -73.8547, beach: false },
  { id: 'bucaramanga', name: 'Bucaramanga', lat: 7.1193, lon: -73.1227, beach: false },
  { id: 'bogota', name: 'Bogotá', lat: 4.711, lon: -74.0721, beach: false },
  { id: 'medellin', name: 'Medellín', lat: 6.2442, lon: -75.5812, beach: false },
  { id: 'pereira', name: 'Pereira', lat: 4.8133, lon: -75.6961, beach: false },
  { id: 'cartagena', name: 'Cartagena', lat: 10.391, lon: -75.4794, beach: true },
  { id: 'santamarta', name: 'Santa Marta', lat: 11.2408, lon: -74.199, beach: true }
];

const PERIODS = {
  hoy: { label: 'Hoy', days: [0] },
  manana: { label: 'Mañana', days: [1] },
  '3': { label: 'Próximos 3 días', days: [0, 1, 2] }
};

const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

/*
  Cada plan tiene:
  - windows: horas habituales [inicio, fin) en que se hace el plan
  - score(h): puntaje 0-100 para una hora según el clima (h = temp, rain, uv, wind, cloud)
  - extra(m, level): frase final según el clima
  Para agregar un plan nuevo, copia uno de estos objetos y ajusta las reglas.
*/
const ACTIVITIES = [
  {
    id: 'cafe', icon: '☕', label: 'Salir por un café', windows: [[8, 20]],
    score: h => clamp(50 + h.cloud * 0.3 + (h.rain >= 25 && h.rain <= 75 ? 15 : 0) - Math.max(0, h.temp - 27) * 4 - (h.rain > 85 ? 25 : 0)),
    extra: m => m.rain >= 25 ? 'El clima nublado y con ganas de llover es ideal para un buen café.' : 'Hace buen día; un café en terraza se antoja.'
  },
  {
    id: 'cine', icon: '🎬', label: 'Ir al cine', windows: [[16, 22]],
    score: h => clamp(65 + h.rain * 0.3),
    extra: m => m.rain >= 40 ? 'Con lluvia, el cine es el mejor refugio.' : 'Las funciones después de las 4 p. m. son las más cómodas.'
  },
  {
    id: 'correr', icon: '🏃', label: 'Salir a correr', windows: [[5, 9], [17, 20]],
    score: h => clamp(100 - h.rain * 0.9 - Math.max(0, h.temp - 24) * 5 - h.uv * 3 - Math.max(0, h.wind - 25) * 2 - (h.temp < 12 ? (12 - h.temp) * 3 : 0)),
    extra: (m, l) => l === 'good' ? 'Lleva agua e hidrátate bien.' : l === 'bad' ? 'Mejor deja la carrera para otro momento.' : 'Elige las horas más frescas y lleva agua.'
  },
  {
    id: 'piscina', icon: '🏊', label: 'Ir a piscina', windows: [[10, 17]],
    score: h => clamp(100 - h.rain * 1.1 - Math.max(0, 26 - h.temp) * 6 - (h.cloud > 80 ? 10 : 0)),
    extra: m => m.temp >= 27 ? 'Buen calor para meterse al agua.' : 'Se siente fresco; el agua puede estar fría.'
  },
  {
    id: 'futbol', icon: '⚽', label: 'Jugar fútbol', windows: [[6, 9], [16, 21]],
    score: h => clamp(100 - h.rain * 0.9 - Math.max(0, h.temp - 27) * 4 - h.uv * 2 - Math.max(0, h.wind - 30) * 2),
    extra: (m, l) => l === 'good' ? 'Cancha seca y buen clima para jugar.' : 'Revisa que la cancha no esté mojada.'
  },
  {
    id: 'casa', icon: '🏠', label: 'Plancito de casa', windows: [[18, 23]],
    score: h => clamp(55 + h.rain * 0.35 + Math.max(0, 24 - h.temp) * 2),
    extra: m => m.rain >= 40 ? 'Día perfecto para quedarse en casa con películas y snacks.' : 'Un plancito tranquilo en casa siempre funciona.'
  },
  {
    id: 'comer', icon: '🍽️', label: 'Ir a comer', windows: [[12, 14], [18, 21]],
    score: h => clamp(75 - h.rain * 0.3 - Math.max(0, h.temp - 32) * 3),
    extra: m => m.rain >= 50 ? 'Busca un sitio con techo.' : 'Puedes comer en terraza sin problema.'
  },
  {
    id: 'playa', icon: '🏖️', label: 'Ir a la playa', windows: [[8, 16]], beachOnly: true,
    score: h => clamp(100 - h.rain * 1.3 - Math.max(0, 26 - h.temp) * 5 - Math.max(0, h.wind - 30) * 2 - (h.uv >= 11 ? 10 : 0)),
    extra: m => m.uv >= 8 ? 'Usa bloqueador solar y busca sombra al mediodía.' : 'Buen día para el mar; no olvides el bloqueador.'
  }
];

const VERDICTS = {
  good: '¡Sí se arma el plan!',
  maybe: 'Se arma, pero con ojo',
  bad: 'Mejor cambia de plan',
  none: 'Ya no quedan horarios'
};
/*
  Qué planes encajan con cada condición del clima y por qué.
  Condiciones: calor, lluvia, fresco, sol, nublado.
  Para añadir un plan nuevo, agrégalo también aquí.
*/
const WHY = {
  cafe: { lluvia: 'Un café mientras cae la lluvia', nublado: 'Día nubladito, ideal para un café', fresco: 'Un café caliente con el fresquito' },
  cine: { lluvia: 'Refugio perfecto si llueve', calor: 'Con aire acondicionado escapas del calor' },
  correr: { fresco: 'Fresco y buen aire para trotar', nublado: 'Sin sol fuerte, buen día para correr', sol: 'Corre temprano y aprovecha el sol' },
  piscina: { calor: 'Para refrescarte del calor', sol: 'Día de sol y agua' },
  futbol: { fresco: 'Buen clima para jugar', nublado: 'Sin sol fuerte para el partido', sol: 'Juega temprano o al atardecer' },
  casa: { lluvia: 'Mantita, snacks y película', calor: 'Fresquito en casa, sin sufrir el calor', fresco: 'Plan abrigado en casa' },
  comer: { lluvia: 'Comida rica mientras pasa la lluvia', calor: 'Un lugar con aire y algo frío', fresco: 'Buen día para salir a comer', sol: 'Terraza y buena comida', nublado: 'Plan cómodo para cualquier cielo' },
  playa: { calor: 'El mar alivia el calor', sol: 'Día de sol para el mar' }
};

const LEVEL_TEXT = { good: 'Muy recomendado', maybe: 'Con precaución', bad: 'No recomendado', none: 'Sin horarios' };

/* =========================================================
   2. UTILIDADES
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const getCity = id => CITIES.find(c => c.id === id);
const getAct = id => ACTIVITIES.find(a => a.id === id);

const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ } }
};

function nowBogota() {
  const s = new Date().toLocaleString('sv-SE', { timeZone: TZ });
  return { date: s.slice(0, 10), hour: parseInt(s.slice(11, 13), 10) };
}

function fmtHour(h) {
  const h24 = h % 24;
  return `${h24 % 12 || 12}:00 ${h24 < 12 ? 'a. m.' : 'p. m.'}`;
}

function fmtDate(date) {
  const t = new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const levelOf = score => score == null ? 'none' : score >= 70 ? 'good' : score >= 45 ? 'maybe' : 'bad';

function uvLabel(uv) {
  if (uv < 3) return 'bajo';
  if (uv < 6) return 'moderado';
  if (uv < 8) return 'alto';
  if (uv < 11) return 'muy alto';
  return 'extremo';
}

const partOf = h => h < 12 ? 'manana' : h < 18 ? 'tarde' : 'noche';
const PART_INFO = {
  manana: { label: 'Mañana', icon: '🌅' },
  tarde: { label: 'Tarde', icon: '🌇' },
  noche: { label: 'Noche', icon: '🌙' }
};

/* =========================================================
   3. API: pronóstico por horas (Open-Meteo, formato JSON)
   ========================================================= */
const cache = new Map();

async function getWeather(city) {
  const hit = cache.get(city.id);
  if (hit && Date.now() - hit.t < 10 * 60 * 1000) return hit.hours;

  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${city.lat}&longitude=${city.lon}`
    + '&hourly=temperature_2m,precipitation_probability,uv_index,wind_speed_10m,cloud_cover'
    + `&timezone=${encodeURIComponent(TZ)}&forecast_days=3`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error('http');

  const json = await res.json();
  const hr = json.hourly;
  if (!hr || !Array.isArray(hr.time)) throw new Error('data');

  const hours = hr.time.map((t, i) => ({
    date: t.slice(0, 10),
    hour: parseInt(t.slice(11, 13), 10),
    temp: hr.temperature_2m[i],
    rain: hr.precipitation_probability[i] ?? 0,
    uv: hr.uv_index[i] ?? 0,
    wind: hr.wind_speed_10m[i],
    cloud: hr.cloud_cover[i] ?? 0
  }));
  cache.set(city.id, { t: Date.now(), hours });
  return hours;
}

const ERROR_TEXT = {
  network: 'No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.',
  timeout: 'El servicio del clima tardó demasiado en responder. Inténtalo de nuevo.',
  http: 'El servicio del clima no está disponible en este momento. Inténtalo en unos minutos.',
  data: 'Recibimos datos incompletos del servicio del clima. Inténtalo de nuevo.'
};

/* =========================================================
   4. LÓGICA: evaluar un plan con el clima
   ========================================================= */
const inWindow = (hour, act) => act.windows.some(([a, b]) => hour >= a && hour < b);

function blocksOf(hs, act) {
  const out = [];
  for (let i = 0; i < hs.length - 1; i++) {
    if (hs[i + 1].hour === hs[i].hour + 1) {
      out.push({ start: hs[i].hour, end: hs[i].hour + 2, score: Math.round((act.score(hs[i]) + act.score(hs[i + 1])) / 2) });
    }
  }
  if (!out.length) hs.forEach(h => out.push({ start: h.hour, end: h.hour + 1, score: act.score(h) }));
  return out;
}

function evaluate(hours, act, periodKey) {
  const dates = [...new Set(hours.map(h => h.date))];
  const now = nowBogota();

  const days = (Array.isArray(periodKey) ? periodKey : PERIODS[periodKey].days).map(i => dates[i]).filter(Boolean).map(date => {
    const all = hours.filter(h => h.date === date);
    let hs = all.filter(h => inWindow(h.hour, act));
    if (date === now.date) hs = hs.filter(h => h.hour > now.hour);
    const blocks = blocksOf(hs, act);
    const best = blocks.reduce((a, b) => (!a || b.score > a.score ? b : a), null);
    const parts = {};
    blocks.forEach(b => {
      const p = partOf(b.start);
      if (!parts[p] || b.score > parts[p].score) parts[p] = b;
    });
    return { date, all, hs, best, parts, score: best ? best.score : null, past: date === now.date ? now.hour : -1 };
  });

  const used = days.flatMap(d => d.hs);
  const metrics = used.length ? {
    temp: Math.round(used.reduce((s, h) => s + h.temp, 0) / used.length),
    rain: Math.max(...used.map(h => h.rain)),
    uv: Math.round(Math.max(...used.map(h => h.uv))),
    wind: Math.round(used.reduce((s, h) => s + h.wind, 0) / used.length),
    cloud: Math.round(used.reduce((s, h) => s + h.cloud, 0) / used.length)
  } : null;

  const scored = days.filter(d => d.score != null);
  const bestDay = scored.reduce((a, b) => (!a || b.score > a.score ? b : a), null);
  const score = bestDay ? bestDay.score : null;
  return { days, metrics, bestDay, score, level: levelOf(score) };
}

function rankActivities(hours, city, periodKey) {
  return ACTIVITIES
    .filter(a => !a.beachOnly || city.beach)
    .map(a => ({ act: a, ...evaluate(hours, a, periodKey) }))
    .sort((x, y) => (y.score ?? -1) - (x.score ?? -1));
}

/* Resumen del clima general del día (6 a. m. a 9 p. m.), sin depender del plan */
function daySummary(day) {
  let hs = day.all.filter(h => h.hour >= 6 && h.hour <= 21 && h.hour > day.past);
  if (!hs.length) hs = day.all.filter(h => h.hour >= 6 && h.hour <= 21);
  const top = (key) => hs.reduce((a, b) => (b[key] > a[key] ? b : a), hs[0]);
  return {
    maxT: Math.round(top('temp').temp), maxTHour: top('temp').hour,
    minT: Math.round(Math.min(...hs.map(h => h.temp))),
    maxRain: top('rain').rain, rainHour: top('rain').hour,
    maxUv: Math.round(top('uv').uv), maxWind: Math.round(top('wind').wind),
    cloud: Math.round(hs.reduce((a, h) => a + h.cloud, 0) / hs.length)
  };
}

function conditionsOf(m) {
  const c = [];
  if (m.maxT >= 30) c.push('calor');
  if (m.maxRain >= 40) c.push('lluvia');
  if (m.maxT < 22) c.push('fresco');
  if (m.maxT < 30 && m.cloud < 40 && m.maxRain < 30) c.push('sol');
  if (m.cloud >= 60 && m.maxRain < 40) c.push('nublado');
  return c;
}

function alertsOf(m) {
  const a = [];
  if (m.maxT >= 34) a.push({ type: 'hot', icon: '🔥', title: 'Demasiado calor', text: `Llega a ${m.maxT} °C hacia las ${fmtHour(m.maxTHour)} Evita el sol fuerte entre 11 a. m. y 3 p. m. e hidrátate.` });
  else if (m.maxT >= 30) a.push({ type: 'hot', icon: '🌡️', title: 'Hace calor', text: `Llega a ${m.maxT} °C hacia las ${fmtHour(m.maxTHour)} Busca sombra y toma agua.` });
  if (m.maxRain >= 60) a.push({ type: 'rain', icon: '🌧️', title: 'Quiere llover', text: `Probabilidad de ${m.maxRain} % hacia las ${fmtHour(m.rainHour)} Lleva paraguas o prefiere planes bajo techo.` });
  else if (m.maxRain >= 30) a.push({ type: 'rain', icon: '☁️', title: 'Puede llover', text: `Probabilidad de ${m.maxRain} % hacia las ${fmtHour(m.rainHour)} Ten un plan B a la mano.` });
  if (m.maxUv >= 8) a.push({ type: 'uv', icon: '😎', title: 'UV muy alto', text: `Índice de ${m.maxUv}. Usa bloqueador y evita el mediodía.` });
  else if (m.maxUv >= 6) a.push({ type: 'uv', icon: '🕶️', title: 'UV alto', text: `Índice de ${m.maxUv}. Usa bloqueador solar.` });
  if (m.maxWind >= 30) a.push({ type: 'wind', icon: '💨', title: 'Viento fuerte', text: `Hasta ${m.maxWind} km/h. Cuidado en espacios abiertos.` });
  if (m.maxT <= 15) a.push({ type: 'cold', icon: '🧥', title: 'Hace frío', text: `Mínima de ${m.minT} °C. Sal abrigado.` });
  return a;
}

function skyOf(m) {
  if (m.maxRain >= 50) return 'lluvia';
  if (m.maxT >= 33) return 'calor';
  if (m.cloud >= 65 || m.maxRain >= 30) return 'nublado';
  return 'sol';
}

/* =========================================================
   5. CHIPS DEL FORMULARIO
   ========================================================= */
const state = { last: null, token: 0, dayIdx: 0, hour: null, retry: null };

const selected = name => {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
};

function renderCityChips() {
  $('#chipsCiudad').innerHTML = CITIES.map(c =>
    `<label class="chip-opt"><input type="radio" name="ciudad" value="${c.id}"><span>${c.name}</span></label>`).join('');
}

function renderPlanChips(keep) {
  const city = getCity(selected('ciudad'));
  const list = ACTIVITIES.filter(a => !a.beachOnly || city.beach);
  const prev = keep || selected('actividad');
  const pick = list.some(a => a.id === prev) ? prev : list[0].id;
  $('#chipsPlan').innerHTML = list.map(a =>
    `<label class="chip-opt plan"><input type="radio" name="actividad" value="${a.id}"${a.id === pick ? ' checked' : ''}><span><b aria-hidden="true">${a.icon}</b>${a.label}</span></label>`).join('');
}

function setSelection(q) {
  const c = document.querySelector(`input[name="ciudad"][value="${q.cityId}"]`);
  if (c) c.checked = true;
  renderPlanChips(q.actId);
  const p = document.querySelector(`input[name="periodo"][value="${q.period}"]`);
  if (p) p.checked = true;
}

const currentQuery = () => ({ cityId: selected('ciudad'), actId: selected('actividad'), period: selected('periodo') });

/* =========================================================
   6. RENDER DE RESULTADOS
   ========================================================= */
function gauge(score, level) {
  const s = score ?? 0;
  return `<svg class="gauge ${level}" viewBox="0 0 120 74" role="img" aria-label="Puntaje ${score ?? 'sin datos'} de 100">
    <path class="g-track" d="M10 64 A50 50 0 0 1 110 64" pathLength="100"/>
    <path class="g-fill" d="M10 64 A50 50 0 0 1 110 64" pathLength="100" stroke-dasharray="${s} 100"/>
    <text x="60" y="56" text-anchor="middle" class="g-num">${score ?? '–'}</text>
    <text x="60" y="70" text-anchor="middle" class="g-lbl">de 100</text></svg>`;
}

function tile(icon, label, value, sub) {
  return `<div class="tile"><span class="ico" aria-hidden="true">${icon}</span>
    <div><small>${label}</small><strong>${value}</strong>${sub ? `<em>${sub}</em>` : ''}</div></div>`;
}

/* "Hoy", "Mañana" o el día de la semana */
function relDay(date) {
  const today = nowBogota().date;
  const tm = new Date(today + 'T12:00:00'); tm.setDate(tm.getDate() + 1);
  if (date === today) return 'Hoy';
  if (date === tm.toISOString().slice(0, 10)) return 'Mañana';
  return fmtDate(date);
}

/* Día y hora que el usuario tiene elegidos en la franja de calor */
const favSel = () => {
  const d = state.last && state.last.r.days[state.dayIdx];
  return { date: d ? d.date : null, hour: state.hour };
};
const sameFav = (f, q, s) => f.cityId === q.cityId && f.actId === q.actId && f.period === q.period
  && (f.date || null) === s.date && (f.hour ?? null) === (s.hour ?? null);
const isFav = q => store.get('sap_favoritos').some(f => sameFav(f, q, favSel()));
const favText = q => {
  if (isFav(q)) return '★ En favoritos';
  const s = favSel();
  return s.date && s.hour != null ? `☆ Guardar: ${relDay(s.date)} a las ${fmtHour(s.hour)}` : '☆ Guardar en favoritos';
};
function updateFavButton() {
  const btn = $('#btnFav');
  if (!btn || !state.last) return;
  btn.setAttribute('aria-pressed', isFav(state.last.q));
  btn.textContent = favText(state.last.q);
}

function skeleton() {
  return `<div class="sk" style="height:170px"></div>
    <div class="sk" style="height:62px"></div>
    <div class="sk" style="height:190px"></div>`;
}

function renderResults(q, hours, opts = {}) {
  const city = getCity(q.cityId), act = getAct(q.actId);
  const r = evaluate(hours, act, q.period);
  const ranking = rankActivities(hours, city, q.period);
  state.last = { q, hours, r, ranking, auto: !!opts.auto };
  state.dayIdx = Math.max(0, r.days.findIndex(d => d === r.bestDay));
  state.hour = r.bestDay && r.bestDay.best ? r.bestDay.best.start : null;
  if (opts.pick && opts.pick.date) {
    const i = r.days.findIndex(d => d.date === opts.pick.date);
    if (i >= 0) { state.dayIdx = i; if (opts.pick.hour != null) state.hour = opts.pick.hour; }
  }

  let body;
  if (!r.metrics) {
    body = 'Hoy ya pasaron los horarios habituales de este plan. Prueba con “Mañana” o con otro plan.';
  } else {
    const m = r.metrics;
    const rain = m.rain <= 20 ? 'La probabilidad de lluvia es baja' : m.rain <= 50 ? 'Hay probabilidad moderada de lluvia' : 'La probabilidad de lluvia es alta';
    body = `${rain} y el índice UV es ${uvLabel(m.uv)}. ${act.extra(m, r.level)}`;
    if (q.period === '3' && r.bestDay) body += ` Mejor día: ${fmtDate(r.bestDay.date)}.`;
  }

  const tiles = r.metrics
    ? `<div class="tiles">
        ${tile('🌡️', 'Temperatura', `${r.metrics.temp} °C`, 'promedio')}
        ${tile('🌧️', 'Prob. de lluvia', `${r.metrics.rain} %`, 'máxima')}
        ${tile('☀️', 'Índice UV', r.metrics.uv, uvLabel(r.metrics.uv))}
        ${tile('💨', 'Viento', `${r.metrics.wind} km/h`, 'promedio')}
      </div>` : '';

  $('#resultados').innerHTML = `
    <div class="banner">
      <div>
        ${opts.auto ? '<span class="badge">Plan del momento</span>' : ''}
        <h2>${city.name}</h2>
        <p class="sub">${act.icon} ${act.label} &nbsp;|&nbsp; ${PERIODS[q.period].label}</p>
        <div class="${r.level}">
          <p class="verdict-title"><span class="dot" aria-hidden="true"></span>${VERDICTS[r.level]}</p>
        </div>
        <p class="body">${body}</p>
        <div class="banner-actions">
          <button class="btn-fav" type="button" id="btnFav" aria-pressed="${isFav(q)}">${favText(q)}</button>
        </div>
      </div>
      ${gauge(r.score, r.level)}
    </div>
    <div class="panel" id="climaPanel"></div>
    ${tiles}
    <div class="panel" id="heatPanel"></div>`;

  renderClima();
  renderHeat();
  renderDetail();
}

/* Alertas del clima y planes que se adaptan a él */
function renderClima() {
  const panel = $('#climaPanel');
  if (!panel || !state.last) return;
  const { q, r, hours } = state.last;
  const day = r.days[state.dayIdx];
  if (!day) { panel.innerHTML = ''; return; }

  const m = daySummary(day);
  const conds = conditionsOf(m);
  document.body.dataset.sky = skyOf(m);

  const alerts = alertsOf(m);
  const alertsHtml = alerts.length
    ? alerts.map(a => `<div class="alert ${a.type}"><span class="a-ico" aria-hidden="true">${a.icon}</span><div><strong>${a.title}</strong><p>${a.text}</p></div></div>`).join('')
    : '<div class="alert calm"><span class="a-ico" aria-hidden="true">😊</span><div><strong>Clima tranquilo</strong><p>Sin alertas: temperatura agradable y poca probabilidad de lluvia.</p></div></div>';

  const dates = [...new Set(hours.map(h => h.date))];
  const dateIdx = dates.indexOf(day.date);
  const city = getCity(q.cityId);
  const recs = ACTIVITIES
    .filter(a => !a.beachOnly || city.beach)
    .map(a => {
      const e = evaluate(hours, a, [dateIdx]);
      const fit = conds.find(c => (WHY[a.id] || {})[c]);
      return { act: a, score: e.score, best: e.days[0] && e.days[0].best, fit, why: fit ? WHY[a.id][fit] : null };
    })
    .filter(x => x.score != null && x.score >= 45 && (x.fit || !conds.length))
    .sort((x, y) => y.score - x.score)
    .slice(0, 4);

  const recsHtml = recs.length
    ? `<div class="recs">${recs.map(x => `<button class="rec${x.act.id === q.actId ? ' current' : ''}" type="button" data-alt="${x.act.id}">
        <span class="rec-ico" aria-hidden="true">${x.act.icon}</span>
        <span class="rec-text"><b>${x.act.label}</b><small>${x.why || 'Buen momento para este plan'}</small>${x.best ? `<em>${fmtHour(x.best.start)} – ${fmtHour(x.best.end)}</em>` : ''}</span>
        <span class="tag ${levelOf(x.score)}">${x.score}</span></button>`).join('')}</div>`
    : '<p class="muted">Con este clima conviene esperar: no hay planes con buen puntaje para este día.</p>';

  panel.innerHTML = `
    <h2>Clima: ${fmtDate(day.date)}</h2>
    <div class="alerts">${alertsHtml}</div>
    <h2 class="rec-title">Planes para este clima</h2>
    ${recsHtml}`;
}

/* Franja de calor: una barra por hora, coloreada por qué tan bueno está el clima para el plan */
function renderHeat() {
  const panel = $('#heatPanel');
  if (!panel || !state.last) return;
  const { q, r } = state.last;
  const act = getAct(q.actId);
  const day = r.days[state.dayIdx];

  if (!day) { panel.innerHTML = '<p class="muted">No hay datos para este periodo.</p>'; return; }

  const dayTabs = r.days.length > 1
    ? `<div class="day-tabs" role="group" aria-label="Elegir día">${r.days.map((d, i) =>
      `<button class="day-tab ${levelOf(d.score)}" type="button" data-day="${i}" aria-pressed="${i === state.dayIdx}"><i></i>${fmtDate(d.date)}</button>`).join('')}</div>`
    : `<p class="muted" style="margin-bottom:8px">${fmtDate(day.date)}</p>`;

  const bars = day.all.map(h => {
    const inWin = inWindow(h.hour, act);
    const past = h.hour <= day.past;
    const s = inWin ? act.score(h) : null;
    const l = s == null ? 'off' : levelOf(s);
    const height = s == null ? 14 : 22 + s * 0.78;
    const best = day.best && h.hour >= day.best.start && h.hour < day.best.end;
    return `<button type="button" class="hbar ${l}${past ? ' past' : ''}${best ? ' best' : ''}" style="height:${height}%"
      data-hour="${h.hour}" aria-pressed="${state.hour === h.hour}" aria-label="${fmtHour(h.hour)}${s != null ? `, puntaje ${s}` : ', fuera del horario del plan'}"></button>`;
  }).join('');

  const slots = ['manana', 'tarde', 'noche'].filter(p => day.parts[p]).map(p => {
    const b = day.parts[p];
    return `<div class="slot">${PART_INFO[p].icon} ${PART_INFO[p].label}: <b>${fmtHour(b.start)} – ${fmtHour(b.end)}</b></div>`;
  }).join('');

  panel.innerHTML = `
    <h2>Mejores horarios sugeridos</h2>
    ${dayTabs}
    <div class="heat" role="group" aria-label="Clima hora por hora">${bars}</div>
    <div class="axis" aria-hidden="true"><span>12 a. m.</span><span>6 a. m.</span><span>12 p. m.</span><span>6 p. m.</span><span>12 a. m.</span></div>
    <div class="heat-info" id="heatInfo">${heatInfo(day, act)}</div>
    <div class="legend" aria-hidden="true">
      <span><i style="background:var(--good)"></i>Muy bueno</span><span><i style="background:var(--maybe)"></i>Regular</span>
      <span><i style="background:var(--bad)"></i>Malo</span><span><i style="background:var(--soft)"></i>Fuera de horario</span>
      <span><i style="box-shadow:0 0 0 2px var(--violet);background:#fff"></i>Mejor momento</span>
    </div>
    ${slots ? `<div class="slots">${slots}</div>` : '<p class="muted" style="margin-top:10px">Sin horarios disponibles este día.</p>'}`;
  updateFavButton();
}

function heatInfo(day, act) {
  const h = day.all.find(x => x.hour === state.hour);
  if (!h) return 'Toca una barra para ver el clima de esa hora.';
  const inWin = inWindow(h.hour, act);
  const s = inWin ? act.score(h) : null;
  const plan = s == null ? 'fuera del horario habitual de este plan' : `puntaje ${s}: ${LEVEL_TEXT[levelOf(s)].toLowerCase()}`;
  return `<strong>${fmtHour(h.hour)}</strong>: ${Math.round(h.temp)} °C, lluvia ${h.rain} %, UV ${Math.round(h.uv)}, viento ${Math.round(h.wind)} km/h (${plan}).`;
}

function renderDetail() {
  const box = $('#detalle');
  if (!state.last) return;
  const { q, r, ranking } = state.last;
  const city = getCity(q.cityId), act = getAct(q.actId);

  const rank = ranking.map(x => `<button type="button" class="rank-row" data-alt="${x.act.id}">
      <span>${x.act.icon} ${x.act.label}</span>
      <div class="bar" role="img" aria-label="${LEVEL_TEXT[x.level]}"><i class="${x.level}" style="width:${x.score ?? 0}%"></i></div>
      <span class="tag ${x.level}">${x.score ?? '–'}</span></button>`).join('');

  let table = '<p class="muted">No quedan horarios para este plan en el periodo elegido.</p>';
  if (r.bestDay) {
    const rows = r.bestDay.hs.map(h => {
      const s = act.score(h), l = levelOf(s);
      return `<tr><td>${fmtHour(h.hour)}</td><td>${Math.round(h.temp)} °C</td><td>${h.rain} %</td><td>${Math.round(h.uv)}</td><td>${Math.round(h.wind)} km/h</td><td><span class="tag ${l}">${s}</span></td></tr>`;
    }).join('');
    table = `<div class="table-wrap"><table>
      <thead><tr><th>Hora</th><th>Temp.</th><th>Lluvia</th><th>UV</th><th>Viento</th><th>Puntaje</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  box.innerHTML = `<div class="stack">
    <div class="panel">
      <h2>Todos los planes en ${city.name}</h2>
      <p class="muted">${PERIODS[q.period].label}. Puntaje de 0 a 100 con el mejor momento del periodo. Toca un plan para consultarlo.</p>
      <div class="rank">${rank}</div>
    </div>
    <div class="panel">
      <h2>${act.icon} ${act.label}: hora por hora</h2>
      <p class="muted">${r.bestDay ? fmtDate(r.bestDay.date) : ''}</p>
      ${table}
    </div></div>`;
}

function renderHistory() {
  const list = store.get('sap_historial');
  const box = $('#listaHistorial');
  if (!list.length) {
    box.innerHTML = '<div class="panel empty"><p>Todavía no hay consultas. Cuando consultes un plan, aparecerá aquí.</p></div>';
    return;
  }
  box.innerHTML = list.map((h, i) => {
    const city = getCity(h.cityId), act = getAct(h.actId);
    if (!city || !act) return '';
    return `<div class="panel item"><div class="info"><strong>${city.name}: ${act.icon} ${act.label}</strong>
      <small>${PERIODS[h.period].label} &nbsp;|&nbsp; ${new Date(h.ts).toLocaleString('es-CO')}</small></div>
      <div class="btns"><span class="tag ${h.level}">${LEVEL_TEXT[h.level]}</span>
      <button class="btn-ghost" type="button" data-run-hist="${i}">Consultar de nuevo</button></div></div>`;
  }).join('');
}

function renderFavorites() {
  const list = store.get('sap_favoritos');
  const box = $('#listaFavoritos');
  if (!list.length) {
    box.innerHTML = '<div class="panel empty"><p>Aún no tienes favoritos. Toca “Guardar en favoritos” en un resultado.</p></div>';
    return;
  }
  box.innerHTML = list.map((f, i) => {
    const city = getCity(f.cityId), act = getAct(f.actId);
    if (!city || !act) return '';
    return `<div class="panel item"><div class="info"><strong>${city.name}: ${act.icon} ${act.label}</strong>
      <small>${f.date && f.hour != null ? relDay(f.date) + ' a las ' + fmtHour(f.hour) : PERIODS[f.period].label}</small></div>
      <div class="btns"><button class="btn-ghost" type="button" data-run-fav="${i}">Consultar</button>
      <button class="btn-ghost" type="button" data-del-fav="${i}">Quitar</button></div></div>`;
  }).join('');
}

/* =========================================================
   7. FLUJO: consultar, historial, favoritos, navegación
   ========================================================= */
async function runQuery(q, save = true, opts = {}) {
  const token = ++state.token;
  setSelection(q);
  setView('inicio');

  const btn = $('#btnConsultar');
  btn.disabled = true;
  $('#resultados').innerHTML = skeleton();

  try {
    const hours = await getWeather(getCity(q.cityId));
    if (token !== state.token) return;
    renderResults(q, hours, opts);
    if (save) {
      const hist = store.get('sap_historial');
      const top = hist[0];
      if (!top || top.cityId !== q.cityId || top.actId !== q.actId || top.period !== q.period) {
        hist.unshift({ ...q, ts: Date.now(), level: state.last.r.level });
        store.set('sap_historial', hist.slice(0, 20));
      }
    }
  } catch (e) {
    if (token !== state.token) return;
    $('#resultados').innerHTML = `<div class="panel error"><strong>No se pudo consultar el clima</strong>
      <p>${ERROR_TEXT[e.message] || ERROR_TEXT.network}</p>
      <button class="btn-primary" type="button" id="btnReintentar">Reintentar</button></div>`;
    state.retry = q;
  } finally {
    if (token === state.token) btn.disabled = false;
  }
}

function setView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'historial') renderHistory();
  if (name === 'favoritos') renderFavorites();
}

function toggleFav() {
  if (!state.last) return;
  const q = state.last.q, sel = favSel();
  let favs = store.get('sap_favoritos');
  favs = favs.some(f => sameFav(f, q, sel))
    ? favs.filter(f => !sameFav(f, q, sel))
    : [...favs, { cityId: q.cityId, actId: q.actId, period: q.period, date: sel.date, hour: sel.hour }];
  store.set('sap_favoritos', favs);
  updateFavButton();
}

/* Al abrir: busca el mejor plan para ahora en la ciudad por defecto */
async function autoStart() {
  const base = { cityId: 'barrancabermeja', actId: 'correr', period: 'hoy' };
  setSelection(base);
  $('#resultados').innerHTML = skeleton();
  try {
    const city = getCity(base.cityId);
    const hours = await getWeather(city);
    let period = 'hoy';
    let rank = rankActivities(hours, city, period);
    if (rank[0].score == null) { period = 'manana'; rank = rankActivities(hours, city, period); }
    runQuery({ cityId: base.cityId, actId: rank[0].act.id, period }, false, { auto: true });
  } catch {
    runQuery(base, false);
  }
}

let changeTimer;
function init() {
  renderCityChips();
  document.querySelector('input[name="ciudad"][value="barrancabermeja"]').checked = true;
  renderPlanChips('correr');

  $('#form').addEventListener('change', e => {
    if (e.target.name === 'ciudad') renderPlanChips();
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => runQuery(currentQuery()), 150);
  });
  $('#form').addEventListener('submit', e => { e.preventDefault(); runQuery(currentQuery()); });
  $('#menu').addEventListener('click', e => {
    const b = e.target.closest('.tab');
    if (b) setView(b.dataset.view);
  });

  $('#resultados').addEventListener('click', e => {
    if (e.target.closest('#btnFav')) return toggleFav();
    if (e.target.closest('#btnReintentar') && state.retry) return runQuery(state.retry, false);
    const alt = e.target.closest('[data-alt]');
    if (alt) return runQuery({ ...state.last.q, actId: alt.dataset.alt });
    const day = e.target.closest('[data-day]');
    if (day) {
      state.dayIdx = +day.dataset.day;
      const d = state.last.r.days[state.dayIdx];
      state.hour = d && d.best ? d.best.start : null;
      renderClima();
      return renderHeat();
    }
    const bar = e.target.closest('[data-hour]');
    if (bar) { state.hour = +bar.dataset.hour; renderHeat(); }
  });

  $('#detalle').addEventListener('click', e => {
    const alt = e.target.closest('[data-alt]');
    if (alt && state.last) runQuery({ ...state.last.q, actId: alt.dataset.alt });
  });

  $('#listaHistorial').addEventListener('click', e => {
    const b = e.target.closest('[data-run-hist]');
    if (!b) return;
    const { cityId, actId, period } = store.get('sap_historial')[b.dataset.runHist];
    runQuery({ cityId, actId, period });
  });
  $('#btnBorrarHistorial').addEventListener('click', () => { store.set('sap_historial', []); renderHistory(); });

  $('#listaFavoritos').addEventListener('click', e => {
    const run = e.target.closest('[data-run-fav]');
    const del = e.target.closest('[data-del-fav]');
    const favs = store.get('sap_favoritos');
    if (run) { const f = favs[run.dataset.runFav]; runQuery(f, true, f.date ? { pick: { date: f.date, hour: f.hour } } : {}); }
    if (del) { favs.splice(del.dataset.delFav, 1); store.set('sap_favoritos', favs); renderFavorites(); }
  });

  autoStart();
}

init();