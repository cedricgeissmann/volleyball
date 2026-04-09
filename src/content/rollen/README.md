# Rollen

Dieses Verzeichnis enthält Volleyball-Rollen/Positionen als YAML-Dateien.

## YAML-Format

Jede Rolle sollte folgende Struktur haben:

```yaml
id: rolle-id
title: Rollentitel
description: Kurze Beschreibung der Rolle
position: Position auf dem Feld (z.B. "Außenangreifer", "Mittelblocker", "Libero")
responsibilities:
  offense:
    - Offensive Verantwortung 1
    - Offensive Verantwortung 2
  defense:
    - Defensive Verantwortung 1
    - Defensive Verantwortung 2
key_skills:
  - Wichtige Fähigkeit 1
  - Wichtige Fähigkeit 2
constraints:
  task: "Hauptaufgabe der Rolle"
  environment: "Typische Spielsituationen"
  individual: "Individuelle Anforderungen"
decision_making:
  - Entscheidungssituation 1: Lösungsansatz
  - Entscheidungssituation 2: Lösungsansatz
```

## Beispiel

```yaml
id: libero
title: Libero
description: Spezialist für Verteidigung und Annahme
position: Libero
responsibilities:
  offense:
    - Präzise Pässe zum Steller
    - Notfall-Steller bei schlechter Annahme
  defense:
    - Führung der Verteidigung
    - Abwehr harter Angriffe
    - Feldabdeckung optimieren
key_skills:
  - Lesen des gegnerischen Angriffs
  - Reaktionsschnelligkeit
  - Präzise Ballannahme
  - Kommunikation
constraints:
  task: "Defensive Stabilität gewährleisten"
  environment: "Hinteres Feld, keine Angriffe über Netzhöhe"
  individual: "Darf nicht angreifen oder blocken"
decision_making:
  - "Harter Angriffsball → Position halten, nicht ausweichen"
  - "Schlechter Pass → Notfall-Steller, Ball hoch und zur Mitte"
  - "Freeball → Aggressive Position, Annahme vorbereiten"
```

## Hinweise

- Dateiname sollte der `id` entsprechen (z.B. `libero.yaml`)
- IDs sollten lowercase mit Bindestrichen sein
- Fokus auf Entscheidungsfindung und situative Anpassungen
- Constraints-Led Approach (CLA) Prinzipien berücksichtigen
- Read & Signal Aspekte einbeziehen
