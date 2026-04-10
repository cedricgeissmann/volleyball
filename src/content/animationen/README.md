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
- **270°** (oder **-90°**): Nach oben
- **Negative Winkel**: z.B. -30° = 330° (leicht nach oben rechts)

**Wichtig für symmetrische Bewegungen:**
- Beide Arme/Beine sollten **identische Winkel** haben für symmetrische Posen
- Bei Bewegungen: Schulter und Ellbogen bewegen sich **zusammen** (nicht gegengleich)
- Beispiel: Liegestütz - beide Schultern UND beide Ellbogen haben denselben Winkel

### Forward Kinematics System

Die Animation verwendet Forward Kinematics vom **Hüftpunkt** aus:
- Alle Positionen werden vom Hüftpunkt berechnet
- Spine-Winkel bestimmt die Körperausrichtung
- Beine sind typischerweise 180° versetzt zum Spine
- Arme bewegen sich relativ zur Schulter

**Beispiel Liegestütz-Geometrie:**
- Spine bei -30° (nach oben geneigt) → Beine bei 150° (180° versetzt, nach unten geneigt)
- Spine bei 0° (horizontal) → Beine bei 180° (horizontal)

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

**Liegestütz (oben, Arme gestreckt):**
```json
{
  "spine": -30,           // Körper nach oben geneigt
  "leftShoulder": 90,     // Beide Schultern nach unten
  "rightShoulder": 90,
  "leftElbow": 90,        // Beide Ellbogen nach unten (gestreckt)
  "rightElbow": 90,
  "leftWrist": 0,         // Hände flach (nach rechts zeigend)
  "rightWrist": 0,
  "leftHip": 150,         // Beine 180° versetzt zum Spine
  "rightHip": 150,
  "leftKnee": 150,        // Knie = Hip (gerade Beine)
  "rightKnee": 150,
  "leftAnkle": 90,        // Füße nach unten
  "rightAnkle": 90
}
```

**Liegestütz (unten, Arme gebeugt):**
```json
{
  "spine": 0,             // Körper horizontal
  "leftShoulder": 160,    // Schultern und Ellbogen bewegen sich zusammen
  "rightShoulder": 160,
  "leftElbow": 20,        // Ellbogen gebeugt (nach oben/rechts)
  "rightElbow": 20,
  "leftWrist": 0,
  "rightWrist": 0,
  "leftHip": 180,         // Beine 180° versetzt zum Spine
  "rightHip": 180,
  "leftKnee": 180,
  "rightKnee": 180,
  "leftAnkle": 90,
  "rightAnkle": 90
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

### Praktische Tipps für das Erstellen von Animationen

**1. Symmetrie beachten:**
- Für symmetrische Übungen: Beide Arme/Beine haben **identische Winkel**
- `leftShoulder` = `rightShoulder`, `leftElbow` = `rightElbow`, etc.

**2. Gelenk-Koordination:**
- Bei Arm-Bewegungen: Schulter und Ellbogen bewegen sich **zusammen** in die gleiche Richtung
- Bei gestreckten Gliedmaßen: Gelenke haben gleiche Winkel (z.B. `leftHip` = `leftKnee` für gerade Beine)

**3. Spine und Beine:**
- Beine sind typischerweise **180° versetzt** zum Spine
- Beispiel: Spine = -30° → Beine = 150°
- Beispiel: Spine = 0° → Beine = 180°

**4. Ellbogen-Beugung:**
- Gestreckte Arme: Ellbogen-Winkel = Schulter-Winkel
- Gebeugte Arme: Ellbogen-Winkel verändert sich zusammen mit Schulter-Winkel
- Bei Liegestützen: Ellbogen beugt sich "nach oben/hinten" (kleiner Winkel wie 20°)

**5. Schrittweise vorgehen:**
- Zuerst die Grundpose definieren (z.B. Liegestütz oben)
- Spine-Winkel festlegen und Beine 180° versetzen
- Beide Arme mit identischen Winkeln positionieren
- Keyframe für extreme Position erstellen (z.B. Liegestütz unten)
- Testen und iterativ anpassen

## Volleyball Court-Animationen

TODO: Schema wird später definiert
