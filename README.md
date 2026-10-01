# SYNCULTURE Synthesis Handbook

Content repository for the Synthesis Handbook, an open-access interactive reader on synthesis techniques. Part of the [SYNCULTURE](https://github.com/synculture) research project.

## Structure

```
entries/      Handbook entry markdown files (Eleventy-compatible with YAML frontmatter)
code/         Downloadable .scd per entry, adapted for a local SuperCollider
img/          Figures and diagrams, organised by entry slug
samples/      Audio wavetable files (.wav) for interactive demos
synthdefs/    Compiled SuperCollider SynthDef binaries (.scsyndef) for WASM playback
js/           The live session: runtime, workspace, examples, instruments
runtime/sc/   SuperCollider compiled to WebAssembly (sclang and scsynth)
scripts/      Runtime fetch with SHA-256 pinning
handbook.json Collection metadata
```

## Entry format

Each entry is a markdown file with YAML frontmatter:

```yaml
---
title: Entry Title
subtitle: One-line description
author: Author Name
toc:
  - id: section-slug
    text: Section Name
references:
  - "Author (Year). <em>Title</em>. Publisher."
related:
  - slug: other-entry
    title: Other Entry
---
```

The body uses standard markdown with optional inline HTML for interactive demos (`.synth-demo`, `.pulsaret-builder`), figures, tables, and cross-references via the `{% xref "slug", "label" %}` shortcode.

## Entry shape

Entries render in the same order: title, subtitle, author, contents list, body,
references. There is no header image; the opening figure belongs in the body,
numbered `Fig. 01` like any other.

Every entry names its author. `author` takes one name or a list of them:

```yaml
author: A. Name
# or, where an entry is genuinely co-written
author:
  - A. Name
  - B. Name
```

Authorship means having written the entry. Reading it, commenting on it or
being cited in it does not make someone an author; acknowledge that in the
entry's own prose or references instead.

## Section order

Entries are free in the middle but fixed at the end. The last section of the
body, immediately before the References footer, is **Code download**: a link to
a `.scd` in `code/` plus a short note on how it differs from what runs on the
page.

The distinction matters and should be stated in every entry that has a live
session. Code in the browser runs against a WebAssembly language and server with
the page owning part of the session, so it carries buffers the page allocates
and marker lines the page parses out of the post window (`HB_TABLE`, `HB_LOOP`).
None of that works in a local SuperCollider. The downloadable file is the same
material adapted to run locally, with whatever extras the browser cannot offer
(GUI windows, plotting, recording, larger catalogues).

## The live session

Entries with `session: true` in their frontmatter run SuperCollider in the
reader's browser. Both halves are WebAssembly, with no server process and no
network round trip: `runtime/sc/` holds `sclang.wasm` with its class library in
`sclang.data`, and `scsynth.wasm`.

The two are joined directly, in `js/sc-runtime.mjs`:

```js
lang.onOsc       = bytes => synth.sendOsc(new Uint8Array(bytes));
synth.onOscReply = bytes => lang.sendOsc(new Uint8Array(bytes));
```

sclang's outbound OSC is handed to scsynth and the replies handed back. Because
the bridge carries both directions, `s.waitForBoot`, `s.sync`, `/d_recv` and
node notifications behave as they do in a desktop session.

| file | |
|---|---|
| `js/sc-runtime.mjs` | Boots both modules, bridges OSC, owns the audio graph, scope and peak meter. Runs inside one iframe, so removing the iframe tears the session down. |
| `js/sc-workspace.mjs` | The parent side: editable cells, drafts, the monitoring panel, curve plotting, the postMessage protocol. |
| `js/sc-examples.mjs` | The published source of each cell, keyed by the id used in an entry. |
| `js/pulsaret-builder.js` | The drawable waveform and envelope canvases. |

Three routes reach the server, deliberately kept apart. Evaluating a cell goes
through `lang.runCode`. Moving a slider sends a hand-built `/n_set` straight to
scsynth, bypassing the interpreter, which is why dragging recompiles nothing.
Drawing on a canvas sends `/b_setn` in 512-value chunks straight into the
buffer. Since sclang has no structured return path, the runtime scrapes
token-prefixed markers out of the post window and strips them before display:
`HB_READY_`, `HB_NODE_=`, `HB_BUFS_=`, plus `HB_TABLE` for plottable curves and
`HB_LOOP` for the traversal playhead.

### Cross-origin isolation is required

The runtime needs `SharedArrayBuffer`, which browsers grant only to cross-origin
isolated documents. Any host serving this must send, on the handbook and runtime
paths:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin   (runtime only)
```

Without them `sc-runtime.mjs` refuses to start, by design, rather than failing
obscurely later. The website that consumes this repository sets them in its own
`src/_headers`, since they are a deploy concern rather than content.

### Rebuilding the runtime

The binaries are committed so a checkout runs without fetching anything. To
re-fetch and verify them against the recorded hashes:

```bash
node scripts/setup-sc.mjs
```

It refuses any download whose SHA-256 does not match `scripts/sc-runtime.json`.
See `runtime/sc/NOTICE.txt` for provenance and licensing: these are pinned
binary snapshots of an experimental, unmerged SuperCollider branch, not a
reproducible build from source. `SUPERCOLLIDER-INTEGRATION.md` holds the design
brief and the acceptance checks still outstanding.

## Integration

This repository is consumed as a git submodule by the SYNCULTURE website, which
provides the rendering infrastructure: Eleventy templates, CSS, and the site's
own JavaScript. The handbook carries its own live-session machinery, so the
entries, the SuperCollider they run, and the runtime that runs it stay together.

## Adding an entry

1. Create a new `.md` file in `entries/` with the frontmatter schema above.
2. Place figures in `img/<entry-slug>/`.
3. Place the downloadable source in `code/<entry-slug>.scd` and link it from a
   final `## Code download` section.
4. For entries with audio demos, compile the SynthDef in SuperCollider and place the `.scsyndef` in `synthdefs/`.
5. The entry will appear automatically in the handbook index when the website is built.

## License

Content is part of the SYNCULTURE research project, funded by the European Research Council (ERC) Consolidator Grant, hosted at the University of Birmingham.
