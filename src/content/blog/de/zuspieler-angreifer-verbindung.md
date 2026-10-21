---
title: "Die Verbindung zwischen Zuspieler und Angreifer: Wie das Spiel flüssig wird"
date: 2026-11-10
author: Cedric Geissmann
tags:
  - Zuspiel
  - Angriff
  - Timing
  - Wahrnehmung
  - Verteidigung
description: "Flüssiges Spiel entsteht nicht durch Technik, sondern durch die Verbindung zwischen Zuspieler und Angreifer. Mit dem Angriffsfenster als gemeinsamem Bezugspunkt — und warum dasselbe Konzept auch in der Verteidigung funktioniert."
published: true
---

<script>
  import SetterAttackerFlow from '$lib/components/blog/SetterAttackerFlow.svelte';
  import AttackWindowAnatomy from '$lib/components/blog/AttackWindowAnatomy.svelte';
  import AttackWindow3D from '$lib/components/blog/AttackWindow3D.svelte';
  import DefenseWindowRead from '$lib/components/blog/DefenseWindowRead.svelte';
</script>

> **Anmerkung:** Alles, was in diesem Blog beschrieben wird, sind ausschliesslich die Gedanken des Autors zu diesem Thema. Es werden hier keine wissenschaftlich belegten Theorien verwendet. Falls es dazu Forschung gibt, wird sie später ergänzt.

## Warum wir schnelle Angriffe wollen

Damit gutes Volleyball entstehen kann, brauchen wir schnelle Angriffe. Das moderne Volleyball lebt davon. Dafür gibt es einige Gründe, und ein paar davon zählen wir hier auf.

1. **Das Zuspiel wird tiefer.** Wer mit schnellerem Angriffstiming arbeitet, spielt weniger hoch zu. Das macht es für den Zuspieler einfacher, den Ball konstant zu halten und immer ungefähr dasselbe Tempo zu treffen — er braucht weniger Kraft und gewinnt dadurch Präzision.
2. **Die Abweichung wird kleiner.** Bei einem tieferen Ball fällt die Streuung in der Gesamthöhe weniger ins Gewicht. Das führt direkt zu einem präziseren Timing.
3. **Der Ball ist im Schlagfenster langsamer.** Er hat weniger Vertikalgeschwindigkeit, wenn er in das Schlagfenster des Angreifers kommt — es ist also einfacher, ihn genau zu treffen. Bei einem schnell fallenden Ball braucht man einen schnellen Arm, und den haben nicht alle.
4. **Der Gegner kommt unter Druck.** Wir erzeugen Zeitdruck auf den Block und auf die Verteidigung.

Das sind viele gute Argumente. Aber wo liegt der Haken?

## Der Haken: Das Timing verschiebt sich

Schnelles Spiel wird als schwierig empfunden, und das zu Recht: Das Timing bis zum Anlauf verschiebt sich massiv zuungunsten des Angreifers. In dieser modernen Form kann ein Angreifer nicht warten, bis er sieht, dass das Zuspiel in seine Zone kommt — dann ist er zu langsam. Er muss bereits unterwegs zu seinem Angriffsfenster sein. Kommt nun ein unpräziser Pass, funktioniert am Angriff nichts mehr.

Genau dieser Schritt ist der schwere. Wir schauen uns hier an, wie wir ihn einfach machen können, und entwickeln ein System, mit dem Zuspieler und Angreifer **asynchron** kommunizieren können und trotzdem am selben Ort ankommen — mit der Absicht, das Spiel schneller zu machen.

## Wer hat die Kontrolle?

Bevor wir uns die Lösung anschauen, müssen wir einen anderen Aspekt der Angriffssituation verstehen: Wer hat überhaupt die Kontrolle über den Angriff? Nur wenn wir das verstehen, können wir etwas gegen das Problem unternehmen.

Chronologisch gesehen hat zuerst der Zuspieler die Kontrolle, danach geht sie an den Angreifer über. Hier wird es tricky: Das geht nur dann schön auf, wenn der Angreifer für Anlauf und Sprung weniger Zeit braucht, als der Ball von den Händen des Zuspielers bis ins Angriffsfenster unterwegs ist. Und genau das reicht eben nicht. Wir haben hier also eine **Überschneidung der Zeitlinien**.

<SetterAttackerFlow />

Die Grafik zeigt diese Überschneidung direkt. Der Angreifer braucht rund 1,7 Sekunden von der Startposition bis zum Schlag. Der Ball ist bei einem schnellen Aussenzuspiel nach etwa 0,8 Sekunden im Fenster. Beides zusammen bedeutet: Der Commit — der Moment, in dem der Anlauf startet und das Timing festgelegt ist — liegt **vor** dem Zuspielkontakt. Beim Quick ist es noch extremer; da ist der Angreifer bereits in der Luft, bevor der Zuspieler den Ball berührt.

Wegen dieser Überschneidung muss der Angreifer die Kontrolle an den Zuspieler abgeben und darauf vertrauen, dass der Ball in die gewünschte Zone kommt. Das scheint im ersten Moment sehr schwer, besonders wenn das Zuspiel schnell kommt — aber es spielt uns absolut in die Karten. Der Zuspieler muss nämlich nur noch präzise diese eine Zone treffen. Das macht es auch für den Angreifer einfacher, weil der Ball ja präzise in dieser Zone ankommt. Als Bonus muss der Angreifer das Trägheitsmoment nicht mehr überwinden, um zum Ball zu hetzen — er ist bereits unterwegs.

Es ergibt also alles Sinn. Wir müssen es jetzt nur noch umsetzen. Das ist oft schwer, aber wieso?

## Warum uns das so schwerfällt

In fast allen Situationen im Volleyball ist man als Spieler in der vollständigen Kontrolle über Timing und Position zum Ball. Alle Übungen, die wir machen — besonders das Einschlagen — suggerieren einem Spieler ebenfalls, dass er in Kontrolle der Situation bleibt. Ein Angreifer lernt also, dass er für das Timing zuständig ist, und versucht, die Kontrolle bei sich zu behalten.

Wie wir aber gesehen haben, funktioniert das nicht. Wir müssen hier aktiv einen Bruch machen und unser Vertrauen bewusst in den Zuspieler setzen. Das ist schwer und braucht am Anfang sicher einen Slot im [Arbeitsspeicher](/blog/de/arbeitsspeicher-blicktechnik). Genau deshalb müssen wir es aktiv machen — nur so brechen wir die alten Muster auf.

Bis jetzt haben wir viel Zeit mit der Analyse verbracht, und der einzige Lösungsvorschlag lautet: mehr Vertrauen in den Zuspieler und Kontrolle abgeben auf der Seite des Angreifers. Jetzt schauen wir uns das Framework an, mit dem sich das auch umsetzen lässt. Wichtig ist dabei, dass alle ein ähnliches Bild davon im Kopf haben — deshalb gibt es hier auch ein paar Visualisierungen. Das Framework ist das **Angriffsfenster**.

## Das Angriffsfenster

Das Angriffsfenster ist, ganz einfach gesagt, eine Zone, in der ein Angreifer den Ball schlagen kann. Wie viele man davon möchte, wie man sie benennt und wo genau sie liegen, ist für jedes Team anders. Wir schauen uns hier gar nicht die genauen Angriffsfenster an, sondern nur die Positionen 2, 3, 4 und 6. Die Position 3 ist etwas spezieller, die betrachten wir danach noch im Detail. Hier sind alle diese Fenster mal im Raum eingezeichnet.

<AttackWindow3D />

Die Angriffsfenster sehen relativ gross aus. Das hat zwei Gründe:

- Ein Angreifer kann den Ball an mehreren Stellen in dieser Zone schlagen. Wenn man ein wenig zögert, kann man warten, bis der Ball am Block vorbei ist, und auf der Aussenseite an den Block schlagen.
- Der Zuspieler kann nicht beliebig genau spielen — das muss er aber auch nicht. Der Angreifer kann im Absprung genügend Kontrolle in die Situation bringen, um das Angriffsfenster etwas zu verschieben.

### Jedes Fenster bekommt einen Namen

Wir können diese Angriffsfenster nun benennen, zum Beispiel: Igel, Hase, Adler und Faultier. Wenn ich als Angreifer «Faultier» rufe, dann habe ich knapp eine Sekunde Zeit, um meinen Kopf so hoch wie möglich in dieses Fenster zu bekommen. Ist mein Kopf hoch im Fenster, kann ich den Ball abwarten, einen kontrollierten Angriff schlagen und den Gegner unter Zeitdruck setzen.

Ein Zuspieler muss jetzt nicht mehr kontrollierend eingreifen. Er muss den Ball nur mit der einstudierten Maximalhöhe in die Faultier-Zone spielen und kann seinen ganzen Arbeitsspeicher dafür verwenden. Das Problem mit der Kontrolle ist also nur ein imaginäres: Mit diesem Framework können wir komplett asynchron spielen und finden am Schluss trotzdem eine Einigung.

### Was passiert, wenn das Timing nicht stimmt?

Das spielt eine kleinere Rolle, als man denkt.

**Sind wir zu spät**, springen wir von unten an den Ball heran — wir machen also einen [Form-1-Angriff](/blog/de/angriff-timing). Das möchten wir nicht, aber es ist nicht schlimm, denn es entsteht kein direkter Fehler.

**Sind wir zu früh**, haben wir eine relativ hohe Toleranzzeit. Wir sind am Hochpunkt unseres Flugs, unsere Vertikalgeschwindigkeit ist also 0 und nimmt nun durch die Gravitation zu. Der Ball hat bereits eine Vertikalgeschwindigkeit nach unten und wird durch dieselbe Gravitation beschleunigt. Bei kleinen Fehlern holt uns der Ball also wieder ein. Haben wir uns komplett verschätzt, wird aus dem Angriff nichts mehr — aber wir können landen und den Ball spielen, was allerdings viel Körperspannung braucht. Auch dort lässt sich der Fehler vermeiden.

Das Risiko für einen echten Fehler ist also klein. Und das bedeutet: Wir können uns guten Gewissens festlegen.

### Der Angriff über Position 3

Alles, was wir bis jetzt gesagt haben, wird hier nochmals extremer. Der Ball ist nur 0,15 bis 0,6 Sekunden im Angriffsfenster, und der Angreifer braucht mehr als 0,15 Sekunden, um auf sein Flugmaximum zu kommen. Wir müssen das Timing also sehr viel weiter nach vorne schieben — so weit, dass der Angreifer noch vor dem Zuspiel in der Flugphase ist.

Hier können wir von einem kompletten Kontrollverlust des Angreifers sprechen. Er bekommt die Kontrolle erst hoch oben in der Luft zurück, und das Einzige, was er dann noch steuern kann, ist, wie seine Hand zum Ball geht. Wenn der Zuspieler seine Aufgabe nicht erledigt, gibt es hier sicher einen Fehler. Passiert das dreimal in Folge, ist das ganze Vertrauen weg. Und wenn Angreifer und Zuspieler um die Kontrolle kämpfen, verlieren beide — vom Timing her wissen wir ja, dass der schnelle Ball dann nicht mehr möglich ist.

Das ist alles nicht schlimm, denn dieses Zuspiel ist mit Abstand das einfachste. Schauen wir es uns nochmals in 3D an, dann sehen wir: Der Zuspieler kann den Ball einfach so lange wie möglich in der Zone behalten. Da die Zone so nah am Zuspielkontakt liegt, ist das eine einfache Aufgabe.

Der Zeitstress bei diesem Angriff kommt nämlich nicht von der Nähe zum Zuspieler, sondern allein von der Maximalhöhe des Zuspiels. Wir könnten im gleichen Timing über andere Positionen angreifen, es würde nur schwerer. Die Nähe zum Zuspieler ermöglicht es, dass der Ball im Schlagfenster noch hoch und wieder runter fällt. So hat der Angreifer mehr Kontrolle über das Schlagtiming und trifft den Ball auch mit langsamerem Arm noch — oder kann noch etwas damit anfangen, wenn er leicht zu spät ist.

Das Problem ist natürlich ein aufmerksamer Block, denn der hat leichtes Spiel, wenn der Ball keine Seitwärtsbewegung macht. Sollte der Block aufmerksam sein, können wir leicht auf den schwierigeren Ball umstellen. Aber das müssen wir nicht einmal: Ein aufmerksamer Block muss mit dem Angreifer nach oben. Macht er das nicht, können wir das Zuspiel machen. Springt der Block, bedeutet das, dass wir auf Position 4 nur noch einen Blockspieler haben — also spielen wir den Ball dorthin. Vom Timing her geht das wunderbar auf, denn der Zuspieler behält die Kontrolle lange genug, um hier noch eine Entscheidung zu treffen.

## Das Zuspielfenster

Wir sprechen hier vom gleichen Konzept — es geht noch immer um das Schlagfenster, aber jetzt aus Sicht des Zuspielers. Deshalb nennen wir es Zuspielfenster. Trotzdem wäre es gut, wenn auch die Angreifer das lesen, denn jeder muss ein gutes Zuspiel können und wissen, was es ausmacht. Was den Zuspieler dann unterscheidet, sind die Ballverteilung und die Spielkontrolle.

Um die Konzepte einfacher zu machen, betrachten wir hier nur die 2D-Darstellung. Das Zuspielfenster ist als Zuspieler mein Ziel und damit mein Orientierungspunkt auf dem Feld. Ich muss nicht wissen, wo auf dem Feld ich mich befinde — ich muss nur meine relative Position zum Ziel kennen.

Das Standardfenster, das ich immer kennen muss, ist das auf Position 4. Die anderen Fenster brauche ich nur, wenn ich früh entschieden habe, ein anderes anzuspielen. Bin ich als Zuspieler in einer guten Position, ist es kein Problem, mehrere Fenster im Kopf zu haben, denn die stehen alle schön zueinander ausgerichtet. Muss ich mich aber vom Netz entfernen, brauche ich meinen Ankerpunkt — und das ist das Zuspielfenster auf Position 4. Je nach Situation kann früh klar sein, dass es Position 6 oder 2 ist, aber standardmässig nehmen wir die 4.

### Wie der Ball durch das Fenster fallen muss

Ich muss nun einen Weg finden, dieses Fenster mit der vorgegebenen Maximalhöhe so zu treffen, dass der Ball **möglichst lange darin bleibt**. Bei Position 4 möchte ich also, dass der Ball von der oberen Ecke auf der Zuspielerseite durch das Fenster fällt. Er sollte im Fenster so «langsam» wie möglich sein, damit der Angreifer dort viel kontrollieren kann.

<AttackWindowAnatomy />

Die Grafik zeigt, worauf es dabei ankommt. Der Zuspieler legt nur zwei Dinge fest: wie hoch er spielt und wo der Ball kippt. Alles andere folgt daraus:

- **Zu hoch gespielt** heisst, der Ball kommt steil von oben. Er klippt das Fenster nur in der hinteren unteren Ecke, und der Angreifer verliert fast seinen ganzen Spielraum — obwohl der Ball «im Fenster» war.
- **Zu flach durchgeschossen** heisst, der Ball ist schnell. Er ist zwar auf der richtigen Höhe, aber durch das ganze Volumen in einem Wimpernschlag durch.
- **Am längsten bleibt der Ball im Fenster**, wenn der Scheitelpunkt knapp vor dem Fenster und ungefähr auf Höhe der oberen Kante liegt. Dann fällt der Ball durch die obere Ecke ein und driftet langsam durch das ganze Volumen. Genau dieses Bild soll der Zuspieler im Kopf haben.

Beim Quick ist es derselbe Gedanke, nur umgekehrt herum: Dort ziele ich nicht auf die obere, sondern auf die **untere Ecke auf der Zuspielerseite**. Das Fenster liegt fast über dem Zuspieler, der Ball steigt durch diese untere Ecke hinein, kippt knapp unter der Oberkante — oben darf er nicht hinaus — und fällt unten wieder aus dem Fenster heraus. Das ist der Grund, warum dieses Zuspiel physikalisch das einfachste ist — und warum der Angreifer dort trotz extremem Timing noch Kontrolle über den Schlagzeitpunkt hat.

Wie man das erreicht, ist Sache des Zuspielers. Die Erfahrung zeigt aber: Sobald man mit dieser Vorstellung arbeitet, werden die Zuspiele deutlich besser und präziser. Ein technischer Trick, der helfen kann: Nach dem Zuspiel mit Körper und Händen so genau wie möglich in Richtung des Fensters zeigen. Das verbessert auch die Kommunikation mit dem Angreifer.

### Die Absicht sichtbar machen

Die Ausrichtung von Körper und Händen kann ich für die Kommunikation mit den Mitspielern verwenden. Leider zeige ich damit auch dem Gegner, was ich mache — aber wir sehen gleich, dass das kein Problem ist.

Wenn wir an das Vertrauensproblem von oben denken, können wir es weiter entschärfen, indem wir dem Mitspieler unsere [Absicht](/blog/de/intention) zeigen. Wenn der Ball mich verlässt, möchte ich zeigen, dass der Ball auch genau dorthin sollte, wohin er jetzt fliegt. Kriege ich das hin, steigt das Vertrauen im Angreifer sofort. Und als Bonus werden meine Technik und meine Präzision besser.

Weil wir die schnellen Bälle spielen, spielt es auch keine Rolle, wenn der Gegner **nach** meinem Ballkontakt sieht, was meine Absicht war — dieselbe Information steht ohnehin in der Flugbahn des Balls. Und da nicht genügend Zeit zum Reagieren bleibt, ist es völlig egal, ob er sie vom Zuspieler oder vom Ballflug abliest. Wichtig ist nur: direkt **nach** dem Ballkontakt. Davor möchten wir nichts preisgeben.

## Theoretischer Ausflug: Warum das überhaupt funktioniert

### Die nächste Handlung liegt schon bereit

Wer das Fenster kennt, muss den Ball nicht mehr verfolgen. Der Slot im Arbeitsspeicher, der sonst für «wo ist der Ball und wann muss ich los» draufgeht, ist frei — und steht für Technik, Schlagrichtung und den Blick auf den Block zur Verfügung. Genau das ist der eigentliche Gewinn des Frameworks: nicht mehr Zeit, sondern mehr freie Kapazität.

Mehr dazu im Artikel [Arbeitsspeicher im Volleyball](/blog/de/arbeitsspeicher-blicktechnik).

### Wahrnehmung: die richtige Information am richtigen Ort

Wer früh committen muss, kann nicht auf den Ball schauen — die Information kommt dann zu spät. Gelesen wird stattdessen der Zuspieler: seine Position zum Netz, seine Körperhaltung, der Rhythmus seiner Bewegung. Das ist der Grund, warum ein Zuspieler **vor** dem Kontakt nichts preisgeben, **nach** dem Kontakt aber maximal lesbar sein soll.

Siehe dazu [Direkte Wahrnehmung im Volleyball](/blog/de/informationsverarbeitung-kombinationsangriff) und [Das unsichtbare Netz: Informationelle Spannung](/blog/de/informationelle-spannung).

### Absicht und Körpergefühl

Ein früher Commit braucht eine Absicht — ohne klares Ziel bleibt nur Abwarten, und Abwarten ist Form 1. Ist die Absicht aber gesetzt, übernimmt der Körper die Feinkorrektur von selbst: Schrittlänge, Absprungwinkel und Armzug passen sich an, ohne dass man darüber nachdenkt. Deshalb funktioniert der frühe Commit in der Praxis besser, als er sich beim ersten Versuch anfühlt.

Vertiefung: [Absicht](/blog/de/intention) · [Warum dein Körper mehr weiss als dein Kopf](/blog/de/motorisches-lernen) · [Propriozeption](/blog/de/propriozeption) · [Präzise spielen](/blog/de/praezises-spielen-schwerpunkt)

## Dasselbe Konzept in der Verteidigung

Das Angriffsfenster ist kein Werkzeug nur für die eigene Seite. Verteidigen heisst, das gegnerische Angriffsfenster zu lesen: Welches Fenster wird bedient? Welcher Schlagwinkel ist dann überhaupt noch möglich? Und welche Handlung lege ich mir vorher bereit?

### Die Aufgabe des Blocks

Der Block hat in diesem Bild eine einzige Aufgabe: **möglichst viel Raum aus dem gegnerischen Fenster wegnehmen.** Nicht unbedingt den Ball abblocken — das ist der Bonus. Der eigentliche Gewinn ist der Raum, den der Angreifer danach nicht mehr bespielen kann.

Man sieht das in der Grafik direkt: Sobald der Block steht, wird der mögliche Angriffsbereich hinter ihm **deutlich schmaler**. Aus einem breiten Fächer von rund 75° wird ein Korridor von 30°. Und genau das ist der Punkt für die Verteidigung: Bleibt nur noch ein offener Sektor, hat ein Verteidiger auch nur noch **eine Bewegungsrichtung**. Er muss nicht mehr entscheiden, ob er nach links oder nach rechts geht — er kann früher losgehen, oder er steht gleich schon dort, wo der Ball hinkommen kann.

Daraus ergibt sich auch die Aufgabenteilung im Hinterfeld: Blocken wir zum Beispiel die Pipe so, dass der Block die Diagonale auf Position 5 wegnimmt, dann decken wir Position 1 ab — und lassen die 5 bewusst frei. Sie gehört dem Block, nicht dem Verteidiger.

Steht der Block schlecht oder ist er allein (Quick), bleiben zwei offene Sektoren übrig. Dann muss der Verteidiger abwarten, bis er die Schlagrichtung sieht — und ist zu spät. Ein schlecht stehender Block kostet also nicht nur Blockpunkte, er kostet der ganzen Verteidigung die Vorentscheidung.

<DefenseWindowRead />

Sobald klar ist, welches Fenster bedient wird, ist der mögliche Schlagwinkel bereits stark eingeschränkt — und zwar **bevor** der Ball geschlagen ist. Das ist exakt dieselbe Vorentscheidung wie beim Angreifer, nur auf der anderen Seite des Netzes. Wer so verteidigt, reagiert nicht mehr, sondern steht schon dort, wo der Ball hinkommen kann. Genau deshalb wirken gute Verteidiger langsam: Sie haben die Entscheidung längst getroffen.

Mehr zum Lesen der Situation: [Das unsichtbare Netz: Informationelle Spannung](/blog/de/informationelle-spannung) und [Speed and Intelligence](/blog/de/speed-and-intelligence).

## Wie wir die Verbindung verstärken

Zum Schluss die konkreten Hebel:

1. **Gemeinsame Sprache.** Jedes Fenster bekommt einen Namen, und zwar einen, der im Hallenlärm funktioniert. Igel, Hase, Adler, Faultier — der Name ist egal, solange ihn alle gleich verstehen.
2. **Der Zuspieler zielt ins Fenster, nicht auf die Person.** Das Ziel ist ein Ort im Raum mit einer abgemachten Höhe, kein Mitspieler.
3. **Der Angreifer committet vor dem Zuspielkontakt.** Das ist der eine Punkt, an dem der Bruch mit der alten Gewohnheit passiert.
4. **Feedback nach jedem Ball — binär.** War der Ball im Fenster: ja oder nein. Keine langen Diskussionen, keine Schuldzuweisung. Nur diese eine Frage.
5. **Blickführung.** Vor dem Kontakt: der Zuspieler. Nach dem Kontakt: der Block. Der Ball braucht den Blick nicht, er kommt ja ins Fenster.

### Übungsformen

<!-- TODO: 3–4 Übungen, jeweils mit Ziel, Ablauf, Fehlerbild, Coaching-Fokus. -->

## Zusammenfassung

Schnelles Volleyball scheitert selten an der Technik und fast immer an der Frage, wer die Kontrolle hat. Weil sich die Zeitlinien von Zuspieler und Angreifer überschneiden, muss der Angreifer sich festlegen, bevor er weiss, wohin der Ball kommt. Das Angriffsfenster macht diese Abgabe von Kontrolle bezahlbar: Es gibt beiden einen gemeinsamen Bezugspunkt, der nicht vom Ball abhängt.

In der Verteidigung gilt dasselbe, nur spiegelverkehrt: Der Block nimmt Raum aus dem gegnerischen Fenster weg, der Angriffsbereich wird schmaler, und die Verteidigung hat nur noch eine Bewegungsrichtung statt einer Entscheidung.

Der Zuspieler zielt in ein Volumen und versucht, den Ball dort möglichst lange zu halten — Scheitelpunkt knapp vor dem Fenster, Eintritt durch die obere Ecke. Der Angreifer startet früh und bringt den Kopf hoch ins Fenster. Beide arbeiten asynchron und treffen sich trotzdem. Und weil dasselbe Lesen auf der anderen Netzseite funktioniert, ist das Fenster nicht nur ein Angriffs-, sondern auch ein Verteidigungswerkzeug.
