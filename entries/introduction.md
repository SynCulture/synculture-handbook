---
title: Introduction
subtitle: What the Handbook is, how to use it, and what each entry contains.
published: true
reference: true
permalink: /handbook/introduction/
toc:
  - id: what-this-is
    text: What this is
  - id: the-shape-of-an-entry
    text: The shape of an entry
  - id: running-the-code
    text: Running the code
  - id: taking-it-away
    text: Taking it away
  - id: sources
    text: Sources
  - id: terms
    text: Terms
  - id: credits
    text: Credits
---

## What this is

The Synthesis Handbook is an open-access reader on synthesis techniques, written
as part of SYNCULTURE. Each entry takes one technique and treats it as two things
at once: a historical object with a genealogy and a set of commitments, and a
working instrument you can run while you read about it.

Those two readings are usually kept apart. Textbooks explain a technique and
append examples; histories situate a technique and leave the sound to the
reader's imagination. The position here is that a synthesis technique is not
fully described by either on its own. A parameter range is a historical
artefact. A table length is an argument about musical time. The way to show that
is to let the reader change the parameter and hear what the argument commits
them to.

## The shape of an entry

Entries follow the same order, so a reader who knows one knows where to look in
the next.

An **overview** states the technique in a paragraph. A **genealogy** traces where
it came from, which is rarely a single line of descent. A section on **how it
works** gives the formal definition, the figures, and the parameters, quoted from
the technique's own literature rather than paraphrased. A **web implementation**
builds the technique in code, cell by cell, in a live session. Sections on
**implementations** describe the programs that encapsulated the technique, and
what their design decisions encode. **Aesthetics** asks what the technique
commits its user to. **Music** points to the recordings. A **code download** gives
you the whole thing to take away, and the **references** close the entry.

Not every technique needs every section, and the order gives way where the
material asks for it. What does not vary is that the executable part sits in the
middle rather than at the end, because the argument runs through it.

## Running the code

An entry with a live session carries a **Start session** control. Starting it
loads SuperCollider's language and its synthesis server, both compiled to
WebAssembly, into the page. This takes a few seconds and downloads several
megabytes. Nothing is installed, and nothing is sent anywhere: the language, the
server and the audio graph all run in your browser.

Once the session is running, each code cell can be evaluated with its own
button. Cells share one session, so definitions, buffers and variables persist
between them and order matters. A cell is marked according to whether evaluating
it makes sound. Cells are editable, and your edits are kept in your browser
until you reset them; they are yours and go no further.

Inside a cell, <kbd>Shift Enter</kbd> follows SuperCollider's own rule rather
than running everything. A selection runs on its own. With nothing selected, if
the cursor sits inside a block whose brackets each begin a line, that whole
block runs as one expression; otherwise the single line under the cursor runs.
Whatever ran flashes briefly. The Evaluate button runs the entire cell, and so
does <kbd>Shift Cmd Enter</kbd>. Cells written as a page of separate calls are
meant to be used a line at a time.

The post window and the scope sit in the left column and stay there while you
read. **Stop all** silences the server and clears scheduled activity. If the
audio stalls, restarting the session is always safe.

The session needs a browser with `SharedArrayBuffer` available, which is why
these pages are served with cross-origin isolation headers. Recent Firefox,
Chrome and Safari all work. Audio will not start until you interact with the
page, which is a browser rule rather than a choice made here.

## Taking it away

Every entry with a session ends with a **code download**: a `.scd` file for a
local SuperCollider.

It is not a copy of what is on the page. Code running in the browser carries
things that only mean something there, because the page owns part of the
session: buffers the page allocates and fills from a graphic editor, and marker
lines printed to the post window that the page parses back out to draw plots and
playheads. None of that works in a normal SuperCollider. The downloadable file
replaces that scaffolding with local equivalents and adds what a browser cannot
offer, usually GUI windows, plotting and recording.

## Sources

Claims are tied to sources, and quotations carry page references so they can be
checked. Where a source is quoted, the quotation comes first and the reading of
it after. Where something is inferred rather than stated, the entry says so.
Where sources disagree, the entry says that too rather than choosing silently.

This matters more than usual here, because much of the material is undocumented
or documented only in passing: manuals, interface screenshots, mailing list
posts, code that survives without its program, figures whose captions no longer
match what they show.

## Terms

Terms carry a definition on hover and resolve to a shared
{% xref "microsound", "glossary" %}. An entry can therefore be entered at any
point rather than read from the top. Where a term is contested, or where the
choice between two words is itself an argument, the glossary says which lineage
each carries.

## Credits

The Handbook is designed by Marcin Pietruszewski as part of SYNCULTURE: its
structure, its entry template and the browser runtime the entries are built on.

Entries are authored collaboratively by the project team, and each page names
its author. The intention is that the Handbook does not stay a project
publication. It will be opened for community authorship, so that entries can be
proposed, extended and corrected by people working with these techniques outside
SYNCULTURE, with the same requirements that apply here: sources cited, code that
runs, and a version anyone can take away.

The in-browser runtime is SuperCollider compiled to WebAssembly, from work
contributed to the SuperCollider project. SuperCollider is GPL, and the notice
accompanying the compiled binaries is served alongside them. Source for the
examples in each entry is available from the entry itself.
