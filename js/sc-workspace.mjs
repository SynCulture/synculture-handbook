import { examples } from './sc-examples.mjs';
import { splitStatements, describeStatement, statementLabel } from './sc-cell-split.mjs';

const $ = selector => document.querySelector(selector);
const channel = 'handbook-sc';
// Phone-width layout for the cells. Read once at construction: CodeMirror's
// lineWrapping and lineNumbers are set per editor, and a reader who rotates a
// phone mid-session is better served by a stable cell than a relaid-out one.
const NARROW = window.matchMedia('(max-width: 700px)');
// v3: a second reader was added between the tables and the line-wise cell, and
// the tables now publish the buffer they came from so their plots can be drawn
// on. Drafts of the earlier cut would shadow both.
const draftKey = 'synculture.sc-workspace.v3';
const editors = new Map();
let iframe, session, startupTimer, ready = false, starting = false, muted = false;
let postText = '';
let saveTimer;
let nodeId = -1;
let scopeFrame = 0;
let waveBuffer = -1, envelopeBuffer = -1, tableFrame = 0;
const curves = new Map();
// The range a table was generated in, held rather than recomputed: drawing
// reshapes a table within the range its procedure set, and a plot that rescaled
// under the pointer would move the values already drawn.
const curveRanges = new Map();
// Where a plotted table lives on the server, so a drawn value can be written
// back into it: the buffer, and the stride the plotted points were sampled at.
const curveTargets = new Map();
const curvesDrawn = new Set();
// One traversal per table, keyed by name; the key '*' covers all four.
const loops = new Map();
let loopFrame = 0;
let lastSamples = [], lastPeak = 0;
let monitor = null, monitorFrame = 0;
let veil = null;

CodeMirror.defineSimpleMode('sclang', {
  start: [
    { regex: /\/\*/, token: 'comment', next: 'comment' },
    { regex: /\/\/.*/, token: 'comment' },
    { regex: /"(?:[^\\"]|\\.)*(?:"|$)/, token: 'string' },
    { regex: /'(?:[^\\']|\\.)*(?:'|$)|\\[\w]+/, token: 'string-2' },
    { regex: /\b(?:var|arg|classvar|this|super|nil|true|false|inf)\b/, token: 'keyword' },
    { regex: /\b[A-Z]\w*/, token: 'type' },
    { regex: /~\w+/, token: 'variable-2' },
    { regex: /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, token: 'number' },
  ],
  comment: [{ regex: /.*?\*\//, token: 'comment', next: 'start' }, { regex: /.*/, token: 'comment' }],
});

function send(type, detail = {}) {
  iframe?.contentWindow?.postMessage({ channel, token: session, type, ...detail }, location.origin);
}
function message(text, error = false) {
  $('#session-message').textContent = text;
  $('#session-message').dataset.error = String(error);
}
function post(text) {
  postText = (postText + text + '\n').slice(-50000);
  const output = $('#post-output');
  const atBottom = output.scrollTop + output.clientHeight >= output.scrollHeight - 30;
  output.textContent = postText;
  if (atBottom) output.scrollTop = output.scrollHeight;
  if (/ERROR|FAILURE|syntax error/i.test(text)) $('#post-announcement').textContent = 'SuperCollider reported an error. Check the post window.';
}
function status(target, state) {
  $(`#${target}-status`).textContent = state;
  $(`#${target}-dot`).dataset.state = state;
}
function setReady(value) {
  ready = value;
  updateVeil();
  if (!value) {
    document.querySelectorAll('.cell-evaluate').forEach(button => {
      setEvaluateLabel(button, button.dataset.cell || '', false);
    });
  }
  document.querySelectorAll('.cell-evaluate').forEach(button => { button.disabled = !value; });
  if ($('#instrument-controls')) $('#instrument-controls').disabled = !value;
}
// A line-wise cell is a run of separate things to try rather than one program,
// so it is built as one box per statement, each with its own button. Everything
// downstream — drafts, reset, the download — works in these units, which for an
// ordinary cell is just the cell itself.
function unitsOf(example, number) {
  if (example.lineByLine !== true) {
    return [{ id: example.id, code: example.code, label: number,
              title: example.title, note: '' }];
  }
  return splitStatements(example.code).map((block, i) => {
    const { note, code } = describeStatement(block);
    return {
      id: `${example.id}#${i + 1}`,
      code,
      label: statementLabel(number, i),
      title: `${example.title} (${i + 1})`,
      note,
    };
  });
}
const allUnits = examples.flatMap((example, index) =>
  unitsOf(example, String(index + 1).padStart(2, '0')));
const unitTitles = new Map(allUnits.map(unit => [unit.id, unit.title]));

// A draft records the published source it was made from, so a cell can say
// when the published version has moved on rather than silently shadowing it.
const published = new Map(allUnits.map(unit => [unit.id, unit.code]));
const cellLabels = new Map();
function saveDrafts() {
  // Only cells that actually differ are stored. Snapshotting untouched cells
  // would shadow the published source for good, since this runs on unload.
  const stored = {};
  for (const [id, editor] of editors) {
    const code = editor.getValue();
    if (code !== published.get(id)) stored[id] = { code, base: published.get(id) };
  }
  try {
    localStorage.setItem(draftKey, JSON.stringify(stored));
    for (const [id, label] of cellLabels) {
      label.textContent = stored[id] ? 'Saved locally' : 'Published source';
    }
  } catch {
    for (const label of cellLabels.values()) label.textContent = 'Not saved · download source';
  }
}
let drafts = {};
try { drafts = JSON.parse(localStorage.getItem(draftKey) || '{}') || {}; } catch { /* Published source remains available. */ }
// Older drafts were stored as bare strings, with no record of their origin.
const draftOf = id => {
  const stored = drafts[id];
  if (typeof stored === 'string') return { code: stored, base: null };
  if (stored && typeof stored.code === 'string') return stored;
  return null;
};
// A draft identical to the source it was made from is not an edit: it is a
// snapshot left by an earlier version that saved every cell on unload. Discard
// those, so a reader is never silently held on a stale published example.
//
// Discard superseded drafts on load too. A draft whose base no longer matches
// the published code was made from a cell that has since been rewritten, and it
// would shadow the new source on every load until reset by hand. Drafts made
// from the current source are kept: an edit that is still current is the
// reader's work, not staleness. Legacy drafts stored as bare strings carry no
// base, so they count as superseded and go.
const superseded = new Set();
for (const id of Object.keys(drafts)) {
  const stored = draftOf(id);
  if (!stored || stored.code === stored.base) { delete drafts[id]; continue; }
  if (stored.base !== published.get(id)) { delete drafts[id]; superseded.add(id); }
}
// Write the pruned set back now rather than waiting for the next save, so a
// discarded draft cannot return if the page is closed without an edit.
try { localStorage.setItem(draftKey, JSON.stringify(drafts)); } catch { /* Published source remains available. */ }

// SuperCollider's rule, as in the desktop editor: a selection wins; failing
// that, the region, meaning the innermost block whose parentheses each sit at
// the start of a line; failing that, the line the cursor is on. A region is
// how a multi-line expression is evaluated as one thing.
function regionAt(editor, line) {
  let open = -1, depth = 0;
  for (let i = 0; i <= line; i++) {
    const text = editor.getLine(i) ?? '';
    if (depth === 0 && text.startsWith('(')) { open = i; depth = 1; continue; }
    if (depth > 0) {
      for (const ch of text) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      if (depth <= 0) { if (i >= line) return { from: open, to: i }; open = -1; depth = 0; }
    }
  }
  if (open < 0) return null;
  // The cursor sits inside an unclosed block: run to its closing line.
  for (let i = line + 1; i < editor.lineCount(); i++) {
    for (const ch of editor.getLine(i)) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    if (depth <= 0) return { from: open, to: i };
  }
  return null;
}
function selectionFor(editor) {
  if (editor.somethingSelected()) return { code: editor.getSelection(), what: 'selection' };
  const line = editor.getCursor().line;
  const region = regionAt(editor, line);
  if (region) {
    return {
      code: editor.getRange({ line: region.from, ch: 0 }, { line: region.to + 1, ch: 0 }),
      what: `region, lines ${region.from + 1} to ${region.to + 1}`,
      mark: region,
    };
  }
  return { code: editor.getLine(line), what: `line ${line + 1}`, mark: { from: line, to: line } };
}
// A brief flash on what ran, so evaluating a line in a long cell is visible.
function flashRegion(editor, mark) {
  if (!mark) return;
  const handles = [];
  for (let i = mark.from; i <= mark.to; i++) handles.push(editor.addLineClass(i, 'background', 'cell-ran'));
  setTimeout(() => handles.forEach((h, i) => editor.removeLineClass(mark.from + i, 'background', 'cell-ran')), 280);
}

function evaluate(editor, number, button, whole = false) {
  if (!ready) { message('Start the session before evaluating code.'); return; }
  flushParameters();
  const picked = whole
    ? { code: editor.getValue(), what: 'cell' }
    : selectionFor(editor);
  const code = picked.code;
  if (!code.trim()) return;
  if (!whole) flashRegion(editor, picked.mark);
  post(`\n[${number}] Evaluate ${picked.what}`);
  send('evaluate', { code });
  // Once a cell has run, say so: re-running is a different act from running.
  if (button) setEvaluateLabel(button, number, true);
}
// The accessible name tracks the visible label, so the two never diverge.
function setEvaluateLabel(button, number, evaluated) {
  const word = evaluated ? 'Re-evaluate' : 'Evaluate';
  button.innerHTML = `${word} <span aria-hidden="true">\u2197</span>`;
  button.setAttribute('aria-label', `${word} cell ${number}`);
  button.dataset.evaluated = String(Boolean(evaluated));
}

examples.forEach((example, index) => {
  // A page places only the cells it wants; numbering still follows the list.
  const host = $(`[data-code-cell="${example.id}"]`);
  if (!host) return;
  const number = String(index + 1).padStart(2, '0');
  const units = unitsOf(example, number);
  const sounds = example.sounds === true;
  const built = [];

  units.forEach((unit, position) => {
    const first = position === 0;
    const cell = document.createElement('section');
    cell.className = 'code-cell' + (units.length > 1 ? ' code-cell--step' : '');
    cell.setAttribute('aria-labelledby', `cell-title-${example.id}-${position}`);
    // Say in advance whether a cell sounds: the silent ones compile or build,
    // and a reader who expects audio from them will think something is broken.
    // Said once per cell, on the first box, not once per statement.
    const flag = first
      ? `<span class="cell-sound" data-sounds="${sounds}">${sounds ? 'makes sound' : 'no sound'}</span>`
      : '';
    cell.innerHTML = `<header class="cell-header"><span class="cell-number">${unit.label}</span><h3 id="cell-title-${example.id}-${position}"></h3>${flag}<button class="cell-evaluate" disabled>Evaluate <span aria-hidden="true">↗</span></button></header><p class="cell-description"></p><textarea></textarea><footer class="cell-footer"><button class="cell-reset">Reset source</button><span class="cell-keys"><kbd>⇧ ⏎</kbd> selection, block or line &middot; <kbd>⇧ ⌘/Ctrl ⏎</kbd> whole cell</span><span class="cell-saved">Published source</span></footer>`;
    // The heading is the cell's, said once; a statement carries its own note.
    cell.querySelector('h3').textContent = first ? example.title : '';
    const description = cell.querySelector('.cell-description');
    if (first && units.length > 1) {
      description.textContent = `${example.description} Each box below runs on its own: change a value and press Evaluate again.`;
    } else if (first) {
      description.textContent = example.description;
    } else {
      description.textContent = unit.note;
    }
    if (!first && unit.note) description.classList.add('cell-step-note');
    if (first && units.length > 1 && unit.note) {
      const note = document.createElement('p');
      note.className = 'cell-description cell-step-note';
      note.textContent = unit.note;
      description.after(note);
    }

    const evaluateButton = cell.querySelector('.cell-evaluate');
    const textarea = cell.querySelector('textarea');
    const draft = draftOf(unit.id);
    textarea.value = draft ? draft.code : unit.code;
    textarea.setAttribute('aria-label', `Cell ${unit.label}: ${unit.title}`);
    built.push(cell);

    // Appended to the document before CodeMirror measures it, which it cannot
    // do from a detached node.
    if (first) host.replaceChildren(cell); else host.append(cell);

    const editor = CodeMirror.fromTextArea(textarea, {
      mode: 'sclang', matchBrackets: true,
      // Narrow viewports wrap: a phone cannot scroll a cell sideways and read the
      // prose around it at the same time. Line numbers go with it — at 390px they
      // cost a tenth of the column and say nothing the wrapped text does not.
      indentUnit: 4, tabSize: 4, lineWrapping: NARROW.matches,
      lineNumbers: !NARROW.matches, viewportMargin: 20,
      extraKeys: {
        'Shift-Enter': () => evaluate(editor, unit.label, evaluateButton),
        'Ctrl-Enter': () => evaluate(editor, unit.label, evaluateButton),
        'Cmd-Enter': () => evaluate(editor, unit.label, evaluateButton),
        'Shift-Ctrl-Enter': () => evaluate(editor, unit.label, evaluateButton, true),
        'Shift-Cmd-Enter': () => evaluate(editor, unit.label, evaluateButton, true),
      },
    });
    editor.getInputField().setAttribute('aria-label', `Cell ${unit.label}: ${unit.title}`);
    editors.set(unit.id, editor);

    evaluateButton.setAttribute('aria-label', `Evaluate cell ${unit.label}`);
    evaluateButton.dataset.cell = unit.label;
    evaluateButton.onclick = () => evaluate(editor, unit.label, evaluateButton, true);

    const reset = cell.querySelector('.cell-reset');
    reset.setAttribute('aria-label', `Reset cell ${unit.label}`);
    reset.onclick = () => {
      if (editor.getValue() !== unit.code && !confirm(`Restore the published source in cell ${unit.label}? This replaces your edits in this cell.`)) return;
      editor.setValue(unit.code); saveDrafts();
    };
    // Pruning leaves only drafts made from the source now on the page, so a
    // surviving draft is never stale. A cell whose draft was dropped says so:
    // the code in front of the reader changed between one load and the next, and
    // that should be stated rather than discovered.
    if (draft) {
      cell.querySelector('.cell-saved').textContent = 'Restored local draft';
    } else if (superseded.has(unit.id)) {
      cell.querySelector('.cell-saved').dataset.stale = 'true';
      cell.querySelector('.cell-saved').textContent = 'Published source · this example was rewritten, your older draft was dropped';
    }
    cellLabels.set(unit.id, cell.querySelector('.cell-saved'));
    editor.on('change', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveDrafts, 400);
    });
  });
});

function startSession() {
  if (starting) return;
  if (!crossOriginIsolated) { message('Open this local preview using npm run preview. The language runtime needs isolation headers.', true); return; }
  iframe?.remove();
  resetParameters();
  nodeId = -1; waveBuffer = -1; envelopeBuffer = -1;
  drawScope([], 0); $('#sample-rate').textContent = 'Server offline';
  clearTimeout(startupTimer);
  starting = true;
  setReady(false);
  session = crypto.randomUUID();
  status('language', 'loading'); status('server', 'loading');
  $('#start-session').disabled = true;
  $('#start-session').textContent = 'Starting…';
  $('#restart-session').disabled = false;
  $('#stop-all').disabled = false;
  message('Loading the language and synthesis engine. The first start can take a few moments.');
  post('Starting a new browser-local SuperCollider session…');
  iframe = document.createElement('iframe');
  iframe.title = 'SuperCollider language and synthesis runtime';
  iframe.src = `/handbook/runtime/?session=${session}`;
  iframe.allow = 'autoplay';
  $('#runtime-host').replaceChildren(iframe);
  // Four minutes, not one. Ten megabytes of WebAssembly over a phone connection
  // can spend a minute downloading before a line of it is compiled, and the old
  // limit was cutting off starts that were merely slow. The post window says
  // where it has got to, so a wait is legible rather than blank.
  startupTimer = setTimeout(() => failed('Session startup timed out. Restart to try again; your source edits are preserved.'), 240000);
}

function failed(text) {
  clearTimeout(startupTimer);
  starting = false; setReady(false); nodeId = -1; waveBuffer = -1; envelopeBuffer = -1;
  status('language', 'error'); status('server', 'error');
  message(text, true); post(`Runtime error: ${text}`);
  iframe?.remove(); iframe = null;
  drawScope([], 0); $('#sample-rate').textContent = 'Server offline';
  $('#start-session').textContent = 'Start session ↗';
  $('#start-session').disabled = false;
  $('#stop-all').disabled = true;
}

addEventListener('message', event => {
  const data = event.data;
  if (event.source !== iframe?.contentWindow || event.origin !== location.origin || data?.channel !== channel || data.token !== session) return;
  if (data.type === 'post') post(data.text);
  else if (data.type === 'status') status(data.target, data.state);
  else if (data.type === 'ready') {
    clearTimeout(startupTimer); starting = false; setReady(true);
    status('language', 'ready'); status('server', 'ready');
    $('#start-session').textContent = 'Session ready';
    message('Session ready. Draw the pulsaret above, evaluate 01 to compile the instrument, then 02 to play it.');
    post('Language and synthesis server ready.');
    send('master', { value: Number($('#master-volume').value) });
    send('mute', { value: muted });
  } else if (data.type === 'audio-blocked') {
    // iOS will not resume an AudioContext created outside a user gesture, and
    // scsynth is the worklet on that context, so the server cannot boot until
    // someone taps. The tap has to land in the runtime frame, which is the
    // document holding the context, so that frame is shown.
    const host = $('#runtime-host');
    if (host) { host.hidden = false; host.dataset.unlock = 'true'; }
    message('One more tap: iOS will not start audio without it.');
    post('Audio is blocked until the engine is tapped.');
  } else if (data.type === 'audio-unblocked') {
    const host = $('#runtime-host');
    if (host) { host.hidden = true; delete host.dataset.unlock; }
    message('Starting the synthesis server…');
  } else if (data.type === 'error') failed(data.message);
  else if (data.type === 'node') nodeId = Number(data.id);
  else if (data.type === 'curve') receiveCurve(data);
  else if (data.type === 'loop') setLoop(data.looptime, data.name);
  else if (data.type === 'buffers') {
    waveBuffer = Number(data.wave); envelopeBuffer = Number(data.envelope);
    sendTables();
  }
  else if (data.type === 'scope') {
    lastSamples = data.samples; lastPeak = data.peak;
    if (!scopeFrame) scopeFrame = requestAnimationFrame(() => { scopeFrame = 0; drawScope(); });
  }
  else if (data.type === 'audio') {
    $('#sample-rate').textContent = `Sample rate ${(data.sampleRate / 1000).toFixed(1)} kHz`;
    if (data.state === 'suspended') {
      $('#start-session').textContent = 'Enable audio';
      $('#start-session').disabled = false;
      message('The browser paused audio. Click Enable audio to resume.');
    } else if (data.state === 'running' && ready) {
      $('#start-session').textContent = 'Session ready'; $('#start-session').disabled = true;
    }
  } else if (data.type === 'muted') setMute(data.value);
});

$('#start-session').onclick = () => ready ? send('resume') : startSession();
$('#restart-session').onclick = () => { saveDrafts(); starting = false; startSession(); };
function stopAll() {
  if (!iframe) return;
  resetParameters();
  setLoop(null);
  send('stop'); setMute(true);
  post('Stop all requested; output muted.');
  message('Stopped and muted. Unmute output before listening again. Restart if the interpreter is unresponsive.');
}
$('#stop-all').onclick = stopAll;
addEventListener('keydown', event => {
  if (event.key === '.' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); stopAll(); }
});
function setMute(value) {
  muted = value;
  $('#mute-output').setAttribute('aria-pressed', String(value));
  $('#mute-output').textContent = value ? 'Unmute' : 'Mute';
  send('mute', { value });
}
$('#mute-output').onclick = () => setMute(!muted);
$('#master-volume').oninput = event => {
  const value = Number(event.target.value);
  $('#master-value').textContent = `${Math.round(value * 100)}%`;
  send('master', { value });
};
// The builder owns pulsaret construction. Its two tables are written straight
// into the session buffers as they are drawn, coalesced to one frame.
const builder = $('.pulsaret-builder');
function sendTables() {
  tableFrame = 0;
  if (waveBuffer < 0 || !builder?._pulsaretData) return;
  send('table', { buffer: waveBuffer, values: builder._pulsaretData.wave });
  send('table', { buffer: envelopeBuffer, values: builder._pulsaretData.env });
}
addEventListener('pulsaret-update', () => {
  if (!tableFrame) tableFrame = requestAnimationFrame(sendTables);
});

// Slider values travel as OSC to the named node. Coalescing to one frame
// keeps a drag at display rate without queueing interpreter work.
let parameterFrame = 0;
const pendingParams = new Map();
function resetParameters() {
  cancelAnimationFrame(parameterFrame);
  parameterFrame = 0;
  pendingParams.clear();
}
function flushParameters() {
  cancelAnimationFrame(parameterFrame);
  parameterFrame = 0;
  if (!pendingParams.size) return;
  if (nodeId < 0) {
    pendingParams.clear();
    message('Evaluate cell 02 to create the synth these controls address.');
    return;
  }
  send('set', { params: Object.fromEntries(pendingParams) });
  pendingParams.clear();
}
// Fundamental and formant span three decades or more, and the part of that
// range worth hearing is the bottom of it: the rhythm-to-pitch boundary sits
// under 60 Hz. A linear slider spends most of its travel above 1 kHz, so those
// two are mapped exponentially, with the position running 0..1000 and the
// value read off a logarithmic curve between data-lo and data-hi.
function paramValue(input) {
  if (input.dataset.curve !== 'exp') return Number(input.value);
  const lo = Number(input.dataset.lo), hi = Number(input.dataset.hi);
  const value = lo * Math.pow(hi / lo, Number(input.value) / Number(input.max));
  return value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
}
document.querySelectorAll('[data-param]').forEach(input => {
  input.oninput = () => {
    const value = paramValue(input);
    $(`#${input.id}-value`).textContent = input.id === 'amp' ? value.toFixed(2) : `${value} Hz`;
    pendingParams.set(input.dataset.param, value);
    if (!parameterFrame) parameterFrame = requestAnimationFrame(flushParameters);
  };
});
if ($('#release-synth')) $('#release-synth').onclick = () => {
  resetParameters();
  setLoop(null);
  // Either instrument may be sounding: the panel's synth or the one reading
  // the control tables. Closing the gate lets each release rather than cut.
  send('evaluate', { code:
      '~handbookSynth.tryPerform(\\set, \\gate, 0); ~handbookSynth = nil; '
    + '~tableSynth.tryPerform(\\set, \\gate, 0); ~tableSynth = nil;' });
};
if ($('#clear-post')) $('#clear-post').onclick = () => { postText = ''; $('#post-output').textContent = ''; $('#post-announcement').textContent = ''; };
if ($('#download-source')) $('#download-source').onclick = () => {
  const source = [...editors].map(([id, editor]) => `// ${unitTitles.get(id) || id}\n${editor.getValue()}`).join('\n\n');
  const url = URL.createObjectURL(new Blob([source + '\n'], { type: 'text/plain' }));
  const a = document.createElement('a'); a.href = url; a.download = 'handbook-pulsar.scd'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
addEventListener('pagehide', saveDrafts);

// Until a session runs, the executable stretch of the entry is veiled and
// points back to the control that starts it. The veil never takes pointer
// events: the prose underneath stays readable and selectable.
function updateVeil() {
  const body = $('.entry-body');
  const heading = $('#web-implementation');
  const cells = document.querySelectorAll('.code-cell');
  if (!body || !heading || !cells.length) return;
  if (!veil) {
    veil = document.createElement('div');
    veil.className = 'session-veil';
    // The note is the control, not a label for one: the veil itself stays
    // inert so the prose beneath remains selectable.
    veil.innerHTML = '<button type="button" class="session-veil-note">'
      + '<span class="session-veil-arrow" aria-hidden="true">←</span>'
      + '<span>Start the session to run these examples</span></button>';
    veil.querySelector('.session-veil-note').onclick = startSession;
    body.append(veil);
  }
  const live = ready || starting;
  veil.hidden = live;
  if (live) return;
  const origin = body.getBoundingClientRect().top;
  const top = heading.getBoundingClientRect().top - origin;
  const bottom = cells[cells.length - 1].getBoundingClientRect().bottom - origin;
  veil.style.top = `${top}px`;
  veil.style.height = `${Math.max(0, bottom - top)}px`;
  // Sit level with the control the arrow points at. While the sidebar is
  // fixed its position is stable, so the note can stick to that same line.
  const start = $('#start-session');
  const note = veil.querySelector('.session-veil-note');
  if (start && note && getComputedStyle(monitor || start).position === 'fixed') {
    const button = start.getBoundingClientRect();
    const centred = button.top + (button.height - note.offsetHeight) / 2;
    veil.style.setProperty('--veil-note-top', `${Math.max(12, Math.round(centred))}px`);
  } else {
    veil.style.removeProperty('--veil-note-top');
  }
}
if ($('.entry-body') && $('#web-implementation')) {
  updateVeil();
  addEventListener('resize', updateVeil);
  new ResizeObserver(updateVeil).observe($('.entry-body'));
}

// The monitoring stack belongs to the implementation section: it fades in when
// that section comes into view, and stays for as long as the session is live,
// so a running server is never hidden while reading elsewhere.
monitor = $('.sidebar-monitor');
let easeUntil = 0;
function updateMonitor() {
  monitorFrame = 0;
  const heading = $('#web-implementation');
  if (!monitor || !heading) return;
  // The fall is keyed to the last executable cell, not to the next heading:
  // cells may run on past several sections, and the controls must outlast them.
  const cells = document.querySelectorAll('.code-cell');
  const top = heading.getBoundingClientRect().top;
  const end = cells.length ? cells[cells.length - 1].getBoundingClientRect().bottom : Infinity;
  // Opacity tracks the scroll. The rise begins two and a half screens before
  // the heading and completes exactly as it reaches the top, smoothed at both
  // ends so there is no edge where the monitor snaps into being.
  const clamp = value => Math.min(1, Math.max(0, value));
  const smooth = p => p * p * (3 - 2 * p);
  const rise = innerHeight * 2.5, fall = innerHeight * 1.5;
  const arriving = smooth(clamp((rise - top) / rise));
  const leaving = end === Infinity ? 1 : smooth(clamp(end / fall));
  const held = ready || starting;
  const opacity = held ? 1 : Math.min(arriving, leaving);
  // Scroll-linked changes follow the pointer exactly; only the hand-off from a
  // finished session eases, so it does not snap away.
  if (held) easeUntil = performance.now() + 950;
  monitor.style.transition = held || performance.now() < easeUntil ? 'opacity .9s ease' : 'none';
  monitor.style.opacity = opacity.toFixed(3);
  monitor.classList.toggle('is-visible', opacity > 0.02);
}
if (monitor && $('#web-implementation')) {
  const schedule = () => { if (!monitorFrame) monitorFrame = requestAnimationFrame(updateMonitor); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  updateMonitor();
}

// The playhead is animated from the page clock, started and timed by what the
// cell announces. It is an indication of where in the tables the instrument is
// reading, not a reading taken from the server, so it will drift over long
// sessions and is resynchronised whenever the traversal is set again.
//
// Each table keeps its own traversal, because the four can be given times of
// their own: a single playhead across all of them would then be drawing a loop
// the instrument is no longer in. The time is signed, as it is on the server,
// and a negative one runs the playhead backwards over the same period.
function setLoop(seconds, name = null) {
  const key = name || '*';
  if (!seconds) {
    // A stop without a name stops everything: an unnamed announcement speaks
    // for all four tables, and so does its stop.
    if (key === '*') loops.clear(); else loops.delete(key);
  } else {
    // A named announcement is continuous in phase: those tables are drifting
    // apart on times of their own, and only the period changes. An unnamed one
    // puts all four back on one loop, and the server resets their reading
    // position with it, so the playheads start again from the same place.
    const period = Math.abs(seconds) * 1000;
    const direction = Math.sign(seconds);
    const phase = key !== '*' && loops.has(key) ? (loopPhase(key) ?? 0) : 0;
    loops.set(key, { period, direction, start: performance.now() - phase * period * direction });
    if (key === '*') for (const other of [...loops.keys()]) if (other !== '*') loops.delete(other);
  }
  cancelAnimationFrame(loopFrame);
  loopFrame = 0;
  const step = () => {
    for (const [table, values] of curves) drawCurve(table, values);
    loopFrame = loops.size ? requestAnimationFrame(step) : 0;
  };
  step();
}
function loopPhase(name) {
  const loop = loops.get(name) ?? loops.get('*');
  if (!loop) return null;
  const turns = ((performance.now() - loop.start) / loop.period) * loop.direction;
  return turns - Math.floor(turns);
}

const clamp01 = value => Math.min(1, Math.max(0, value));

// A table arrives with its values, and with the buffer and stride it was
// sampled from where the cell publishes them. The range is taken once, at
// generation: from then on the plot holds it, so drawing on the plot reshapes
// the table without rescaling it.
function receiveCurve({ name, values, buffer, stride }) {
  curves.set(name, values);
  let low = Infinity, high = -Infinity;
  for (const value of values) { if (value < low) low = value; if (value > high) high = value; }
  if (!(high > low)) { low -= 0.5; high += 0.5; }
  curveRanges.set(name, { low, high });
  if (Number.isFinite(buffer) && Number.isFinite(stride)) {
    curveTargets.set(name, { buffer, stride });
  }
  // Freshly generated: whatever was drawn by hand has been written over.
  curvesDrawn.delete(name);
  drawCurve(name, values);
}

// Control tables plotted where the cell that generates them can be read.
// Each is normalised to its own range, with the range stated rather than drawn.
function drawCurve(name, values) {
  const canvas = $(`[data-curve="${name}"]`);
  if (!canvas || !values.length) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const ratio = devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const { low, high } = curveRanges.get(name) ?? { low: 0, high: 1 };
  const span = high - low || 1;
  ctx.strokeStyle = '#d4d8dc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, height - 0.5); ctx.lineTo(width, height - 0.5); ctx.stroke();
  // Quantised to a grid rather than drawn as a curve: a table is a finite
  // array of values, and the plot should not pretend otherwise.
  const pixel = 3;
  const columns = Math.max(8, Math.floor(width / pixel));
  const rows = Math.max(4, Math.floor((height - 4) / pixel));
  ctx.fillStyle = '#0a0a0a';
  for (let column = 0; column < columns; column++) {
    const index = Math.round(column / (columns - 1) * (values.length - 1));
    const level = Math.round(clamp01((values[index] - low) / span) * (rows - 1));
    ctx.fillRect(column * pixel, height - 2 - (level + 1) * pixel, pixel - 1, pixel - 1);
  }
  const phase = loopPhase(name);
  if (phase !== null) {
    const x = Math.round(phase * width) + 0.5;
    ctx.strokeStyle = '#a33a2d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  const readout = $(`[data-curve-range="${name}"]`);
  const format = value => Math.abs(value) >= 100 ? Math.round(value) : Number(value.toFixed(2));
  if (readout) {
    const unit = readout.dataset.unit ? ` ${readout.dataset.unit}` : '';
    const hand = curvesDrawn.has(name) ? ' · drawn' : '';
    readout.textContent = `${format(low)} to ${format(high)}${unit}${hand}`;
  }
}

// Drawing on a control table. The plot is not an illustration of the table but
// a way into it: a pointer press writes the value under the cursor into the
// same buffer the instrument is reading, so a trajectory can be redrawn by hand
// while it sounds. The value is mapped into the range the generating procedure
// set, which is the range the head states; the two ways of making a table meet
// in the same buffer.
const pendingWrites = new Map();
let writeFrame = 0;
function curvePoint(canvas, name, event) {
  const rect = canvas.getBoundingClientRect();
  const values = curves.get(name);
  const { low, high } = curveRanges.get(name);
  const index = Math.round(clamp01((event.clientX - rect.left) / rect.width) * (values.length - 1));
  // The vertical band matches the plot's own grid: the top row of cells sits
  // two pixels down, the bottom row on the baseline.
  const level = clamp01((rect.height - 2 - (event.clientY - rect.top)) / (rect.height - 4));
  return { index, value: low + level * (high - low) };
}
function writeCurve(name, from, to) {
  const span = pendingWrites.get(name);
  if (span) { span.from = Math.min(span.from, from); span.to = Math.max(span.to, to); }
  else pendingWrites.set(name, { from, to });
  if (!writeFrame) writeFrame = requestAnimationFrame(flushCurveWrites);
}
// Only the stretch under the pointer is sent. The plot holds one value in every
// `stride` of the table, so a drawn point stands for a run of that many frames;
// the frames between two drawn points are filled by interpolating across them,
// and the rest of the table is left exactly as the procedure wrote it.
function flushCurveWrites() {
  writeFrame = 0;
  for (const [name, span] of pendingWrites) {
    const target = curveTargets.get(name);
    const values = curves.get(name);
    if (!target || !values) continue;
    const { buffer, stride } = target;
    const last = values.length - 1;
    const from = Math.max(0, span.from - 1);
    const to = Math.min(last, span.to + 1);
    // A run that reaches the end of the plot carries on to the end of the
    // table, so the final stride of frames is not left behind.
    const length = (to - from) * stride + (to === last ? stride : 1);
    const written = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const position = from + i / stride;
      const index = Math.min(to, Math.floor(position));
      const fraction = position - index;
      const start = values[index], end = values[Math.min(to, index + 1)];
      written[i] = start + (end - start) * fraction;
    }
    send('table', { buffer, start: from * stride, values: written });
  }
  pendingWrites.clear();
}
function enableCurveDrawing(canvas, name) {
  let drawing = false, lastIndex = -1;
  const paint = event => {
    const values = curves.get(name);
    const { index, value } = curvePoint(canvas, name, event);
    if (lastIndex >= 0 && Math.abs(index - lastIndex) > 1) {
      // A fast drag skips plot points; the run between them is filled rather
      // than left holding whatever the procedure put there.
      const step = index > lastIndex ? 1 : -1;
      const previous = values[lastIndex];
      const steps = Math.abs(index - lastIndex);
      for (let s = 0; s <= steps; s++) {
        values[lastIndex + s * step] = previous + (value - previous) * (s / steps);
      }
      writeCurve(name, Math.min(index, lastIndex), Math.max(index, lastIndex));
    } else {
      values[index] = value;
      writeCurve(name, index, index);
    }
    lastIndex = index;
    curvesDrawn.add(name);
    drawCurve(name, values);
  };
  canvas.addEventListener('pointerdown', event => {
    if (!curves.get(name)) {
      message('Evaluate cell 03 to build the tables before drawing on them.');
      return;
    }
    if (!curveTargets.has(name)) {
      message('This table was published without its buffer, so it can be plotted but not drawn on.');
      return;
    }
    drawing = true; lastIndex = -1;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    paint(event);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drawing) return;
    event.preventDefault();
    paint(event);
  });
  const release = () => { drawing = false; lastIndex = -1; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
}
document.querySelectorAll('[data-curve]').forEach(canvas => {
  enableCurveDrawing(canvas, canvas.dataset.curve);
});


// The scope is triggered, so a periodic train stands still instead of sliding.
// Three things keep it steady that a plain threshold crossing does not.
// An absolute floor: below it the window is silence, and a relative threshold
// would otherwise lock onto noise. Hysteresis: the trigger arms only after the
// signal has gone quiet, so it catches the onset of a burst rather than a
// wiggle part way through it. And a hold: at low fundamentals many windows
// contain no pulse at all, and redrawing those would flicker between a pulse
// and a flat line, so the last triggered frame stays up briefly instead.
const SCOPE_FLOOR = 0.004;   // below this the window counts as silence
const SCOPE_LEVEL = 0.25;    // trigger at this fraction of the window peak
const SCOPE_PRE = 0.02;      // show this much before the edge, so the onset is visible
const SCOPE_HOLD = 700;      // ms to keep the last triggered frame
let scopeHold = null, scopeHoldAt = 0;

function triggeredFrame(samples, span) {
  if (!samples || samples.length < 2) return samples || [];
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const m = Math.abs(samples[i]);
    if (m > peak) peak = m;
  }
  let edge = -1;
  if (peak >= SCOPE_FLOOR) {
    const level = peak * SCOPE_LEVEL;
    const arm = level * 0.5;
    let armed = samples[0] < arm;
    // Search the whole window, not just the first span of it: an edge anywhere
    // up to the last point that still leaves a full span to draw. Stopping at
    // span meant searching 21 ms of a window that advances 33 ms each frame,
    // so a pulsaret could pass between one searched region and the next.
    for (let i = 1; i <= samples.length - span; i++) {
      if (samples[i] < arm) armed = true;
      else if (armed && samples[i - 1] <= level && samples[i] > level) { edge = i; break; }
    }
  }
  if (edge >= 0) {
    const from = Math.max(0, edge - Math.round(span * SCOPE_PRE));
    scopeHold = samples.slice(from, from + span);
    scopeHoldAt = performance.now();
    return scopeHold;
  }
  if (scopeHold && performance.now() - scopeHoldAt < SCOPE_HOLD) return scopeHold;
  scopeHold = null;
  return samples.subarray ? samples.subarray(0, span) : samples.slice(0, span);
}

function drawScope(samples = lastSamples, peak = lastPeak) {
  lastSamples = samples; lastPeak = peak;
  const canvas = $('#audio-scope');
  const width = canvas.clientWidth, height = canvas.clientHeight;
  // A scope with no layout box has nothing to draw on, which happens whenever
  // it sits in a panel that is closed. Leaving early is not only the saving:
  // the grid below steps by width / 8, and a step of zero never finishes.
  if (!width || !height) return;
  const ratio = devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1; ctx.strokeStyle = '#e1e1e1'; ctx.beginPath();
  for (let x = 0; x <= width; x += width / 8) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
  for (let y = 0; y <= height; y += height / 4) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
  ctx.stroke(); ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 1.3; ctx.beginPath();
  // A quarter of the window, so the trace covers the same 21.3 ms it always
  // did while the rest of the window is left for the trigger to search in.
  const span = Math.max(2, samples.length >> 2);
  const frame = triggeredFrame(samples, span);
  for (let i = 0; i < span; i++) {
    const x = i / (span - 1) * width;
    const y = height / 2 - Math.max(-1, Math.min(1, frame[i] || 0)) * height * .45;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  $('#peak-level').textContent = peak > 0.00001 ? `${(20 * Math.log10(peak)).toFixed(1)} dBFS` : '−∞ dBFS';
}
new ResizeObserver(() => drawScope()).observe($('#audio-scope'));
drawScope();
