# Animations-Schema

Dieses Verzeichnis enthält JSON-Dateien für Übungs-Animationen.

## Stickfigure-Animationen (Kraftübungen)

### Schema

```json
{
  "type": "stickfigure",
  "duration": 3000,      // Gesamtdauer in ms
  "loop": true,          // Wiederholen ja/nein
  "easing": "ease-in-out", // CSS easing function
  "anchorPoint": "hip",  // Optional: Fixpunkt der Animation ('hip', 'hands', 'feet', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot')
  "keyframes": [
    {
      "time": 0,         // Zeitpunkt in ms
      "joints": {
        // Alle Winkel in Grad (0-360)
        // 0° = rechts, 90° = unten, 180° = links, 270° = oben
        "spine": 90,
        "leftShoulder": 0,
        "rightShoulder": 180,
        "leftElbow": 0,
        "rightElbow": 180,
        "leftWrist": 0,
        "rightWrist": 180,
        "leftHip": 270,
        "rightHip": 270,
        "leftKnee": 180,
        "rightKnee": 180,
        "leftAnkle": 90,
        "rightAnkle": 90
      }
    }
  ]
}
```

### Gelenk-Definitionen

**Körpermitte:**
- `spine`: Wirbelsäule/Torso-Ausrichtung

**Arme (links):**
- `leftShoulder`: Schulter zu Ellbogen
- `leftElbow`: Ellbogen zu Handgelenk
- `leftWrist`: Handgelenk zu Hand

**Arme (rechts):**
- `rightShoulder`: Schulter zu Ellbogen
- `rightElbow`: Ellbogen zu Handgelenk
- `rightWrist`: Handgelenk zu Hand

**Beine (links):**
- `leftHip`: Hüfte zu Knie
- `leftKnee`: Knie zu Knöchel
- `leftAnkle`: Knöchel zu Fuß

**Beine (rechts):**
- `rightHip`: Hüfte zu Knie
- `rightKnee`: Knie zu Knöchel
- `rightAnkle`: Knöchel zu Fuß

### Winkel-Konvention

- **0°**: Nach rechts
- **90°**: Nach unten
- **180°**: Nach links
- **270°**: Nach oben

### Beispiel-Posen

**Stehend (neutral):**
```json
{
  "spine": 90,
  "leftShoulder": 270, "rightShoulder": 270,
  "leftElbow": 270, "rightElbow": 270,
  "leftHip": 270, "rightHip": 270,
  "leftKnee": 270, "rightKnee": 270,
  "leftAnkle": 90, "rightAnkle": 90
}
```

**Liegestütz (oben):**
```json
{
  "spine": 0,
  "leftShoulder": 90, "rightShoulder": 90,
  "leftElbow": 0, "rightElbow": 0,
  "leftHip": 180, "rightHip": 180,
  "leftKnee": 180, "rightKnee": 180,
  "leftAnkle": 180, "rightAnkle": 180
}
```

### Anchor Points

Der `anchorPoint` bestimmt, welcher Körperteil während der Animation fixiert bleibt (bei Koordinate 0,0):

- **`hip`** (Standard): Hüfte bleibt fixiert - geeignet für stehende Übungen (z.B. Kniebeugen)
- **`ground`**: Ground-Line Anchor - mehrere Körperteile auf einer Bodenlinie fixiert (siehe unten)
- **`hands`**: Mittelwert zwischen beiden Händen - geeignet für einfache Übungen
- **`feet`**: Mittelwert zwischen beiden Füßen - geeignet für Handstände
- **`leftHand`**, **`rightHand`**, **`leftFoot`**, **`rightFoot`**: Einzelne Extremitäten fixieren

#### Ground-Line Anchor (Empfohlen für Bodenübungen)

Für Übungen bei denen **mehrere Punkte am Boden fixiert** sind (z.B. Liegestütze: Hände UND Füße):

```json
{
  "type": "stickfigure",
  "anchorPoint": "ground",
  "groundPoints": ["leftHand", "rightHand", "leftFoot", "rightFoot"],
  "keyframes": [...]
}
```

**Funktionsweise:**
- Alle angegebenen `groundPoints` werden auf einer gemeinsamen Bodenlinie (Y=0) platziert
- Die Animation wird horizontal zentriert am Mittelwert der groundPoints
- Perfekt für Liegestütze, Planks, Burpees, etc.

**Standard groundPoints** (wenn nicht angegeben): `["leftHand", "rightHand", "leftFoot", "rightFoot"]`

**Beispiel: Liegestütze mit fixierten Händen und Füßen**
```json
{
  "type": "stickfigure",
  "anchorPoint": "ground",
  "groundPoints": ["leftHand", "rightHand", "leftFoot", "rightFoot"],
  "keyframes": [...]
}
```

**Beispiel: Plank (nur Hände und Zehen)**
```json
{
  "type": "stickfigure",
  "anchorPoint": "ground",
  "groundPoints": ["leftHand", "rightHand", "leftAnkleJoint", "rightAnkleJoint"],
  "keyframes": [...]
}
```

## Volleyball Court-Animationen

TODO: Schema wird später definiert
