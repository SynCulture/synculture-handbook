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
// Evaluate the blocks in order. Written for SuperCollider 3.13 or newer.


// ---------------------------------------------------------------- 0. Session
// The browser page does this for you before the first cell appears.
(
s.waitForBoot({
    ~tableSize = 2048;                  // as in the Pulsar Generator
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
         fund = 100, form = 400, amp = 0.5, pan = 0, gate = 1|
        // Added here, not in the figure: smoothing, so a slider move glides,
        // and a gate, so one node can be held and released.
        var fundSmooth = Lag.kr(in: fund, lagTime: 0.05);
        var formSmooth = Lag.kr(in: form, lagTime: 0.05);
        var ampSmooth = Lag.kr(in: amp, lagTime: 0.05);
        // One pulsaret per trigger; silence fills the rest of the period.
        var trig = Impulse.ar(freq: fundSmooth);
        var grdur = formSmooth.reciprocal;
        var rate = formSmooth * BufDur.kr(bufnum: wavebuf);
        var signal = GrainBuf.ar(
            numChannels: 2, trigger: trig, dur: grdur,
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
~handbookSynth.tryPerform(\free);
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

// Or open a panel. The browser page gives you sliders; this is the local one.
(
~panel = {
    var win = Window(name: "pulsar", bounds: Rect(left: 60, top: 60, width: 420, height: 170));
    EZSlider(win, Rect(10, 10, 400, 30), "fund", ControlSpec(1, 2000, \exp),
        { |ez| ~handbookSynth.tryPerform(\set, \fund, ez.value) }, 100);
    EZSlider(win, Rect(10, 45, 400, 30), "form", ControlSpec(20, 5000, \exp),
        { |ez| ~handbookSynth.tryPerform(\set, \form, ez.value) }, 400);
    EZSlider(win, Rect(10, 80, 400, 30), "amp", ControlSpec(0, 1, \lin),
        { |ez| ~handbookSynth.tryPerform(\set, \amp, ez.value) }, 0.5);
    EZSlider(win, Rect(10, 115, 400, 30), "pan", ControlSpec(-1, 1, \lin),
        { |ez| ~handbookSynth.tryPerform(\set, \pan, ez.value) }, 0);
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

        // Allocate once, then write into the same buffers. A synth already
        // reading them takes up the new tables without being restarted.
        if(~fundTab.isNil, {
            ~fundTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            ~formTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            ~ampTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            ~panTab = Buffer.alloc(server: s, numFrames: ~tableSize, numChannels: 1);
            s.sync;
        });
        ~fundTab.sendCollection(collection: ~curves.fund);
        ~formTab.sendCollection(collection: ~curves.form);
        ~ampTab.sendCollection(collection: ~curves.amp);
        ~panTab.sendCollection(collection: ~curves.pan);
        s.sync;
    };
    ~newTables.value;

    // One value per table: the seconds a full traversal takes, signed, so that
    // a negative value crosses the table backwards in the same time. On the web
    // each call is also announced to the page, which draws a playhead per table.
    ~looptime = ~looptime ? 10;
    // All four together. The reading position is reset with them: one loop
    // means one position and not merely one period, so what is heard is a
    // single traversal rather than four that happen to share a length.
    ~setLoop = { |seconds = 10|
        ~looptime = seconds;
        ~tableSynth.tryPerform(\set, \fundtime, seconds, \formtime, seconds,
            \amptime, seconds, \pantime, seconds, \t_sync, 1);
    };
    // One each, in table order: fundamental, formant, amplitude, pan. Nothing
    // is reset here: they are meant to come apart.
    ~setLoops = { |fund = 10, form = 10, amp = 10, pan = 10|
        ~tableSynth.tryPerform(\set, \fundtime, fund, \formtime, form,
            \amptime, amp, \pantime, pan);
    };

    // ---- The instrument that reads them ----
    // One traversal of each table per its own number of seconds: the loop is
    // the process.
    SynthDef(name: \handbook_tables, ugenGraphFunc: {
        |out = 0, wavebuf = 0, envbuf = 1,
         fundbuf = 2, formbuf = 3, ampbuf = 4, panbuf = 5,
         fundtime = 10, formtime = 10, amptime = 10, pantime = 10,
         gate = 1, t_sync = 0|
        // The traversal time is signed: PlayBuf with loop: 1 reads backwards at
        // a negative rate and wraps at the start of the buffer, so -60 crosses
        // the table the other way in the same minute, without a value being
        // rewritten. A trigger on t_sync sends all four readers back to the
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
        var signal = GrainBuf.ar(
            numChannels: 2,
            trigger: Impulse.ar(freq: fund),
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
                \ampbuf, ~ampTab, \panbuf, ~panTab,
                \fundtime, ~looptime, \formtime, ~looptime,
                \amptime, ~looptime, \pantime, ~looptime],
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

// A traversal time each, in table order: fundamental, formant, amplitude, pan.
// The four stop being a single loop: each returns to its start after its own
// number of seconds, and they coincide only where those periods do.
~setLoops.value(10, -20, 5, 40);

// Back to one loop for all four, and back in step with it: setting the four
// together returns them to the same position as well as the same period.
~setLoop.value(10);

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

// The pulsaret and its envelope, the two micro-scale tables:
~pulsarets[\gaussSine].value(~tableSize).plot(name: "pulsaret");
~envelopes[\expodec].value(~tableSize).plot(name: "pulsaret envelope");

// The page lets you draw on those plots. Locally, an editor: four multi-sliders
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
        pan: ControlSpec(minval: -1, maxval: 1, warp: \lin)
    );
    var buffers = (fund: ~fundTab, form: ~formTab, amp: ~ampTab, pan: ~panTab);
    var window = Window(name: "control tables", bounds: Rect(60, 60, 430, 460));
    window.view.decorator = FlowLayout(bounds: window.view.bounds);
    [\fund, \form, \amp, \pan].do({ |name|
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
                // Each drawn point stands for one stride of the table.
                var drawn = view.value.collect({ |value| spec.map(value) });
                ~curves[name] = Array.fill(~tableSize, { |i| drawn[i div: step] });
                buffers[name].sendCollection(collection: ~curves[name]);
            });
    });
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

// Clean up.
(
~handbookSynth.tryPerform(\set, \gate, 0); ~handbookSynth = nil;
~tableSynth.tryPerform(\set, \gate, 0); ~tableSynth = nil;
[~wave, ~envelope, ~fundTab, ~formTab, ~ampTab, ~panTab].do({ |buf| buf.tryPerform(\free) });
~handbookGroup.tryPerform(\free);
);
