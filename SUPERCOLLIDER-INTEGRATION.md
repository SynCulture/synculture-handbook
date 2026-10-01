# SuperCollider integration in the Synthesis Handbook

Design brief, 20 September 2026. A local prototype is implemented at
`/handbook/workspace/`; see README.md for startup and test instructions.
Handbook-wide migration and production deployment remain future work.

## Intended experience

The handbook should provide both the SuperCollider language and synthesis engine. Readers should be able to edit and evaluate SuperCollider source, define instruments, manipulate them with graphical controls, inspect output and errors, and develop their own variations within an entry.

The target is one coherent session: code cells share language state, and code and graphical instruments address the same synthesis server. This requires live language evaluation and SynthDef compilation, in addition to playback of precompiled SynthDefs.

Browser-only execution is used for the local prototype. Desktop feature parity is not established by the existence of a WebAssembly language build.

## Interface

- A compact session bar exposes Start session, Stop all, Restart session, master output level, and separate language/server status.
- SuperCollider examples become editable cells with Evaluate selection, Evaluate cell, Reset source, and Download source. Historical code remains an archival figure unless explicitly adapted for execution.
- All executable cells within an entry share variables, definitions, buffers, buses, groups, and clocks.
- A shared post window displays interpreter output, compilation errors, and server failures. Errors remain available while the reader edits the relevant cell.
- Waveform construction, envelope construction, playback, parameters, and scope form one instrument section. Published examples explicitly connect its controls to named language variables or synth parameters.
- Arbitrary code edits do not automatically generate or update graphical controls. A documented binding connects supported parameters to the interface.
- Wide screens can show text and an expandable workspace together. Narrow screens stack the editor, instrument, and post window with explicit buttons.
- Local draft persistence and source download preserve readers' edits. Session restart clears runtime state without silently deleting source edits.
- Navigation must state whether it ends the running session. Preserving execution between entries would require a persistent application shell; it is a separate implementation decision.

## Current implementation

[`src/js/supersonic-demo.js`, `loadSynthDef`]: `await supersonic.loadSynthDef(bytes);`

The existing widgets load binary definitions and send synthesis commands. The module does not create a language interpreter or evaluate the displayed SuperCollider source.

[`node_modules/supersonic-scsynth/package.json`, version]: `"version": "0.70.0"`

This is the locally installed SuperSonic version inspected for the brief.

## Runtime evidence

[SuperCollider WebAssembly branch README, introduction]: “scsynth and sclang have been ported to WebAssembly, exposing a JavaScript API to interact with them.”

The experimental branch provides a direct route to evaluating SuperCollider in the browser. [Pinned source](https://github.com/capital-G/supercollider/blob/4deec944d35f12ed3f7f71cb76e8b181b84b2cc3/README_WASM.md).

[Same README, sclang limitations]: “No file access yet.”

File-based sample workflows need an explicit browser adaptation. The README also identifies clock synchronisation and external OSC limitations. These must be tested against handbook examples rather than assumed compatible.

[SuperCollider PR #7440, API status checked 20 September 2026]: `"state": "open"`, `"merged": false`.

The language port is an experimental dependency, not a merged release feature. [Pull request](https://github.com/supercollider/supercollider/pull/7440).

[`supersonic.d.ts`, OscChannel]: `send(oscData: Uint8Array): boolean;`

[Same file, server output event]: `'out:osc'` carries `oscData: Uint8Array`.

A bridge between the experimental language and existing SuperSonic server is a candidate architecture (inferred from these interfaces and the language branch's OSC API). Compatibility has not been demonstrated. The bridge must carry replies as well as requests, preserve bundles and timing, and coordinate node and buffer allocation.

## Runtime choice

Evaluate the matched experimental sclang/scsynth pair first as a reference. Then assess whether the same language build can reliably control the existing SuperSonic engine, preserving its sample-loading integration. Do not run two competing synthesis engines for code and graphical widgets.

A hosted native sclang session with an OSC bridge to browser audio is an alternative if the user accepts hosted execution. It introduces per-reader process isolation and scheduling across a network, so it should not be treated as a transparent replacement for a browser-local interpreter.

## Acceptance checks before handbook-wide adoption

1. Evaluate expressions and retain variables between cells; report syntax and runtime errors accurately.
2. Compile a new SynthDef from edited source, add it to the server, create a Synth, change parameters, and release it.
3. Verify server replies and synchronisation with `s.sync`, buffer operations, and node lifecycle notifications.
4. Execute Routine, TempoClock, and Pbind examples; measure scheduling under normal foreground use and document background-tab behaviour.
5. Run the pulsar example with loaded samples and drawn waveform/envelope buffers, using one shared allocation strategy.
6. Confirm explicit Bus/Group routing and the supported UGen set. Test at both 44.1 and 48 kHz where the browser permits those rates.
7. Stop both scheduled language activity and sounding synths. Provide an independent audio mute and recovery from a stalled interpreter.
8. Verify Chromium, Firefox, and Safari behaviour, including loading, audio activation, keyboard use, and narrow-screen controls.
9. Host pinned runtime assets with required isolation headers and upstream notices. Record exact builds and known unsupported features.

The first implementation milestone is a dedicated handbook workspace passing the language-to-audio round trip. Existing entry widgets should migrate only after that path is verified.
