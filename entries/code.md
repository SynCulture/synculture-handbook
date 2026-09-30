---
title: Code
subtitle: Downloadable source for every entry, adapted to run in a local SuperCollider.
published: true
reference: true
permalink: /handbook/code/
---

Each entry with a live session has a version of its code prepared for a local
SuperCollider. This page collects those files.

They are not copies of what runs on the entry pages. Code in the browser carries
things that only mean something there, because the page owns part of the
session: buffers the page allocates and fills from a graphic editor, and marker
lines printed to the post window which the page reads back to draw plots and
playheads. None of that works outside the page. Each file here replaces that
scaffolding with local equivalents and adds what a browser cannot offer, usually
GUI windows, plotting and recording.

Run them in SuperCollider 3.13 or newer. Evaluate the blocks in order; each file
says what it needs at the top.

<ul class="handbook-index-list handbook-downloads">
{% for dl in handbookDownloads %}
  {% for entry in collections.handbookEntries %}{% if entry.data.published and entry.fileSlug == dl.slug %}
  <li class="index-entry">
    <a href="/code/{{ dl.file }}" download>{{ dl.file }}</a>
    <span class="entry-sep">&mdash;</span>
    <span class="entry-desc">{{ entry.data.title }}, {{ dl.kb }} kB &nbsp;·&nbsp; <a href="{{ entry.url }}">read the entry</a></span>
  </li>
  {% endif %}{% endfor %}
{% endfor %}
</ul>
