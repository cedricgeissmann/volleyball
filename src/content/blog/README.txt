# Blog

Dieses Verzeichnis enthält Blog-Posts als MDX-Dateien (mdsvex).

## Dateiformat

Blog-Posts verwenden Markdown mit YAML-Frontmatter und können Svelte-Komponenten enthalten.

```mdx
---
title: Post-Titel
date: 2024-04-09
author: Autor Name
tags:
  - Tag1
  - Tag2
description: Kurze Beschreibung für SEO und Vorschau
published: true
---

# Hauptüberschrift

Dein Markdown-Inhalt hier...

## Unterüberschrift

Du kannst auch Svelte-Komponenten verwenden:

<script>
  import MyComponent from '$lib/components/MyComponent.svelte';
</script>

<MyComponent />

Mehr Text...
```

## Frontmatter-Felder

- **title** (erforderlich): Titel des Blog-Posts
- **date** (erforderlich): Veröffentlichungsdatum im Format YYYY-MM-DD
- **author** (optional): Autor des Posts
- **tags** (optional): Array von Tags für Kategorisierung
- **description** (optional): Kurze Beschreibung für SEO
- **published** (optional): Boolean, ob der Post veröffentlicht werden soll (default: true)

## Beispiel

```mdx
---
title: Defense First - Die Grundlage unseres Spiels
date: 2024-04-09
author: Cedric Geissmann
tags:
  - CLA
  - Defense
  - Philosophie
description: Warum Defense First der Schlüssel zum Erfolg ist
published: true
---

# Defense First

Im Volleyball wird oft der spektakuläre Angriff gefeiert. Doch ohne eine 
solide Verteidigung gibt es keine zweite Chance.

## Die Philosophie

Defense First bedeutet nicht, dass wir defensiv spielen. Es bedeutet, dass 
wir **zuerst** die defensive Absicherung gewährleisten, bevor wir riskante 
Angriffe starten.

## Praktische Umsetzung

- Immer mindestens 2 Spieler in der Defensive
- Kommunikation **vor** dem Angriffsball
- Risiko nur bei guter Absicherung

## Fazit

Eine starke Verteidigung ermöglicht kreative Angriffe. Defense First ist 
die Grundlage für Smart not Hard.
```

## Hinweise

- Dateiname wird zur URL (z.B. `defense-first.mdx` → `/blog/defense-first`)
- Dateinamen sollten lowercase mit Bindestrichen sein
- Verwende aussagekräftige Dateinamen für SEO
- Tags helfen bei der Kategorisierung und Filter-Funktion
- Du kannst Svelte-Komponenten importieren und verwenden
