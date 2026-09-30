# SYNCULTURE Synthesis Handbook

Content repository for the Synthesis Handbook, an open-access interactive reader on synthesis techniques. Part of the [SYNCULTURE](https://github.com/synculture) research project.

## Structure

```
entries/      Handbook entry markdown files (Eleventy-compatible with YAML frontmatter)
code/         Downloadable .scd per entry, adapted for a local SuperCollider
img/          Figures and diagrams, organised by entry slug
samples/      Audio wavetable files (.wav) for interactive demos
synthdefs/    Compiled SuperCollider SynthDef binaries (.scsyndef) for WASM playback
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

## Integration

This repository is consumed as a git submodule by the SYNCULTURE website. The website provides the rendering infrastructure (Eleventy templates, CSS, JavaScript, SuperSonic WASM runtime).

## Adding an entry

1. Create a new `.md` file in `entries/` with the frontmatter schema above.
2. Place figures in `img/<entry-slug>/`.
3. Place the downloadable source in `code/<entry-slug>.scd` and link it from a
   final `## Code download` section.
4. For entries with audio demos, compile the SynthDef in SuperCollider and place the `.scsyndef` in `synthdefs/`.
5. The entry will appear automatically in the handbook index when the website is built.

## License

Content is part of the SYNCULTURE research project, funded by the European Research Council (ERC) Consolidator Grant, hosted at the University of Birmingham.
