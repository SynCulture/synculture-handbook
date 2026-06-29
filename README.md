# SYNCULTURE Synthesis Handbook

Content repository for the Synthesis Handbook, an open-access interactive reader on synthesis techniques. Part of the [SYNCULTURE](https://github.com/synculture) research project.

## Structure

```
entries/      Handbook entry markdown files (Eleventy-compatible with YAML frontmatter)
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

## Integration

This repository is consumed as a git submodule by the SYNCULTURE website. The website provides the rendering infrastructure (Eleventy templates, CSS, JavaScript, SuperSonic WASM runtime).

## Adding an entry

1. Create a new `.md` file in `entries/` with the frontmatter schema above.
2. Place figures in `img/<entry-slug>/`.
3. For entries with audio demos, compile the SynthDef in SuperCollider and place the `.scsyndef` in `synthdefs/`.
4. The entry will appear automatically in the handbook index when the website is built.

## License

Content is part of the SYNCULTURE research project, funded by the European Research Council (ERC) Consolidator Grant, hosted at the University of Birmingham.
