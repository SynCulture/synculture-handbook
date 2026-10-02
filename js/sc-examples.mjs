export const examples = [
  {
    id: "definition",
    sounds: false,
    title: "Build the synthesis",
    description: "Emit the pulsaret as a train. The trigger rate is the fundamental; the formant sets particle duration independently of it. Wait for “Instrument ready”.",
    code: String.raw`(
Routine({
    // After de Campo and Pietruszewski, "Microsound", in The SuperCollider
    // Book, 2nd ed. (MIT Press, 2025), fig. 16.17: the trigger runs at the
    // fundamental, while grain duration and playback rate both follow the
    // formant. ~wave and ~envelope are allocated with the session and hold
    // whatever the pulsaret builder above currently draws.
    SynthDef(name: \handbook_live, ugenGraphFunc: {
        |out = 0, wavebuf = 0, envbuf = 1,
         fund = 100, form = 400, amp = 0.5, pan = 0, gate = 1|
        // Added here, not in the figure: smoothing, so a slider move
        // glides, and a gate, so one node can be held and released.
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
    "Instrument ready. Evaluate cell 02 to play.".postln;
}).play(clock: AppClock);
)`,
  },
  {
    id: "play",
    sounds: true,
    title: "Play and transform",
    description: "Create the synth controlled by the instrument panel. Re-evaluating replaces the current voice. Unmute output after using Stop all.",
    code: String.raw`(
if(SynthDescLib.global.at(\handbook_live).isNil, {
    "Evaluate cell 01 first: it compiles the definition.".postln;
}, {
    ~handbookSynth.tryPerform(\free);
    if(~handbookGroup.isNil, {
        ~handbookGroup = Group.head(aGroup: s.defaultGroup);
    });
    ~handbookSynth = Synth(
        defName: \handbook_live,
        args: [\wavebuf, ~wave, \envbuf, ~envelope,
            \fund, 100, \form, 400, \amp, 0.5],
        target: ~handbookGroup,
        addAction: \addToTail
    );
});
)`,
  },
  {
    id: "tables",
    sounds: true,
    title: "Build the tables and hand the instrument to them",
    description: "Every parameter becomes a table, and a synth is created to read them. These are generated here, but they can equally be drawn: the plots below the cell are editable, and a pointer press writes into the same buffer the instrument reads. The panel's voice is released as the tables take over. Re-evaluate while it plays: the tables are rewritten under the instrument rather than restarting it.",
    code: String.raw`(
Routine({
    // Cell 02's voice, if it is still held, is released here. The tables are
    // about to drive the same instrument, and leaving the panel's node running
    // would put two voices in the air instead of showing control move from the
    // hand to the table. Closing the gate lets it release rather than cut.
    if(~handbookSynth.notNil, {
        ~handbookSynth.set(\gate, 0);
        ~handbookSynth = nil;
        "Panel voice released: control moves to the tables.".postln;
    });

    // ---- Tables ----
    // Held in a function so the cell below can regenerate them without
    // recompiling the definition or restarting the instrument.
    // After fig. 16.16 in the SuperCollider Book, ch. 16: the exponents map a
    // 0..1 curve onto useful ranges. 2048 values per table, as in the Pulsar
    // Generator, where every control object is a wavetable of that length
    // whatever its time scale.
    ~tableSize = 2048;
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
        if(~fundTab.isNil or: { ~fundTab.numFrames != ~tableSize }, {
            [~fundTab, ~formTab, ~ampTab, ~panTab].do({ |buf| buf.tryPerform(\free); });
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
        ~tableBufs = (fund: ~fundTab, form: ~formTab,
            amp: ~ampTab, pan: ~panTab);

        // Publish every eighth value for plotting under this cell, together
        // with the buffer it came from and that stride: the page needs both to
        // write back into the same buffer when a reader draws on the plot. The
        // string is joined rather than posted as an array: posting truncates
        // long collections with "...etc...", which would cut the values short.
        ~tableStep = 8;
        [\fund, \form, \amp, \pan].do({ |name|
            var curve = ~curves[name];
            var points = curve[(0, ~tableStep .. curve.size - 1)].round(0.0001);
            ("HB_TABLE " ++ name ++ " " ++ ~tableBufs[name].bufnum
                ++ " " ++ ~tableStep ++ " [" ++ points.join(",") ++ "]").postln;
        });
    };
    ~newTables.value;

    // ---- Setting the traversal ----
    // One value per table: the seconds a full traversal takes. It is signed,
    // and a negative value crosses the table backwards in that same time, so
    // -60 is a minute in reverse. Each call tells the page as well as the
    // server, so the playheads follow.
    ~looptime = ~looptime ? 10;
    ~loops = ~loops ? (fund: ~looptime, form: ~looptime,
        amp: ~looptime, pan: ~looptime);
    // The page draws a playhead per table from these announcements: one line
    // per table while they are drifting, and a single line for all four when
    // they are put back on one loop and read from the start together.
    ~announce = {
        [\fund, \form, \amp, \pan].do({ |name|
            ("HB_LOOP " ++ name ++ " " ++ ~loops[name]).postln;
        });
    };
    // All four together. The reading position is reset with them: one loop
    // means one position and not merely one period, so what is heard is a
    // single traversal rather than four that happen to share a length.
    ~setLoop = { |seconds|
        ~looptime = seconds;
        ~loops = (fund: seconds, form: seconds, amp: seconds, pan: seconds);
        ~tableSynth.tryPerform(\set, \fundtime, seconds, \formtime, seconds,
            \amptime, seconds, \pantime, seconds, \t_sync, 1);
        ("HB_LOOP " ++ seconds).postln;
    };
    // One each, in table order: fundamental, formant, amplitude, pan. Nothing
    // is reset here: they are meant to come apart.
    ~setLoops = { |fund = 10, form = 10, amp = 10, pan = 10|
        ~loops = (fund: fund, form: form, amp: amp, pan: pan);
        ~tableSynth.tryPerform(\set, \fundtime, fund, \formtime, form,
            \amptime, amp, \pantime, pan);
        ~announce.value;
    };

    // ---- The instrument that reads them ----
    // One traversal of each table per its own number of seconds: the loop is
    // the process.
    SynthDef(name: \handbook_tables, ugenGraphFunc: {
        |out = 0, wavebuf = 0, envbuf = 1,
         fundbuf = 2, formbuf = 3, ampbuf = 4, panbuf = 5,
         fundtime = 10, formtime = 10, amptime = 10, pantime = 10,
         gate = 1, t_sync = 0|
        // One traversal of a table per its own number of seconds. The value is
        // signed: PlayBuf with loop: 1 reads backwards at a negative rate and
        // wraps at the start of the buffer, so -60 crosses the table the other
        // way in the same minute, without a value being rewritten. A trigger on
        // t_sync sends all four readers back to the first frame together.
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

    // Only created if one is not already playing. Re-evaluate this cell while
    // it sounds and the trajectories are recomposed underneath it; the synth
    // is never restarted, because the server keeps reading the same buffers.
    if(~tableSynth.isNil, {
        ~tableSynth = Synth(
            defName: \handbook_tables,
            args: [\wavebuf, ~wave, \envbuf, ~envelope,
                \fundbuf, ~fundTab, \formbuf, ~formTab,
                \ampbuf, ~ampTab, \panbuf, ~panTab,
                \fundtime, ~loops.fund, \formtime, ~loops.form,
                \amptime, ~loops.amp, \pantime, ~loops.pan],
            target: ~handbookGroup,
            addAction: \addToTail
        );
        // Tell the page where the traversal starts, how long it takes and in
        // which direction, so it can draw a playhead across each table.
        ("HB_LOOP " ++ ~looptime).postln;
        "Control tables ready. The instrument now reads them.".postln;
    }, {
        "Tables rewritten under the instrument already playing.".postln;
    });
}).play(clock: AppClock);
)`,
  },
  {
    id: "traversal",
    sounds: true,
    // Single calls, not one program: each line is a decision about the reading.
    lineByLine: true,
    title: "Change the traversal while it runs",
    description: "Single calls on the setters cell 03 defined. The traversal time is the only control over the reading, and it is signed: -60 crosses the tables backwards in a minute. Nothing is recompiled and the instrument is never restarted. Each call stands in a box of its own, because running them together would set the traversal a dozen times over in one go.",
    code: String.raw`// Faster: the same trajectories, two seconds end to end.
~setLoop.value(2);

// Slower: a minute to cross the tables.
~setLoop.value(60);

// The same minute, backwards. The value is signed, and the rate with it, so
// the tables are read from the end and wrap at the start: nothing is rewritten,
// the particle is unchanged, and only the order of the reading reverses.
~setLoop.value(-60);

// Back to ten seconds, forwards.
~setLoop.value(10);

// A traversal time each, in table order: fundamental, formant, amplitude, pan.
// The four stop being a single loop. Each returns to its start after its own
// number of seconds, and they coincide only where those periods do.
~setLoops.value(10, -20, 5, 40);

// Back to one loop for all four, and back in step with it: setting the four
// together returns them to the same position as well as the same period.
~setLoop.value(10);`,
  },
  {
    id: "drive",
    sounds: true,
    // A page of separate calls, not one program: there is nothing sensible for
    // a single button to run, so the cell offers none.
    lineByLine: true,
    title: "Rewrite the tables and the particle while they sound",
    description: "Where cell 04 changes how the tables are read, these calls change what is read: fresh trajectories, then the pulsaret itself. Each writes into a buffer the server is already reading, so nothing is recompiled and the instrument is never restarted. Each call stands in a box of its own; where one runs over several lines it is wrapped in brackets and the box holds the whole block. The pulsaret builder above stays live throughout: draw on either canvas while the tables are playing and the new shape is heard on the next pulsar emitted.",
    code: String.raw`// New trajectories, written under the sounding instrument.
Routine({ ~newTables.value; "Tables rewritten.".postln; }).play(clock: AppClock);

// The pulsaret is a table as well, and nothing says it has to be drawn.
// These write straight into the buffers the builder writes into, so the
// change is heard on the next pulsar emitted. The canvases above will no
// longer show what the instrument is reading; draw on one to take it back.
(
~wave.sendCollection(collection: Array.fill(~wave.numFrames, { |i|
    var x = i / ~wave.numFrames;
    (sin(2pi * x) + (0.4 * sin(2pi * 7 * x)) + (0.2 * sin(2pi * 11 * x))) / 1.6;
}));
)

// A rectangular envelope: no taper at the edges, so the widest spectrum.
~envelope.sendCollection(collection: Array.fill(~envelope.numFrames, { 1.0 }));

// Back to something smoother: a Gaussian, which narrows the band again.
(
~envelope.sendCollection(collection: Array.fill(~envelope.numFrames, { |i|
    exp(-0.5 * (((i / ~envelope.numFrames) - 0.5) / 0.15).squared);
}));
)

// Stop, and let the playhead stop with it.
~tableSynth.tryPerform(\set, \gate, 0); ~tableSynth = nil; "HB_LOOP stop".postln;`,
  },
];
