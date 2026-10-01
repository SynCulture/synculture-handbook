// SYNCULTURE Synthesis Handbook
// Pulsar synthesis — version for a local SuperCollider
// https://synculture.net/handbook/pulsar-synthesis/
//
// The code on the entry page runs inside the browser, where the language and
// the synthesis server are compiled to WebAssembly and the page owns part of
// the session. Those cells therefore carry things that only mean something on
// the web: the ~wave and ~envelope buffers are allocated by the page and filled
// by the pulsaret builder above the cells, and lines such as
//
//     ("HB_TABLE " ++ name ++ " " ++ buf.bufnum ++ " 8 [" ++ points.join(",") ++ "]").postln;
//     ("HB_LOOP " ++ name ++ " " ++ seconds).postln;
//
// are a private protocol: the page watches the post window for those markers
// and uses them to plot the tables and move the playhead across them. They do
// nothing in a normal SuperCollider and would only clutter your post window.
//
// This file is the same instrument with that scaffolding removed and replaced
// by the local equivalents: it allocates its own buffers, fills them with a
// pulsaret, plots the tables with .plot, and adds a few things the browser
// cannot offer — a catalogue of pulsaret waveforms and envelopes after Roads's
// figures 4.11 and 4.12, a slider panel, an editor for drawing the control
// tables by hand, and recording to disk.
//
// It also carries one part of the technique the cells leave out altogether:
// pulsar masking, in the two forms the Pulsar Generator implements for a single
// train, burst and stochastic. Masking is the only control here that subtracts
// from the train rather than drawing a parameter of it.
//
// Evaluate the blocks in order. Written for SuperCollider 3.13 or newer.


// ---------------------------------------------------------------- 0. Session
// The browser page does this for you before the first cell appears.
(
s.waitForBoot({
    ~tableSize = 2048;                  // as in the Pulsar Generator

    // Evaluating this block a second time starts the session over rather than
    // allocating a second one beside it. The group goes, and every synth inside
    // it with it; the buffers are freed and forgotten, so the blocks below
    // allocate their own again instead of leaving the first set on the server.
    if(~handbookGroup.notNil, {
        ~handbookGroup.free;
        ~handbookSynth = nil;
        ~tableSynth = nil;
        [~wave, ~envelope, ~fundTab, ~formTab, ~ampTab, ~panTab, ~maskTab]
            .do({ |buf| buf.tryPerform(\free) });
        ~fundTab = nil; ~formTab = nil; ~ampTab = nil;
        ~panTab = nil; ~maskTab = nil;
        s.sync;
    });

    ~handbookGroup = Group.head(aGroup: s.defaultGroup);
    ~wave = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
    ~envelope = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
    s.sync;

    // A catalogue to draw from, after Roads, Microsound (2001), figs. 4.11
    // (waveforms) and 4.12 (envelopes). Each returns an Array of n values.
    ~pulsarets = IdentityDictionary[
        \sine -> { |n| Array.fill(n, { |i| sin(2pi * i / n) }) },
        \multicycle -> { |n| Array.fill(n, { |i| sin(2pi * 3 * i / n) }) },
        \gaussSine -> { |n| Array.fill(n, { |i|
            var x = i / n;
            sin(2pi * 4 * x) * exp(-0.5 * ((x - 0.5) / 0.18).squared);
        }) },
        \saw -> { |n| Array.fill(n, { |i| 1 - (2 * i / n) }) },
        \noise -> { |n| Array.fill(n, { 1.0.rand2 }) }
    ];

    ~envelopes = IdentityDictionary[
        \rect -> { |n| Array.fill(n, { 1.0 }) },
        \gauss -> { |n| Array.fill(n, { |i|
            exp(-0.5 * (((i / n) - 0.5) / 0.15).squared);
        }) },
        \lineardecay -> { |n| Array.fill(n, { |i| 1 - (i / n) }) },
        \expodec -> { |n| Array.fill(n, { |i| exp(-6 * i / n) }) },
        \fof -> { |n| Array.fill(n, { |i|
            var x = i / n;
            if(x < 0.2, { 0.5 * (1 - cos(pi * x / 0.2)) }, { exp(-5 * (x - 0.2) / 0.8) });
        }) },
        \bipolar -> { |n| Array.fill(n, { |i| sin(2pi * i / n) }) }
    ];

    // The pulsaret builder on the web page writes into these two buffers.
    // Here you choose by name; see block 5 to plot or replace them.
    ~setPulsaret = { |name = \sine|
        ~wave.sendCollection(collection: ~pulsarets[name].value(~tableSize));
        ("pulsaret: " ++ name).postln;
    };
    ~setEnvelope = { |name = \gauss|
        ~envelope.sendCollection(collection: ~envelopes[name].value(~tableSize));
        ("envelope: " ++ name).postln;
    };
    ~setPulsaret.value(\sine);
    ~setEnvelope.value(\gauss);
    s.sync;

    "Session ready. Evaluate block 1.".postln;
});
);


// --------------------------------------------------------- 1. The definition
// After de Campo and Pietruszewski, "Microsound", in The SuperCollider Book,
// 2nd ed. (MIT Press, 2025), fig. 16.17: the trigger runs at the fundamental,
// while grain duration and playback rate both follow the formant.
(
Routine({
    SynthDef(name: \handbook_live, ugenGraphFunc: {
        |out = 0, wavebuf = 0, envbuf = 1,
         fund = 100, form = 400, amp = 0.5, pan = 0,
         maskProb = 1, burst = 1, rest = 0, gate = 1|
        // Added here, not in the figure: smoothing, so a slider move glides,
        // and a gate, so one node can be held and released.
        var fundSmooth = Lag.kr(in: fund, lagTime: 0.05);
        var formSmooth = Lag.kr(in: form, lagTime: 0.05);
        var ampSmooth = Lag.kr(in: amp, lagTime: 0.05);
        // One pulsaret per trigger; silence fills the rest of the period.
        var trig = Impulse.ar(freq: fundSmooth);
        var grdur = formSmooth.reciprocal;
        var rate = formSmooth * BufDur.kr(bufnum: wavebuf);
        // Masking, after Roads (2001a, 149-51), and not in the figure or in the
        // cells on the page. It "deletes individual pulsarets, leaving an
        // interval of silence in their place", so the train keeps its period
        // while losing emissions: the trigger above is never slowed, only
        // intercepted on its way to the grain.
        //   Burst masking alternates burst emitted periods with rest silent
        // ones, which is the burst generator of the classic studios: 4 and 2
        // give 111100111100. Stepper counts the periods of the train, so the
        // figure stays in step with it, and the comparison opens the gate for
        // the first burst periods of every cycle. rest = 0 is masking off.
        var cycle = (burst + rest).max(1);
        var count = Stepper.ar(trig: trig, reset: 0, min: 0,
            max: cycle - 1, step: 1);
        // Stochastic masking is a weighted coin thrown once per period: at 1
        // every pulsar sounds, at 0 none, and Roads gives 0.9 to 0.8 as the
        // range that sounds like an erratic contact in the circuit.
        var masked = CoinGate.ar(prob: maskProb, in: trig * (count < burst));
        var signal = GrainBuf.ar(
            numChannels: 2, trigger: masked, dur: grdur,
            sndbuf: wavebuf, rate: rate, pos: 0,
            interp: 4, pan: pan, envbufnum: envbuf
        );
        var envelope = EnvGen.kr(
            envelope: Env.asr(releaseTime: 0.1),
            gate: gate, doneAction: 2
        );
        Out.ar(bus: out, channelsArray: signal * ampSmooth * envelope);
    }).add;
    s.sync;
    "Instrument ready. Evaluate block 2 to play.".postln;
}).play(clock: AppClock);
);


// ------------------------------------------------------- 2. Play and transform
(
// A voice that is already sounding is released rather than cut off: the gate
// closes, its 0.1 s release runs out underneath the new one, and the exchange
// is inaudible where a .free would click.
~handbookSynth.tryPerform(\set, \gate, 0);
~handbookSynth = Synth(
    defName: \handbook_live,
    args: [\wavebuf, ~wave, \envbuf, ~envelope,
        \fund, 100, \form, 400, \amp, 0.5],
    target: ~handbookGroup,
    addAction: \addToTail
);
);

// Set parameters by hand:
~handbookSynth.set(\fund, 40);      // below the rhythm/pitch boundary
~handbookSynth.set(\fund, 220);
~handbookSynth.set(\form, 1200);    // formant is independent of fundamental
~handbookSynth.set(\amp, 0.8);

// Masking. The train keeps its period throughout; what changes is which of its
// periods carry a pulsaret.
~handbookSynth.set(\maskProb, 0.85);        // Roads's analog-like intermittency
~handbookSynth.set(\maskProb, 0.3);         // most periods silent
~handbookSynth.set(\maskProb, 1);           // every one of them again
~handbookSynth.set(\burst, 4, \rest, 2);    // 111100111100: Roads's 4:2
~handbookSynth.set(\burst, 2, \rest, 1);    // period tripled: a subharmonic at fund/3
~handbookSynth.set(\burst, 1, \rest, 0);    // burst masking off

// Or open a panel. The browser page gives you sliders; this is the local one.
(
~panel = {
    var win;
    ~panelWindow.tryPerform(\close);    // one panel, not one per evaluation
    win = Window(name: "pulsar", bounds: Rect(left: 60, top: 60, width: 420, height: 275));
    EZSlider(win, Rect(10, 10, 400, 30), "fund", ControlSpec(1, 2000, \exp),
        { |ez| ~handbookSynth.tryPerform(\set, \fund, ez.value) }, 100);
    // Above about 1 kHz the formant steps the 2048-point table by more than a
    // hundred frames per sample, and the saw and noise pulsarets alias audibly.
    // That is this implementation at its edge rather than a fault in it, but it
    // is worth knowing which of the two you are listening to. nuPG's \oscos
    // engine exists for exactly this reason.
    EZSlider(win, Rect(10, 45, 400, 30), "form", ControlSpec(20, 5000, \exp),
        { |ez| ~handbookSynth.tryPerform(\set, \form, ez.value) }, 400);
    EZSlider(win, Rect(10, 80, 400, 30), "amp", ControlSpec(0, 1, \lin),
        { |ez| ~handbookSynth.tryPerform(\set, \amp, ez.value) }, 0.5);
    EZSlider(win, Rect(10, 115, 400, 30), "pan", ControlSpec(-1, 1, \lin),
        { |ez| ~handbookSynth.tryPerform(\set, \pan, ez.value) }, 0);
    // Masking: the probability of emission, then the burst ratio in periods.
    EZSlider(win, Rect(10, 150, 400, 30), "mask", ControlSpec(0, 1, \lin),
        { |ez| ~handbookSynth.tryPerform(\set, \maskProb, ez.value) }, 1);
    EZSlider(win, Rect(10, 185, 400, 30), "burst", ControlSpec(0, 16, \lin, 1),
        { |ez| ~handbookSynth.tryPerform(\set, \burst, ez.value) }, 1);
    EZSlider(win, Rect(10, 220, 400, 30), "rest", ControlSpec(0, 16, \lin, 1),
        { |ez| ~handbookSynth.tryPerform(\set, \rest, ez.value) }, 0);
    ~panelWindow = win;
    win.front;
};
~panel.value;
);

// Stop it.
~handbookSynth.tryPerform(\set, \gate, 0); ~handbookSynth = nil;


// ------------------------------- 3. Build the tables and hand the instrument to them
// Every parameter becomes a table, and a synth is created to read them.
// Re-evaluate while it plays: the tables are rewritten under the instrument
// rather than restarting it.
(
Routine({
    // The voice from block 2, if it is still held, is released here: the tables
    // are about to drive the same instrument, and two voices sounding at once
    // would be heard as one confused texture rather than as control moving from
    // the hand to the table.
    if(~handbookSynth.notNil, {
        ~handbookSynth.set(\gate, 0);
        ~handbookSynth = nil;
        "Panel voice released: control moves to the tables.".postln;
    });

    // ---- Tables ----
    // After fig. 16.16 in The SuperCollider Book, ch. 16: the exponents map a
    // 0..1 curve onto useful ranges. 2048 values per table, as in the Pulsar
    // Generator, where every control object is a wavetable of that length
    // whatever its time scale.
    ~newTables = {
        ~curves = ();
        ~curves.fund = 200 ** Env(levels: { 1.0.rand } ! 8,
            times: { 1.0.rand } ! 7, curve: \sin).discretize(n: ~tableSize).as(Array);
        ~curves.form = 100 ** (0.5 + Env(levels: { rrand(0.0, 1.0) } ! 8,
            times: { 1.0.rand } ! 7, curve: \sin).discretize(n: ~tableSize).as(Array));
        // Figure 16.16 uses a constant here (0.2 repeated). A trajectory is
        // used instead, so that amplitude reads as a table like the others.
        ~curves.amp = 0.05 + (0.9 * Env(levels: { 1.0.rand } ! 6,
            times: { 1.0.rand } ! 5, curve: \sin).discretize(n: ~tableSize).as(Array));
        ~curves.pan = Signal.sineFill(size: ~tableSize,
            amplitudes: { 1.0.rand } ! 7).as(Array);
        // A fifth table, not in the figure: stochastic masking drawn as an
        // envelope over the train, which is how the Pulsar Generator presents
        // it. Generated between 0.5 and 1, so that the train thins and thickens
        // rather than disappearing; draw it lower in block 5 if you want it to.
        ~curves.mask = 0.5 + (0.5 * Env(levels: { 1.0.rand } ! 6,
            times: { 1.0.rand } ! 5, curve: \sin).discretize(n: ~tableSize).as(Array));

        // Allocate once, then write into the same buffers. A synth already
        // reading them takes up the new tables without being restarted.
        if(~fundTab.isNil, {
            ~fundTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            ~formTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            ~ampTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            ~panTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            ~maskTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            s.sync;
        });
        ~fundTab.sendCollection(collection: ~curves.fund);
        ~formTab.sendCollection(collection: ~curves.form);
        ~ampTab.sendCollection(collection: ~curves.amp);
        ~panTab.sendCollection(collection: ~curves.pan);
        ~maskTab.sendCollection(collection: ~curves.mask);
        s.sync;
    };
    ~newTables.value;

    // One value per table: the seconds a full traversal takes, signed, so that
    // a negative value crosses the table backwards in the same time. On the web
    // each call is also announced to the page, which draws a playhead per table.
    ~looptime = ~looptime ? 10;
    // All five together. The reading position is reset with them: one loop
    // means one position and not merely one period, so what is heard is a
    // single traversal rather than five that happen to share a length.
    ~setLoop = { |seconds = 10|
        ~looptime = seconds;
        ~tableSynth.tryPerform(\set, \fundtime, seconds, \formtime, seconds,
            \amptime, seconds, \pantime, seconds, \masktime, seconds, \t_sync, 1);
    };
    // One each, in table order: fundamental, formant, amplitude, pan, mask.
    // Nothing is reset here: they are meant to come apart.
    ~setLoops = { |fund = 10, form = 10, amp = 10, pan = 10, mask = 10|
        ~tableSynth.tryPerform(\set, \fundtime, fund, \formtime, form,
            \amptime, amp, \pantime, pan, \masktime, mask);
    };
    // Burst masking is a ratio of periods rather than a trajectory, and is set
    // as a pair, as it is in the PG: b emitted, r silent, repeating.
    ~setBurst = { |b = 1, r = 0|
        ~tableSynth.tryPerform(\set, \burst, b, \rest, r);
    };

    // ---- The instrument that reads them ----
    // One traversal of each table per its own number of seconds: the loop is
    // the process.
    SynthDef(name: \handbook_tables, ugenGraphFunc: {
        |out = 0, wavebuf = 0, envbuf = 1,
         fundbuf = 2, formbuf = 3, ampbuf = 4, panbuf = 5, maskbuf = 6,
         fundtime = 10, formtime = 10, amptime = 10, pantime = 10, masktime = 10,
         burst = 1, rest = 0, gate = 1, t_sync = 0|
        // The traversal time is signed: PlayBuf with loop: 1 reads backwards at
        // a negative rate and wraps at the start of the buffer, so -60 crosses
        // the table the other way in the same minute, without a value being
        // rewritten. A trigger on t_sync sends all five readers back to the
        // first frame together.
        var read = { |bufnum, seconds|
            A2K.kr(PlayBuf.ar(numChannels: 1, bufnum: bufnum,
                rate: BufDur.kr(bufnum: bufnum) / seconds,
                trigger: t_sync, startPos: 0, loop: 1));
        };
        var fund = read.value(fundbuf, fundtime);
        var form = read.value(formbuf, formtime);
        var amp = read.value(ampbuf, amptime);
        var pan = read.value(panbuf, pantime);
        // The fifth reader returns a probability rather than a frequency or a
        // position, and the two kinds of masking meet at the trigger: the burst
        // ratio is set by hand, the probability is read from the table. Both do
        // the same thing to the train, which is to take periods out of it.
        var prob = read.value(maskbuf, masktime);
        var trig = Impulse.ar(freq: fund);
        var cycle = (burst + rest).max(1);
        var count = Stepper.ar(trig: trig, reset: 0, min: 0,
            max: cycle - 1, step: 1);
        var masked = CoinGate.ar(prob: prob, in: trig * (count < burst));
        var signal = GrainBuf.ar(
            numChannels: 2,
            trigger: masked,
            dur: form.reciprocal,
            sndbuf: wavebuf,
            rate: form * BufDur.kr(bufnum: wavebuf),
            pos: 0, interp: 4, pan: pan, envbufnum: envbuf
        );
        var envelope = EnvGen.kr(
            envelope: Env.asr(releaseTime: 0.1),
            gate: gate, doneAction: 2
        );
        Out.ar(bus: out, channelsArray: signal * amp * envelope);
    }).add;
    s.sync;

    // Only created if one is not already playing. Re-evaluate this block while
    // it sounds and the trajectories are recomposed underneath it; the synth is
    // never restarted, because the server keeps reading the same buffers.
    if(~tableSynth.isNil, {
        ~tableSynth = Synth(
            defName: \handbook_tables,
            args: [\wavebuf, ~wave, \envbuf, ~envelope,
                \fundbuf, ~fundTab, \formbuf, ~formTab,
                \ampbuf, ~ampTab, \panbuf, ~panTab, \maskbuf, ~maskTab,
                \fundtime, ~looptime, \formtime, ~looptime,
                \amptime, ~looptime, \pantime, ~looptime,
                \masktime, ~looptime],
            target: ~handbookGroup,
            addAction: \addToTail
        );
        "Control tables ready. The instrument now reads them.".postln;
    }, {
        "Tables rewritten under the instrument already playing.".postln;
    });
}).play(clock: AppClock);
);


// ----------------------------------------- 4. Change the traversal while it runs
// Calls on what block 3 defined. Evaluate any one line on its own. Nothing is
// recompiled and the instrument is never restarted.

~setLoop.value(2);      // the same trajectories, two seconds end to end
~setLoop.value(60);     // a minute to cross the tables
~setLoop.value(-60);    // the same minute, backwards: the value is signed
~setLoop.value(10);     // back to ten seconds, forwards

// A traversal time each, in table order: fundamental, formant, amplitude, pan,
// mask. The five stop being a single loop: each returns to its start after its
// own number of seconds, and they coincide only where those periods do.
~setLoops.value(10, -20, 5, 40, 25);

// Back to one loop for all five, and back in step with it: setting them
// together returns them to the same position as well as the same period.
~setLoop.value(10);

// Burst masking, independently of the tables. Below the rhythm threshold this
// is heard as a figure cut out of a steady pulse; above it the ratio imposes
// amplitude modulation on the timbre and divides the fundamental by b + r, so
// subtraction from the train arrives as addition to the spectrum.
~setBurst.value(4, 2);  // 111100111100: Roads's 4:2
~setBurst.value(2, 1);  // b + r = 3: a subharmonic at a third of the fundamental
~setBurst.value(1, 7);  // one in eight: the train becomes the figure
~setBurst.value(1, 0);  // off: every unmasked period carries a pulsaret

// New trajectories, written under the sounding instrument.
Routine({ ~newTables.value; "Tables rewritten.".postln; }).play(clock: AppClock);

// Stop.
~tableSynth.tryPerform(\set, \gate, 0); ~tableSynth = nil;


// ------------------------------------------------------------------- 5. Extras
// The web page plots the tables for you under the cell. Locally:

~curves.fund.plot(name: "fundamental");
~curves.form.plot(name: "formant");
~curves.amp.plot(name: "amplitude");
~curves.pan.plot(name: "pan");
~curves.mask.plot(name: "mask probability");

// The pulsaret and its envelope, the two micro-scale tables:
~pulsarets[\gaussSine].value(~tableSize).plot(name: "pulsaret");
~envelopes[\expodec].value(~tableSize).plot(name: "pulsaret envelope");

// The page lets you draw on those plots. Locally, an editor: five multi-sliders
// holding one value in every eighth of a table, each writing into the buffer
// the instrument is already reading, so a curve can be redrawn while it sounds.
// Generated, drawn, or written by an expression: the instrument reads 2048
// values and does not distinguish between them. Run block 3 first.
(
~tableEditor = {
    var step = 8;
    var specs = (
        fund: ControlSpec(minval: 1, maxval: 1000, warp: \exp),
        form: ControlSpec(minval: 20, maxval: 5000, warp: \exp),
        amp: ControlSpec(minval: 0, maxval: 1, warp: \lin),
        pan: ControlSpec(minval: -1, maxval: 1, warp: \lin),
        mask: ControlSpec(minval: 0, maxval: 1, warp: \lin)
    );
    var buffers = (fund: ~fundTab, form: ~formTab, amp: ~ampTab,
        pan: ~panTab, mask: ~maskTab);
    var window;
    ~tableEditorWindow.tryPerform(\close);   // one editor, not one per evaluation
    window = Window(name: "control tables", bounds: Rect(60, 60, 430, 570));
    window.view.decorator = FlowLayout(bounds: window.view.bounds);
    [\fund, \form, \amp, \pan, \mask].do({ |name|
        var spec = specs[name];
        var points = ~curves[name][(0, step .. ~tableSize - 1)];
        StaticText(parent: window, bounds: Rect(0, 0, 400, 16))
            .string_(name.asString + spec.minval.asString ++ " to "
                ++ spec.maxval.asString);
        MultiSliderView(parent: window, bounds: Rect(0, 0, 400, 86))
            .isFilled_(true)
            .elasticMode_(1)
            .value_(points.collect({ |value| spec.unmap(value.clip(spec.minval, spec.maxval)) }))
            .action_({ |view|
                // Each drawn point stands for one stride of the table, and the
                // values between two of them are interpolated rather than held,
                // so a drawn curve reaches the buffer as a curve and not as 256
                // steps. resamp1 does the same linear reading of a short table
                // that the server does of a long one.
                var drawn = view.value.collect({ |value| spec.map(value) });
                ~curves[name] = drawn.as(Signal).resamp1(~tableSize).as(Array);
                buffers[name].sendCollection(collection: ~curves[name]);
            });
    });
    ~tableEditorWindow = window;
    window.front;
};
~tableEditor.value;
);

// Swap either one while the instrument plays. Both buffers are read by the
// server every grain, so the change is heard on the next pulsar emitted.
~setPulsaret.value(\multicycle);
~setPulsaret.value(\saw);
~setPulsaret.value(\noise);
~setEnvelope.value(\rect);      // widest spectrum: no taper at the edges
~setEnvelope.value(\expodec);
~setEnvelope.value(\fof);

// Draw your own. Any 2048 values will do; this is a table like the others.
(
~wave.sendCollection(collection: Array.fill(~tableSize, { |i|
    var x = i / ~tableSize;
    sin(2pi * x) + (0.4 * sin(2pi * 7 * x)) + (0.2 * sin(2pi * 11 * x));
}) / 1.6);
);

// Record what you hear. The file lands in your recordings folder.
s.record(numChannels: 2);
s.stopRecording;

// Clean up. The gates close first and the buffers are freed a moment later: the
// release lasts 0.1 s, and until it has run out the server is still reading the
// tables it is told to forget.
(
Routine({
    ~handbookSynth.tryPerform(\set, \gate, 0);
    ~tableSynth.tryPerform(\set, \gate, 0);
    ~handbookSynth = nil;
    ~tableSynth = nil;
    0.3.wait;
    [~wave, ~envelope, ~fundTab, ~formTab, ~ampTab, ~panTab, ~maskTab]
        .do({ |buf| buf.tryPerform(\free) });
    ~fundTab = nil; ~formTab = nil; ~ampTab = nil;
    ~panTab = nil; ~maskTab = nil;
    ~handbookGroup.tryPerform(\free);
    ~handbookGroup = nil;
    ~panelWindow.tryPerform(\close);
    ~tableEditorWindow.tryPerform(\close);
    "Session cleared.".postln;
}).play(clock: AppClock);
);
