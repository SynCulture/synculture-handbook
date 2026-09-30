---
title: Cite
subtitle: How to cite the Handbook and its entries, and why entries are cited as encyclopedia entries rather than as web pages.
published: true
reference: true
permalink: /handbook/cite/
---

Entries are individually authored and are revised over time. Both facts shape
how they are cited: the author of an entry is the person to credit, and a
citation has to say which state of the entry was read.

## Citing an entry

Every entry carries its own citation, under **Cite this entry** at the foot of
the page, in Chicago, Harvard, APA, MLA and BibTeX. Take it from there rather
than assembling one by hand: it is built from the entry's own author and
edition, so it cannot fall out of step with the page it sits on.

What each of those formats names is the same: the author, the entry, the
Handbook, and the edition.

<p class="citation-example">Pietruszewski, Marcin. 2026. “Pulsar Synthesis.” <em>The Synthesis Handbook</em>, edition of October 1, 2026. SYNCULTURE. https://synculture.net/handbook/pulsar-synthesis/</p>

In text this gives (Pietruszewski 2026). Where an entry has been revised and the
later edition is the one used, name that edition instead, and use its year.

## Citing the Handbook as a whole

Cite the Handbook itself only when the reference is to the publication rather
than to anything argued in it. A claim, a description of a technique, or a piece
of code belongs to the entry that carries it, and should be cited from there.

The Handbook's edition is the date of its most recent entry, since that is what
changes when the Handbook changes.

{% citeHandbook site.url %}

## Editions

An entry is a living document. Its text and its code are revised as the
technique is better understood, as sources are found, and as the runtime
changes. A citation that names only a year therefore names a moving target: two
readers a year apart would write the same line and mean different texts.

Each entry is published in a dated edition, and each revision that alters what
the entry says appears as a later one. Changes that do not affect the substance
of an entry, typographic and other corrections, are made within the current
edition without a new label.

Earlier editions remain available, so a citation to an edition can be followed
to the text that was read. The entries are kept in a public repository,
[SynCulture/synculture-handbook](https://github.com/SynCulture/synculture-handbook),
which the site is built from; its history holds every state each entry has been
in, and the edition dates are recoverable from it. The archive is therefore not
a separate service that has to be maintained alongside the Handbook, but the
same material the pages are made of.

Name the edition you read rather than the current one. If you are working from a
printed or downloaded copy, the edition is given on the entry page.

## Why this form

The Handbook is cited as an encyclopedia rather than as a website, and the
distinction is not cosmetic.

A website is cited as a whole, with an access date standing in for a version,
and authorship attaching to the organisation that publishes it. An encyclopedia
is cited by entry, with the entry's author credited, the entry's date given, and
the work named as the container. Encyclopedia entries are signed because they
are authored: they make arguments, select examples, and take positions their
authors are answerable for.

That is the case here. Entries are written by named authors, they argue for a
reading of the technique they treat rather than summarising a consensus, and
they are revised under their authors' names. The Handbook is the container, not
the author.

Two consequences follow for anyone citing. First, credit and cite the entry's
author, not the Handbook or the project. Second, prefer the edition to an access
date: an access date records when you looked, whereas an edition records what
you read, and only the second can be retrieved by someone checking your
reference.

## Citing the code

Each entry's code is part of the entry and is covered by citing it. Where the
code itself is the object of discussion, in a comparison of implementations for
example, cite the entry and name the file, which is listed with the others under
[Code](/handbook/code/). The files are revised with the entries, so the edition
identifies the code as well as the prose.

The runtime that executes them is not ours: SuperCollider is cited separately,
and its licence and authorship are recorded with the compiled binaries.
