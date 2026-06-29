---
layout: page.njk
title: The Synthesis Handbook
permalink: /handbook/
eleventyExcludeFromCollections: true
---

The Synthesis Handbook is an open-access, web-based critical reader on synthesis techniques. Each entry is a self-contained interactive page that integrates historical context, technical explanation, formal definition, schematic figures, executable code, and a live in-browser synthesis instrument. The audio engine is SuperCollider's scsynth compiled to WebAssembly, so the code examples on each page are not approximations or Web Audio reconstructions but the actual synthesis running natively in the browser.

The Handbook is designed as field infrastructure for SYNCULTURE: a pedagogical resource in which formal definition, historical commentary, cultural analysis, and sounding instrument are inseparable rather than a textbook with examples appended. Entries are written for community extension and structured to support both independent study and workshop use.

{% set ref = ["Introduction", "Code", "Glossary", "Bibliography"] %}
<ul class="handbook-index-list">
  {% for entry in collections.handbookEntries %}
  <li class="{% if entry.data.title in ref %}index-ref{% else %}index-entry{% endif %}">
    <a href="{{ entry.url }}">{{ entry.data.title }}</a> <span class="entry-sep">—</span> <span class="entry-desc">{{ entry.data.subtitle }}</span>
  </li>
  {% endfor %}
</ul>
