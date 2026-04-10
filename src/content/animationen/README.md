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
  "leftShoulder": 270, "rightShoulder": 270,
  "leftElbow": 180, "rightElbow": 180,
  "leftHip": 0, "rightHip": 0,
  "leftKnee": 180, "rightKnee": 180,
  "leftAnkle": 90, "rightAnkle": 90
}
```

## Volleyball Court-Animationen

TODO: Schema wird später definiert
