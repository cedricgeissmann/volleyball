# Übungen

Dieses Verzeichnis enthält Volleyball-Übungen als YAML-Dateien.

## YAML-Format

Jede Übung sollte folgende Struktur haben:

```yaml
id: uebung-id
titel: Übungstitel
beschreibung: Kurze Beschreibung der Übung
kategorie: Kategorie (z.B. "Aufwärmen", "Technik", "Taktik", "Spiel")
ziele:
  - Erstes Lernziel
  - Zweites Lernziel
fokus: Fokus-Bereich (z.B. "Defense", "Angriff", "Taktik")
dauer: 20
```

## Beispiel

```yaml
id: serve-receive-drill
titel: Serve-Receive 6v6
beschreibung: Vollständiges Serve-Receive-Training im 6v6
kategorie: Taktik
ziele:
  - Defense First - Sicherheit vor Risiko
  - Read & Signal - Kommunikation vor dem Aufschlag
  - Connected Defense - Als Einheit bewegen
fokus: Annahme & Verteidigung
dauer: 20
```

## Hinweise

- Dateiname sollte der `id` entsprechen (z.B. `serve-receive-drill.yaml`)
- IDs sollten lowercase mit Bindestrichen sein
- Constraints-Led Approach (CLA) Prinzipien berücksichtigen
- Coaching Points sollten auf Team-Ziele Bezug nehmen
