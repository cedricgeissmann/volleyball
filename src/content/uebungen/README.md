# Übungen

Dieses Verzeichnis enthält Übungen in YAML-Format. Übungen können verschiedene Typen sein: Kraftübungen, Ausdauerübungen, Volleyball-Übungen, etc.

## Struktur

Übungen können in Unterordnern organisiert werden:

```
uebungen/
├── kraft/           # Kraftübungen
├── volleyball/      # Volleyball-spezifische Übungen
└── beispiel.yaml    # Beispiele
```

## YAML-Schema

### Basis-Felder (alle Übungstypen)

```yaml
id: eindeutige-id              # Pflicht: Eindeutige ID
titel: Übungstitel             # Pflicht: Titel der Übung
typ: kraft                     # Optional: kraft, ausdauer, volleyball, etc.
beschreibung: |                # Optional: Beschreibung
  Detaillierte Beschreibung der Übung
kategorie: Krafttraining       # Optional: Kategorie für Gruppierung
fokus: Oberkörper             # Optional: Fokusbereich
ziele:                        # Optional: Lernziele
  - Erstes Ziel
  - Zweites Ziel
```

### Übungsdauer/Wiederholungen

**Eine** der folgenden Optionen verwenden:

```yaml
# Option 1: Feste Dauer
dauer: 20                     # Dauer in Minuten

# Option 2: Wiederholungen (einzeln)
wiederholungen: 15            # Feste Anzahl

# Option 3: Wiederholungsbereich
wiederholungen: "10-20"       # Bereich (wird auf Web zufällig, im Druck als Bereich)

# Option 4: Bedingung
bedingung: "Bis zur Erschöpfung"
```

### Animation (für Kraftübungen)

```yaml
animation: liegestuetze.anim.json   # Datei in /src/content/animationen/
anleitung:                          # Schritt-für-Schritt Anleitung
  - Schritt 1
  - Schritt 2
```

## Vollständiges Beispiel (Kraftübung)

```yaml
id: liegestuetze
typ: kraft
titel: Liegestütze
beschreibung: Klassische Liegestütze für Brust, Trizeps und Schultern
kategorie: Krafttraining
wiederholungen: "10-20"
ziele:
  - Brustmuskulatur stärken
  - Trizeps kräftigen
fokus: Oberkörper
animation: liegestuetze.anim.json
anleitung:
  - Hände schulterbreit aufsetzen
  - Körper bildet eine gerade Linie
  - Bis 90° Ellbogen beugen
```

## Vollständiges Beispiel (Volleyball)

```yaml
id: serve-receive-drill
typ: volleyball
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

- **IDs:** Verwende kebab-case (z.B. `liegestuetze`, `3er-pass`)
- **Dateiname:** Sollte der `id` entsprechen
- **Wiederholungsbereiche:** Realistische Bereiche (z.B. 10-20 statt 5-50)
- **Animationen:** Siehe `/src/content/animationen/README.md`
- **CLA:** Constraints-Led Approach Prinzipien berücksichtigen
