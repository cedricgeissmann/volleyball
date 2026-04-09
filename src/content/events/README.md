# Events

Dieses Verzeichnis enthält Volleyball-Events (Spiele, Turniere, etc.) als YAML-Dateien.

## YAML-Format

Jedes Event sollte folgende Struktur haben:

```yaml
id: event-id
title: Event-Titel
type: Event-Typ (z.B. "Spiel", "Turnier", "Training", "Trainingslager")
date: YYYY-MM-DD
time: "HH:MM"
location: Ort des Events
teams:
  - Team 1
  - Team 2
description: Kurze Beschreibung des Events
details: |
  Detaillierte Informationen zum Event.
  Kann mehrzeilig sein.
status: Status (z.B. "geplant", "bestätigt", "abgesagt")
```

## Beispiel

```yaml
id: spiel-herren1-vs-team-x-2024-04-15
title: Herren 1 vs. Team X
type: Spiel
date: 2024-04-15
time: "19:00"
location: Sporthalle Muttenz
teams:
  - Herren 1
  - Team X
description: Meisterschaftsspiel 2. Liga
details: |
  Wichtiges Heimspiel gegen Team X.
  
  Besammlung: 18:30 Uhr
  Spielbeginn: 19:00 Uhr
  
  Fokus: Defense First, Connected Defense
status: bestätigt
```

## Hinweise

- Dateiname sollte der `id` entsprechen (z.B. `spiel-herren1-vs-team-x-2024-04-15.yaml`)
- IDs sollten lowercase mit Bindestrichen sein und Datum enthalten
- Datum im ISO-Format (YYYY-MM-DD)
- Zeit im 24h-Format (HH:MM)
- Teams sollten den Team-IDs entsprechen (z.B. "herren-1", "u20")
