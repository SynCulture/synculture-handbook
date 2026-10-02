// One iframe owns the language, synthesis server, and audio graph.
// Removing the iframe tears down its workers; source edits live in the parent.
const channel = 'handbook-sc';
const token = new URLSearchParams(location.search).get('session');
const marker = `HB_READY_${token}`;
const nodeMarker = `HB_NODE_${token}=`;
const bufferMarker = `HB_BUFS_${token}=`;
const tableSize = 2048;
// Reports the controlled node after each evaluation so the interface can
// address it with OSC instead of recompiling source for every slider step.
const nodeQuery = `("${nodeMarker}" ++ (~handbookSynth.tryPerform(\\nodeID) ? -1)).postln;`;
let lang, synth, analyser, gain, context;
let ready = false;
let master = 0.5;
let muted = false;
let bootingServer = false;
let outputTail = '';
let nodeId = -1;
let scopeFrame = 0;
const emit = (type, detail = {}) => parent.postMessage({ channel, token, type, ...detail }, location.origin);
// A cell announces the traversal so the page can draw a playhead over the
// tables: ("HB_LOOP " ++ seconds).postln, or "HB_LOOP stop". The time is
// signed, a negative value being a traversal read backwards, and a table may be
// named ahead of it so the four can be read on times of their own:
// ("HB_LOOP fund -60").postln. Without a name the announcement covers all four.
const loopPattern = /HB_LOOP (?:([a-zA-Z]\w*) )?(-?[\d.]+|stop)\n?/g;

// A cell can publish a curve for plotting with: ("HB_TABLE name " ++ array).postln
// Naming the buffer the values came from and the stride they were sampled at,
// ("HB_TABLE name " ++ bufnum ++ " " ++ step ++ " " ++ array), also makes the
// plot editable: the page writes a drawn value back into that buffer.
// A table of any length arrives split across several callbacks, so the marker
// is accumulated until its closing bracket rather than matched per chunk.
let curveBuffer = '';
function takeCurves(text) {
  curveBuffer += text;
  let output = '';
  for (;;) {
    const start = curveBuffer.indexOf('HB_TABLE ');
    if (start < 0) { output += curveBuffer; curveBuffer = ''; break; }
    output += curveBuffer.slice(0, start);
    const close = curveBuffer.indexOf(']', start);
    if (close < 0) {
      curveBuffer = curveBuffer.slice(start);
      // Never buffer without bound if the bracket never comes.
      if (curveBuffer.length > 200000) { output += curveBuffer; curveBuffer = ''; }
      break;
    }
    const marker = curveBuffer.slice(start, close + 1);
    const parsed = marker.match(/^HB_TABLE (\w+)(?: (\d+) (\d+))? \[([^\]]*)\]$/);
    if (parsed) {
      const values = parsed[4].split(',').map(Number).filter(Number.isFinite);
      // The buffer and stride are optional: a cell that publishes values alone
      // gets a plot, one that names its buffer gets a plot that can be drawn on.
      if (values.length) emit('curve', {
        name: parsed[1], values,
        buffer: parsed[2] === undefined ? null : Number(parsed[2]),
        stride: parsed[3] === undefined ? null : Number(parsed[3]),
      });
    } else {
      output += marker;
    }
    curveBuffer = curveBuffer.slice(close + 1);
  }
  return output;
}
const post = (text, level = 'output') => {
  // Empty only, not whitespace: blank lines carry the post window's spacing.
  text = takeCurves(String(text));
  if (text.includes('HB_LOOP ')) {
    for (const match of text.matchAll(loopPattern)) {
      emit('loop', {
        name: match[1] ?? null,
        looptime: match[2] === 'stop' ? null : Number(match[2]),
      });
    }
    text = text.replace(loopPattern, '');
  }
  if (!text) return;
  if (text.includes(bufferMarker)) {
    const reported = text.match(new RegExp(`${bufferMarker}(\\d+),(\\d+)`));
    if (reported) emit('buffers', { wave: Number(reported[1]), envelope: Number(reported[2]), size: tableSize });
    text = text.replace(new RegExp(`${bufferMarker}[\\d,]*\\n?`, 'g'), '');
    if (!text) return;
  }
  if (text.includes(nodeMarker)) {
    const reported = text.match(new RegExp(`${nodeMarker}(-?\\d+)`, 'g'));
    if (reported) {
      nodeId = Number(reported[reported.length - 1].slice(nodeMarker.length));
      emit('node', { id: nodeId });
    }
    text = text.replace(new RegExp(`${nodeMarker}-?\\d*\\n?`, 'g'), '');
    if (!text) return;
  }
  outputTail = (outputTail + text).slice(-4000);
  if (text.includes(marker)) {
    ready = true;
    emit('ready', { sampleRate: context?.sampleRate, audioState: context?.state });
  } else {
    emit('post', { text, level });
  }
};
const fail = error => emit('error', { message: error?.message || String(error) });

// Minimal OSC encoding for /n_set: control changes reach scsynth directly,
// without a language round trip. Values are always floats.
const encoder = new TextEncoder();
const oscString = text => {
  const bytes = encoder.encode(text);
  const padded = new Uint8Array((bytes.length + 4) & ~3);
  padded.set(bytes);
  return padded;
};
const oscInt = value => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setInt32(0, value);
  return bytes;
};
const oscFloat = value => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setFloat32(0, value);
  return bytes;
};
function oscPacket(parts) {
  const packet = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { packet.set(part, offset); offset += part.length; }
  return packet;
}
// /b_setn writes a slice of a table straight into the server's buffer.
function bufferSetMessage(buffer, start, values) {
  const body = [oscInt(buffer), oscInt(start), oscInt(values.length)];
  for (let i = 0; i < values.length; i++) body.push(oscFloat(values[i]));
  return oscPacket([oscString('/b_setn'), oscString(`,iii${'f'.repeat(values.length)}`), ...body]);
}
function nodeSetMessage(node, params) {
  let tags = ',i';
  const body = [oscInt(node)];
  for (const [name, value] of Object.entries(params)) {
    if (!Number.isFinite(Number(value))) continue;
    tags += 'sf';
    body.push(oscString(name), oscFloat(Number(value)));
  }
  return oscPacket([oscString('/n_set'), oscString(tags), ...body]);
}

// resume() settles before the state follows it — about twelve milliseconds on
// the browsers measured. Reading state the instant the promise resolves calls a
// context that is about to run blocked, which is the mistake that made the
// first attempt at this worse than the problem.
function settled(ctx) {
  if (ctx.state === 'running') return Promise.resolve();
  return new Promise(resolve => {
    const done = () => { ctx.removeEventListener('statechange', done); clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, 2000);
    ctx.addEventListener('statechange', done);
  });
}

async function askForTap() {
  emit('audio-blocked');
  post(`[${bootClock()}] Audio is suspended: iOS wants a tap before it will start.`);
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'unlock';
  button.textContent = 'Tap to start the audio engine';
  document.body.append(button);
  await new Promise(resolve => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      await context.resume().catch(() => {});
      await settled(context);
      if (context.state !== 'running') {
        button.disabled = false;
        button.textContent = 'Still blocked — tap again';
        return;
      }
      button.remove();
      post(`[${bootClock()}] Audio ${context.state}.`);
      emit('audio-unblocked');
      resolve();
    });
  });
}

async function attachAudio() {
  const deadline = performance.now() + 45000;
  post(`[${bootClock()}] Waiting for the audio context and worklet…`);
  while (performance.now() < deadline) {
    context = synth.getAudioContext();
    const node = synth.getWorkletNode();
    if (context && node) {
      post(`[${bootClock()}] Audio context: ${context.state}, ${context.sampleRate} Hz.`);
      gain = context.createGain();
      gain.gain.value = muted ? 0 : master;
      analyser = context.createAnalyser();
      // 4096 samples is 85.3 ms at 48 kHz, well past the 33 ms sampling
      // interval below, so successive windows overlap and no audio falls
      // between them. At 1024 the window was 21.3 ms and a third of every
      // interval went unseen, which dropped isolated pulsarets at low
      // fundamentals from both the scope and the peak meter.
      //
      // The margin has to cover the scope's trigger, not just the capture. The
      // trigger searches the window for an edge with a full display span left
      // after it, so the region it can search is the window minus that span.
      // At 2048 that region was 21.3 ms, shorter than the 33 ms step, and a
      // pulsaret could cross the capture without once landing inside it: no
      // trigger fired, and at a low fundamental the hold had to bridge a
      // second or more. At 4096 the searched region is 64 ms, comfortably
      // longer than the step, so every pulsaret is triggered on.
      analyser.fftSize = 4096;
      node.disconnect();
      node.connect(gain);
      gain.connect(analyser);
      analyser.connect(context.destination);
      // Resumed only once the graph is connected. Resuming an unconnected
      // context is not the same act, and doing it early broke this once.
      await context.resume().catch(() => {});
      await settled(context);
      post(`[${bootClock()}] Audio ${context.state}.`);
      // iOS will not start audio outside a user gesture, and the tap that
      // started the session was spent compiling the WebAssembly. The context is
      // held by this document, so the tap has to happen here: the parent shows
      // this frame, which is otherwise hidden machinery, to carry it.
      if (context.state !== 'running') await askForTap();
      emit('audio', { state: context.state, sampleRate: context.sampleRate });
      context.onstatechange = () => emit('audio', { state: context.state, sampleRate: context.sampleRate });
      // A timer, not rAF: this document sits in a hidden container, and a
      // non-rendered frame's animation callbacks are throttled unpredictably.
      // 30 Hz is a conventional scope refresh; the window is longer than the
      // interval, so every sample is seen at least once.
      const samples = new Float32Array(analyser.fftSize);
      let hold = 0;
      const frame = () => {
        analyser.getFloatTimeDomainData(samples);
        let peak = 0;
        for (let i = 0; i < samples.length; i++) {
          const magnitude = Math.abs(samples[i]);
          if (magnitude > peak) peak = magnitude;
        }
        hold = Math.max(peak, hold * 0.92);
        const copy = samples.slice();
        parent.postMessage(
          { channel, token, type: 'scope', samples: copy, peak: hold },
          location.origin, [copy.buffer],
        );
      };
      scopeFrame = setInterval(frame, 33);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Audio did not become ready after ${bootClock()} (context ${context?.state || 'none'}, worklet ${synth.getWorkletNode() ? 'present' : 'absent'}). Restart the session.`);
}

window.bootServer = async options => {
  if (bootingServer) { post('Use Restart session to change server options.'); return; }
  bootingServer = true;
  try {
    emit('status', { target: 'server', state: 'starting' });
    post(`[${bootClock()}] Booting the synthesis server…`);
    // No microphone permission is required by this local prototype.
    synth.boot({ ...options, numInputBusChannels: 0, numOutputBusChannels: 2 });
    await attachAudio();
    post(`[${bootClock()}] Audio attached.`);
  } catch (error) { fail(error); }
};

// The boot moves about ten megabytes of WebAssembly and then compiles it, which
// on a phone is tens of seconds of nothing. Said out loud, so a slow start can
// be told apart from a stuck one — by a reader and by whoever they report it to.
const bootClock = () => `${((performance.now() - bootStarted) / 1000).toFixed(1)}s`;
let bootStarted = 0;

async function start() {
  bootStarted = performance.now();
  if (!crossOriginIsolated) throw new Error('Open this preview with npm run preview; the runtime requires isolation headers.');
  post(`Device: ${navigator.hardwareConcurrency || '?'} cores, ${navigator.userAgent.slice(0, 90)}`);
  post(`[${bootClock()}] Fetching the language and server modules (about 10 MB)…`);
  const [{ default: ScLang }, { default: ScSynth }] = await Promise.all([
    import('/runtime/sc/sclang.js'), import('/runtime/sc/scsynth.js'),
  ]);
  const options = () => ({ locateFile: path => `/runtime/sc/${path}`, onAbort: fail });
  post(`[${bootClock()}] Compiling the language…`);
  lang = await ScLang(options());
  post(`[${bootClock()}] Compiling the synthesis server…`);
  synth = await ScSynth(options());
  post(`[${bootClock()}] Starting the interpreter…`);
  lang.printCallback = text => post(text);
  lang.printErrCallback = text => post(text, 'error');
  synth.onStdout = text => post(text);
  // Bidirectional OSC carries /d_recv, /s_new, /sync and server replies.
  lang.onOsc = bytes => synth.sendOsc(new Uint8Array(bytes));
  synth.onOscReply = bytes => lang.sendOsc(new Uint8Array(bytes));
  lang.bootInterpreter();
  // A phone compiling this much WebAssembly is slow, not broken.
  const deadline = performance.now() + 150000;
  while (!outputTail.includes('Welcome to SuperCollider')) {
    if (performance.now() > deadline) throw new Error(`Language startup timed out after ${bootClock()}. See the post window and restart.`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  emit('status', { target: 'language', state: 'ready' });
  // The pulsaret tables belong to the session, not to any one cell: the
  // builder writes into them, and the examples read them by name.
  lang.runCode(`
    s.options.numInputBusChannels = 0;
    s.options.numOutputBusChannels = 2;
    CmdPeriod.add({ ~handbookSynth = nil; ~tableSynth = nil; ~handbookGroup = nil; });
    s.waitForBoot({
      ~handbookGroup = Group.head(aGroup: s.defaultGroup);
      ~wave = Buffer.alloc(server: s, numFrames: ${tableSize}, numChannels: 1);
      ~envelope = Buffer.alloc(server: s, numFrames: ${tableSize}, numChannels: 1);
      s.sync;
      ("${bufferMarker}" ++ ~wave.bufnum ++ "," ++ ~envelope.bufnum).postln;
      "${marker}".postln;
    });`);
}

addEventListener('message', async event => {
  const data = event.data;
  if (event.source !== parent || event.origin !== location.origin || data?.channel !== channel || data.token !== token) return;
  try {
    if (data.type === 'evaluate' && ready && typeof data.code === 'string') {
      await context?.resume();
      lang.runCode(data.code);
      lang.runCode(nodeQuery);
    } else if (data.type === 'table' && ready && Number.isInteger(data.buffer) && data.values?.length) {
      // Chunked so no single OSC message carries the whole 2048-value table.
      // `start` is where in the buffer the values belong: a whole table is
      // written from 0, a stretch drawn on a plot from wherever it was drawn.
      const start = Number.isInteger(data.start) ? data.start : 0;
      for (let offset = 0; offset < data.values.length; offset += 512) {
        synth.sendOsc(bufferSetMessage(data.buffer, start + offset, data.values.subarray(offset, offset + 512)));
      }
    } else if (data.type === 'set' && ready && data.params) {
      // Control changes bypass the interpreter entirely.
      if (nodeId >= 0) synth.sendOsc(nodeSetMessage(nodeId, data.params));
    } else if (data.type === 'stop') {
      // Silence is independent of the language scheduler.
      if (gain) gain.gain.setValueAtTime(0, context.currentTime);
      lang?.runCode('CmdPeriod.run; "Scheduled activity stopped.".postln;');
      lang?.runCode(nodeQuery);
      muted = true;
      emit('muted', { value: true });
    } else if (data.type === 'master' && Number.isFinite(data.value)) {
      master = Math.max(0, Math.min(1, data.value));
      if (gain && !muted) gain.gain.setTargetAtTime(master, context.currentTime, 0.015);
    } else if (data.type === 'mute') {
      muted = Boolean(data.value);
      if (gain) gain.gain.setTargetAtTime(muted ? 0 : master, context.currentTime, 0.015);
    } else if (data.type === 'resume') {
      await context?.resume();
    }
  } catch (error) { fail(error); }
});
addEventListener("pagehide", () => { clearInterval(scopeFrame); context?.close(); });
start().catch(fail);
