---
title: Bibliography
subtitle: Collected references from all Handbook entries.
published: true
reference: true
permalink: /handbook/bibliography/
---

Sources cited across the Handbook, gathered in one place. Each entry carries its
own reference list at the foot of the page; this list is built from those, so it
cannot fall out of step with them. Entries published so far are the only source
of what appears here, and the list will grow as entries do.

<ul class="ref-list">
{% for ref in collections.handbookBibliography %}
  <li>{{ ref | safe }}</li>
{% endfor %}
</ul>
