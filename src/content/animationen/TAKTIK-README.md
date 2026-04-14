# Taktik-Animations-Schema

Dieses Dokument beschreibt das JSON-Format für taktische Volleyball-Übungsanimationen.

## Dateiname-Konvention

```
<übungs-id>.taktik.json
```

Beispiel: `aufschlag-rotation.taktik.json`

## Grundstruktur

```json
{
  "type": "taktik",
  "court": "volleyball-half",
  "loop": false,
  "beschreibung": "Kurzbeschreibung der Taktik",
  "objects": {
    "spielerA": { "type": "player", "label": "A", "team": "home" },
    "spielerB": { "type": "player", "label": "B", "team": "home" },
    "ball":     { "type": "ball" }
  },
  "zones": [
    {
      "id": "zone1",
      "x": 0.0, "y": 0.0,
      "width": 0.33, "height": 0.5,
      "color": "#ff000033",
      "label": "Zone 1"
    }
  ],
  "steps": [
    {
      "duration": 1500,
      "positions": {
        "spielerA": { "x": 0.2, "y": 0.3 },
        "spielerB": { "x": 0.5, "y": 0.8 },
        "ball":     { "x": 0.5, "y": 0.1 }
      }
    },
    {
      "duration": 1500,
      "positions": {
        "spielerA": { "x": 0.4, "y": 0.5 },
        "spielerB": { "x": 0.5, "y": 0.6 },
        "ball":     { "x": 0.4, "y": 0.4 }
      }
    }
  ]
}
```

---

## Felder

### Top-Level

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `type` | `"taktik"` | ja | Muss `"taktik"` sein |
| `court` | string | ja | Feldtyp: `"volleyball-half"` oder `"volleyball-full"` |
| `loop` | boolean | nein | Animation wiederholen (Standard: `false`) |
| `beschreibung` | string | nein | Kurze Beschreibung der Taktik |
| `objects` | object | ja | Alle Objekte (Spieler, Ball) die auf dem Feld vorkommen |
| `zones` | array | nein | Statische Zonen/Bereiche auf dem Feld |
| `steps` | array | ja | Animationsschritte (mind. 1) |

---

### `court` Werte

| Wert | Beschreibung |
|------|-------------|
| `"volleyball-half"` | Halbes Feld (9m × 9m) – eine Seite |
| `"volleyball-full"` | Ganzes Feld (18m × 9m) – beide Seiten mit Netz |

---

### `objects` – Objekt-Definitionen

Jedes Objekt hat eine eindeutige ID (Key) und folgende Eigenschaften:

```json
{
  "spielerA": {
    "type": "player",
    "label": "A",
    "team": "home"
  },
  "gegner1": {
    "type": "player",
    "label": "X",
    "team": "away"
  },
  "ball": {
    "type": "ball"
  }
}
```

#### Objekt-Typen (`type`)

| Typ | Beschreibung |
|-----|-------------|
| `"player"` | Spieler (Kreis mit Label) |
| `"ball"` | Ball |

#### Spieler-Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `type` | `"player"` | ja | Objekt-Typ |
| `label` | string | nein | Angezeigtes Label (1-3 Zeichen, Standard: Key) |
| `team` | `"home"` \| `"away"` | nein | Team-Zugehörigkeit (beeinflusst Farbe, Standard: `"home"`) |

---

### `zones` – Statische Bereiche

```json
{
  "id": "zone1",
  "x": 0.0,
  "y": 0.0,
  "width": 0.33,
  "height": 0.5,
  "color": "#ff000033",
  "label": "Zone 1"
}
```

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | string | Eindeutige ID |
| `x`, `y` | number (0–1) | Position (normalisiert, Ursprung oben-links) |
| `width`, `height` | number (0–1) | Größe (normalisiert) |
| `color` | CSS-Farbe | Füllfarbe inkl. Alpha (z.B. `"#ff000033"`) |
| `label` | string | Optionales Label |

---

### `steps` – Animationsschritte

```json
{
  "duration": 1500,
  "positions": {
    "spielerA": { "x": 0.2, "y": 0.3 },
    "ball":     { "x": 0.5, "y": 0.1 }
  },
  "arrows": {
    "spielerA": { "moveType": "sprint" },
    "ball":     { "moveType": "angriff" }
  }
}
```

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `duration` | number (ms) | Dauer des Übergangs zum nächsten Schritt |
| `positions` | object | Positionen aller Objekte in diesem Schritt |
| `arrows` | object | Optional: Pfeil-Typen für Bewegungen aus diesem Schritt heraus |

#### `positions` – Koordinaten

Alle Koordinaten sind **normalisiert (0–1)** relativ zur Feldgröße:
- `x = 0` = linke Feldkante
- `x = 1` = rechte Feldkante
- `y = 0` = obere Feldkante (Netzseite bei Halbfeld)
- `y = 1` = untere Feldkante (Grundlinie bei Halbfeld)

---

## Pfeil-Typen

### Laufwege (Spielerbewegungen)

Verwendet für alle Objekte vom Typ `"player"`. Farbe und Stärke kommunizieren die Intensität.

| `moveType` | Farbe | Strichstärke | Bedeutung |
|-----------|-------|-------------|-----------|
| `"sprint"` | Dunkelblau `#1565C0` | 4px | Voller Sprint |
| `"lauf"` | Blau `#1E88E5` | 3px | Normaler Lauf (Standard) |
| `"schritt"` | Hellblau `#90CAF9` | 2px | Schrittweise / langsam |

### Ballwege

Verwendet für alle Objekte vom Typ `"ball"`. Gestrichelter Pfeil, Farbe nach Spielaktion.

| `moveType` | Farbe | Strich-Stil | Bedeutung |
|-----------|-------|------------|-----------|
| `"angriff"` | Rot `#D32F2F` | gestrichelt, 4px | Schlag / Angriffsball |
| `"finte"` | Orange `#E64A19` | gestrichelt, 3px | Finte / Kurzer Ball |
| `"downball"` | Dunkelorange `#F57C00` | gestrichelt lang, 3px | Downball |
| `"pass"` | Grün `#2E7D32` | gestrichelt, 3px | Pass / Zuspiel |
| `"gratisball"` | Hellgrün `#558B2F` | gepunktet, 3px | Gratisball / einfacher Ball |
| `"service"` | Lila `#6A1B9A` | gestrichelt, 3px | Aufschlag |

Wenn kein `moveType` angegeben ist:
- Spieler: `"lauf"` (Standard)
- Ball: `"pass"` (Standard)

---

## Koordinaten-Konvention

Das normalisierte Koordinatensystem (0–1) wird auf die SVG-Darstellung gemappt:

```
(0,0) ───────────────── (1,0)
  │                       │
  │    Volleyball-Feld     │
  │                       │
(0,1) ───────────────── (1,1)
```

**Volleyball-Halbfeld (9m × 9m):**
- Netz bei `y = 0`
- Grundlinie bei `y = 1`
- Angriffszone bei `y = 0.33` (3m-Linie)

**Volleyball-Ganzfeld (18m × 9m):**
- Netz in der Mitte bei `y = 0.5`
- Grundlinien bei `y = 0` und `y = 1`
- 3m-Linien bei `y = 0.17` und `y = 0.83`

---

## Vollständiges Beispiel: Aufschlag-Rotation

```json
{
  "type": "taktik",
  "court": "volleyball-half",
  "loop": false,
  "beschreibung": "Rotation nach Aufschlag des Gegners",
  "objects": {
    "s1": { "type": "player", "label": "S", "team": "home" },
    "s2": { "type": "player", "label": "A", "team": "home" },
    "s3": { "type": "player", "label": "B", "team": "home" },
    "s4": { "type": "player", "label": "C", "team": "home" },
    "s5": { "type": "player", "label": "D", "team": "home" },
    "s6": { "type": "player", "label": "L", "team": "home" },
    "ball": { "type": "ball" }
  },
  "steps": [
    {
      "duration": 0,
      "positions": {
        "s1": { "x": 0.75, "y": 0.25 },
        "s2": { "x": 0.5,  "y": 0.25 },
        "s3": { "x": 0.25, "y": 0.25 },
        "s4": { "x": 0.75, "y": 0.75 },
        "s5": { "x": 0.5,  "y": 0.75 },
        "s6": { "x": 0.25, "y": 0.75 },
        "ball": { "x": 0.5, "y": 0.05 }
      }
    },
    {
      "duration": 2000,
      "positions": {
        "s1": { "x": 0.75, "y": 0.45 },
        "s2": { "x": 0.5,  "y": 0.45 },
        "s3": { "x": 0.25, "y": 0.45 },
        "s4": { "x": 0.75, "y": 0.7 },
        "s5": { "x": 0.5,  "y": 0.7 },
        "s6": { "x": 0.25, "y": 0.7 },
        "ball": { "x": 0.5, "y": 0.45 }
      },
      "arrows": {
        "ball": { "moveType": "gratisball" }
      }
    }
  ]
}
```
