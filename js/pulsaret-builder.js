/**
 * Pulsaret Builder — interactive demo showing pulsar construction
 * as multiplication of two arbitrary waveform tables (2048 samples each).
 */

const TABLE_SIZE = 2048;
const CANVAS_H = 180;

/* ── Preset waveforms ── */

/* Traced from Roads, Microsound (2001), figure 4.11e: "Cosmic pulsar waveform
   emitted by the neutron star Vela X-1." Sampled from the printed trace at 512
   points and interpolated to the table size, so the jitter of the original
   plot is kept rather than smoothed away. Not observational data. */
const VELA_X1 = [
  -0.95, -0.948, -0.945, -0.937, -0.911, -0.879, -0.865, -0.859, -0.799, -0.782, -0.766, -0.749,
  -0.712, -0.686, -0.68, -0.667, -0.634, -0.621, -0.617, -0.59, -0.555, -0.521, -0.472, -0.484,
  -0.478, -0.426, -0.383, -0.385, -0.337, -0.263, -0.255, -0.179, -0.175, -0.172, -0.169,
  -0.132, -0.133, -0.118, -0.088, -0.078, -0.021, -0.015, -0.009, 0.022, 0.031, 0.037, 0.048,
  0.07, 0.07, 0.104, 0.109, 0.111, 0.139, 0.161, 0.191, 0.207, 0.218, 0.269, 0.324, 0.338,
  0.348, 0.412, 0.412, 0.445, 0.464, 0.468, 0.481, 0.52, 0.529, 0.533, 0.585, 0.589, 0.6, 0.607,
  0.607, 0.637, 0.64, 0.647, 0.659, 0.672, 0.672, 0.681, 0.689, 0.689, 0.693, 0.696, 0.699,
  0.702, 0.702, 0.698, 0.689, 0.68, 0.68, 0.647, 0.637, 0.636, 0.646, 0.646, 0.638, 0.637,
  0.635, 0.611, 0.521, 0.488, 0.456, 0.394, 0, -0.003, -0.174, -0.441, -0.437, -0.569, -0.583,
  -0.598, -0.662, -0.662, -0.713, -0.73, -0.736, -0.749, -0.745, -0.754, -0.762, -0.762, -0.749,
  -0.733, -0.727, -0.727, -0.701, -0.701, -0.691, -0.68, -0.68, -0.671, -0.671, -0.686, -0.732,
  -0.71, -0.71, -0.71, -0.709, -0.701, -0.68, -0.677, -0.669, -0.645, -0.645, -0.63, -0.619,
  -0.606, -0.606, -0.547, -0.543, -0.523, -0.424, -0.39, -0.342, -0.327, -0.324, -0.29, -0.154,
  -0.151, -0.137, -0.008, 0.005, 0.011, 0.039, 0.104, 0.113, 0.169, 0.222, 0.276, 0.351, 0.412,
  0.415, 0.43, 0.477, 0.494, 0.528, 0.533, 0.534, 0.563, 0.572, 0.597, 0.613, 0.624, 0.641,
  0.659, 0.663, 0.663, 0.68, 0.68, 0.695, 0.706, 0.706, 0.719, 0.722, 0.729, 0.741, 0.749,
  0.757, 0.76, 0.762, 0.762, 0.762, 0.762, 0.759, 0.749, 0.749, 0.742, 0.739, 0.736, 0.736,
  0.735, 0.728, 0.719, 0.696, 0.689, 0.688, 0.672, 0.672, 0.628, 0.589, 0.589, 0.516, 0.516,
  0.496, 0.442, 0.303, 0.303, 0.256, 0.203, 0.2, 0.114, 0.013, -0.112, -0.376, -0.385, -0.385,
  -0.479, -0.606, -0.606, -0.696, -0.755, -0.789, -0.796, -0.796, -0.849, -0.879, -0.909,
  -0.909, -0.953, -0.957, -0.961, -0.983, -0.983, -0.993, -0.996, -0.996, -1, -0.996, -0.987,
  -0.975, -0.957, -0.957, -0.944, -0.938, -0.935, -0.879, -0.83, -0.802, -0.775, -0.74, -0.69,
  -0.659, -0.645, -0.645, -0.623, -0.605, -0.596, -0.586, -0.558, -0.538, -0.504, -0.479,
  -0.454, -0.385, -0.385, -0.367, -0.336, -0.285, -0.265, -0.217, -0.181, -0.177, -0.16, -0.157,
  -0.143, -0.117, -0.112, -0.068, -0.042, -0.021, -0.021, 0.029, 0.031, 0.035, 0.048, 0.044,
  0.071, 0.078, 0.085, 0.117, 0.121, 0.136, 0.163, 0.225, 0.225, 0.32, 0.334, 0.334, 0.373,
  0.423, 0.43, 0.444, 0.49, 0.49, 0.497, 0.517, 0.55, 0.555, 0.555, 0.591, 0.62, 0.62, 0.628,
  0.641, 0.646, 0.646, 0.663, 0.663, 0.672, 0.68, 0.685, 0.693, 0.696, 0.7, 0.706, 0.723, 0.72,
  0.713, 0.706, 0.697, 0.68, 0.68, 0.672, 0.641, 0.641, 0.652, 0.656, 0.659, 0.659, 0.494,
  0.494, 0.493, 0.489, 0.334, 0.104, 0.026, -0.006, -0.065, -0.445, -0.463, -0.483, -0.641,
  -0.658, -0.681, -0.688, -0.69, -0.727, -0.739, -0.754, -0.765, -0.758, -0.758, -0.748, -0.745,
  -0.744, -0.723, -0.723, -0.711, -0.697, -0.697, -0.68, -0.671, -0.667, -0.667, -0.714, -0.714,
  -0.711, -0.706, -0.706, -0.689, -0.688, -0.685, -0.667, -0.649, -0.642, -0.636, -0.627,
  -0.623, -0.552, -0.545, -0.536, -0.48, -0.476, -0.427, -0.382, -0.316, -0.316, -0.278, -0.165,
  -0.071, -0.143, -0.126, -0.033, 0.006, 0.009, 0.035, 0.109, 0.122, 0.13, 0.204, 0.27, 0.282,
  0.305, 0.377, 0.42, 0.49, 0.503, 0.505, 0.537, 0.541, 0.565, 0.583, 0.594, 0.628, 0.649,
  0.654, 0.654, 0.663, 0.667, 0.679, 0.689, 0.689, 0.71, 0.727, 0.732, 0.732, 0.745, 0.753,
  0.76, 0.767, 0.767, 0.784, 0.784, 0.78, 0.767, 0.762, 0.755, 0.752, 0.749, 0.745, 0.741,
  0.741, 0.737, 0.723, 0.723, 0.716, 0.713, 0.71, 0.676, 0.676, 0.618, 0.581, 0.581, 0.525,
  0.472, 0.459, 0.459, 0.377, 0.302, 0.297, 0.283, 0.2, -0.005, -0.028, -0.093, -0.225, -0.389,
  -0.389, -0.502, -0.615, -0.623, -0.713, -0.76, -0.781, -0.788, -0.831, -0.882, -0.907, -0.931
];

const wavePresets = {
  sine: () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = Math.sin(2 * Math.PI * i / TABLE_SIZE);
    return t;
  },
  cosine: () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = Math.cos(2 * Math.PI * i / TABLE_SIZE);
    return t;
  },
  triangle: () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
      const p = i / TABLE_SIZE;
      t[i] = p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : -4 + 4 * p;
    }
    return t;
  },
  sawtooth: () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = 2 * (i / TABLE_SIZE) - 1;
    return t;
  },
  square: () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = i < TABLE_SIZE / 2 ? 1 : -1;
    return t;
  },
  'vela X-1': () => {
    const t = new Float32Array(TABLE_SIZE);
    const last = VELA_X1.length - 1;
    for (let i = 0; i < TABLE_SIZE; i++) {
      const p = i / TABLE_SIZE * last;
      const j = Math.floor(p);
      const f = p - j;
      t[i] = VELA_X1[j] * (1 - f) + VELA_X1[Math.min(last, j + 1)] * f;
    }
    return t;
  },
  'harmonics 1-5': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
      for (let h = 1; h <= 5; h++) t[i] += Math.sin(2 * Math.PI * h * i / TABLE_SIZE) / h;
    }
    const max = t.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    if (max > 0) for (let i = 0; i < TABLE_SIZE; i++) t[i] /= max;
    return t;
  },
  'harmonics 1-10': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
      for (let h = 1; h <= 10; h++) t[i] += Math.sin(2 * Math.PI * h * i / TABLE_SIZE) / h;
    }
    const max = t.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    if (max > 0) for (let i = 0; i < TABLE_SIZE; i++) t[i] /= max;
    return t;
  },
  'odd harmonics': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
      for (let h = 1; h <= 9; h += 2) t[i] += Math.sin(2 * Math.PI * h * i / TABLE_SIZE) / h;
    }
    const max = t.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    if (max > 0) for (let i = 0; i < TABLE_SIZE; i++) t[i] /= max;
    return t;
  },
  'sine 2 cycles': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = Math.sin(2 * Math.PI * 2 * i / TABLE_SIZE);
    return t;
  },
  'sine 3 cycles': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = Math.sin(2 * Math.PI * 3 * i / TABLE_SIZE);
    return t;
  },
  'sine 5 cycles': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = Math.sin(2 * Math.PI * 5 * i / TABLE_SIZE);
    return t;
  },
  'sine 8 cycles': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = Math.sin(2 * Math.PI * 8 * i / TABLE_SIZE);
    return t;
  },
  noise: () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = Math.random() * 2 - 1;
    return t;
  },
  'filtered noise': () => {
    // generate noise then smooth with a simple moving average
    const t = new Float32Array(TABLE_SIZE);
    const raw = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) raw[i] = Math.random() * 2 - 1;
    const w = 32;
    for (let i = 0; i < TABLE_SIZE; i++) {
      let sum = 0;
      for (let j = -w; j <= w; j++) sum += raw[(i + j + TABLE_SIZE) % TABLE_SIZE];
      t[i] = sum / (2 * w + 1);
    }
    const max = t.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    if (max > 0) for (let i = 0; i < TABLE_SIZE; i++) t[i] /= max;
    return t;
  },
};

const envPresets = {
  gaussian: () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
      const x = (i - TABLE_SIZE / 2) / (TABLE_SIZE / 6);
      t[i] = Math.exp(-0.5 * x * x);
    }
    return t;
  },
  'raised cosine': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
      t[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / TABLE_SIZE));
    }
    return t;
  },
  'exp. decay': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
      t[i] = Math.exp(-5 * i / TABLE_SIZE);
    }
    return t;
  },
  'perc. (fast attack)': () => {
    const t = new Float32Array(TABLE_SIZE);
    const atk = TABLE_SIZE * 0.05;
    for (let i = 0; i < TABLE_SIZE; i++) {
      t[i] = i < atk ? i / atk : Math.exp(-4 * (i - atk) / (TABLE_SIZE - atk));
    }
    return t;
  },
  /* Completing the catalogue of Roads, Microsound (2001), fig. 4.12:
     (c) linear decay, (e) linear attack, (f) exponential attack,
     (g) FOF, (h) bipolar modulator. The table spans one pulsaret, so the
     duty cycle d is the whole table. */
  'linear decay': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = 1 - i / (TABLE_SIZE - 1);
    return t;
  },
  'linear attack': () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = i / (TABLE_SIZE - 1);
    return t;
  },
  'exp. attack': () => {
    const t = new Float32Array(TABLE_SIZE);
    // Mirror of exp. decay: the term determines the steepness of the curve.
    for (let i = 0; i < TABLE_SIZE; i++) {
      t[i] = Math.exp(-5 * (1 - i / TABLE_SIZE));
    }
    return t;
  },
  'FOF': () => {
    const t = new Float32Array(TABLE_SIZE);
    // A sharp attack followed by an exponential decay, as in FOF and VOSIM.
    const atk = TABLE_SIZE * 0.08;
    for (let i = 0; i < TABLE_SIZE; i++) {
      t[i] = i < atk
        ? 0.5 * (1 - Math.cos(Math.PI * i / atk))
        : Math.exp(-4.5 * (i - atk) / (TABLE_SIZE - atk));
    }
    return t;
  },
  'bipolar modulator': () => {
    const t = new Float32Array(TABLE_SIZE);
    // Not an amplitude contour but a ring modulator: the envelope is signed.
    for (let i = 0; i < TABLE_SIZE; i++) {
      t[i] = Math.sin(2 * Math.PI * 4 * i / TABLE_SIZE);
    }
    return t;
  },
  trapezoid: () => {
    const t = new Float32Array(TABLE_SIZE);
    const r = TABLE_SIZE * 0.15;
    for (let i = 0; i < TABLE_SIZE; i++) {
      if (i < r) t[i] = i / r;
      else if (i > TABLE_SIZE - r) t[i] = (TABLE_SIZE - i) / r;
      else t[i] = 1;
    }
    return t;
  },
  rectangular: () => {
    const t = new Float32Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) t[i] = 1;
    return t;
  }
};

/* ── Canvas drawing and rendering ── */

function drawTable(canvas, data, colour) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  const drawW = w / dpr;
  const drawH = h / dpr;

  // plot area margins
  const padL = 20;
  const padR = 4;
  const padT = 10;
  const padB = 16;
  const plotW = drawW - padL - padR;
  const plotH = drawH - padT - padB;
  const midY = padT + plotH / 2;

  ctx.clearRect(0, 0, w, h);

  // zero line
  ctx.strokeStyle = '#d4d8dc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, midY);
  ctx.lineTo(padL + plotW, midY);
  ctx.stroke();

  // axis labels
  ctx.fillStyle = '#999';
  ctx.font = 'italic 9px "Riforma LL", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', padL - 4, padT + 2);
  ctx.fillText('0', padL - 4, midY);
  ctx.fillText('\u22121', padL - 4, padT + plotH - 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('t', padL + plotW / 2, drawH - 12);

  // waveform
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < TABLE_SIZE; i++) {
    const x = padL + (i / (TABLE_SIZE - 1)) * plotW;
    const y = midY - data[i] * (plotH / 2 - 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = CANVAS_H * dpr;
  canvas.style.height = CANVAS_H + 'px';
  canvas.getContext('2d').scale(dpr, dpr);
}

function enableDrawing(canvas, data, colour, onUpdate) {
  let drawing = false;
  let lastX = -1;

  function sampleFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y, w: rect.width, h: rect.height };
  }

  function paint(pos) {
    // map mouse coordinates to plot area (accounting for axis label margins)
    const padL = 20, padR = 4, padT = 10, padB = 16;
    const plotW = pos.w - padL - padR;
    const plotH = pos.h - padT - padB;
    const relX = (pos.x - padL) / plotW;
    const relY = (pos.y - padT) / plotH;
    const idx = Math.round(relX * (TABLE_SIZE - 1));
    const val = 1 - 2 * relY;
    const clamped = Math.max(-1, Math.min(1, val));

    if (lastX >= 0 && Math.abs(idx - lastX) > 1) {
      // interpolate between last and current to avoid gaps
      const step = idx > lastX ? 1 : -1;
      const lastVal = data[Math.max(0, Math.min(TABLE_SIZE - 1, lastX))];
      const steps = Math.abs(idx - lastX);
      for (let s = 0; s <= steps; s++) {
        const i = Math.max(0, Math.min(TABLE_SIZE - 1, lastX + s * step));
        data[i] = lastVal + (clamped - lastVal) * (s / steps);
      }
    } else {
      const i = Math.max(0, Math.min(TABLE_SIZE - 1, idx));
      data[i] = clamped;
    }
    lastX = idx;
  }

  function onDown(e) {
    e.preventDefault();
    drawing = true;
    lastX = -1;
    paint(sampleFromEvent(e));
    drawTable(canvas, data, colour);
    onUpdate();
  }

  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    paint(sampleFromEvent(e));
    drawTable(canvas, data, colour);
    onUpdate();
  }

  function onUp() {
    drawing = false;
    lastX = -1;
  }

  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);
}

/* ── Widget initialisation ── */

function initBuilder(el) {
  const waveCanvas = el.querySelector('.builder-canvas-wave');
  const envCanvas = el.querySelector('.builder-canvas-env');
  const resultCanvas = el.querySelector('.builder-canvas-result');
  const waveSelect = el.querySelector('.builder-select-wave');
  const envSelect = el.querySelector('.builder-select-env');

  // data arrays
  let waveData = new Float32Array(TABLE_SIZE);
  let envData = new Float32Array(TABLE_SIZE);
  const resultData = new Float32Array(TABLE_SIZE);

  function updateResult() {
    for (let i = 0; i < TABLE_SIZE; i++) resultData[i] = waveData[i] * envData[i];
    drawTable(resultCanvas, resultData, '#000000');
    // notify listeners (e.g. synth demo) that tables changed
    el.dispatchEvent(new CustomEvent('pulsaret-update', { bubbles: true }));
  }

  function loadWavePreset(name) {
    const gen = wavePresets[name];
    if (!gen) return;
    const d = gen();
    for (let i = 0; i < TABLE_SIZE; i++) waveData[i] = d[i];
    drawTable(waveCanvas, waveData, '#000000');
    updateResult();
  }

  function loadEnvPreset(name) {
    const gen = envPresets[name];
    if (!gen) return;
    const d = gen();
    for (let i = 0; i < TABLE_SIZE; i++) envData[i] = d[i];
    drawTable(envCanvas, envData, '#000000');
    updateResult();
  }

  // setup canvases
  setupCanvas(waveCanvas);
  setupCanvas(envCanvas);
  setupCanvas(resultCanvas);

  // handle resize
  const resizeObs = new ResizeObserver(() => {
    setupCanvas(waveCanvas);
    setupCanvas(envCanvas);
    setupCanvas(resultCanvas);
    drawTable(waveCanvas, waveData, '#000000');
    drawTable(envCanvas, envData, '#000000');
    updateResult();
  });
  resizeObs.observe(el);

  // populate dropdowns
  Object.keys(wavePresets).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    waveSelect.appendChild(opt);
  });

  Object.keys(envPresets).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    envSelect.appendChild(opt);
  });

  // dropdown events
  waveSelect.addEventListener('change', () => loadWavePreset(waveSelect.value));
  envSelect.addEventListener('change', () => loadEnvPreset(envSelect.value));

  // drawing
  enableDrawing(waveCanvas, waveData, '#000000', updateResult);
  enableDrawing(envCanvas, envData, '#000000', updateResult);

  // expose data for other components (e.g. synth demo)
  el._pulsaretData = { wave: waveData, env: envData };

  // Initial state: a different pair each session, so the first sound heard is
  // not always the same one. Drawn from the catalogues rather than generated,
  // so whatever comes up is a shape the entry discusses.
  const pick = names => names[Math.floor(Math.random() * names.length)];
  const startWave = pick(Object.keys(wavePresets));
  const startEnv = pick(Object.keys(envPresets));
  loadWavePreset(startWave);
  loadEnvPreset(startEnv);
  waveSelect.value = startWave;
  envSelect.value = startEnv;
}

/* ── Bootstrap ── */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pulsaret-builder').forEach(initBuilder);
});
