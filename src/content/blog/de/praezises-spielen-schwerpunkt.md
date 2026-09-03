---
title: "Präzise Spielen: Die relative Geschwindigkeit zwischen Ball und Schwerpunkt"
date: 2026-09-01
author: Cedric Geissmann
tags:
  - Technik
  - Schwerpunkt
  - Stabilität
  - Präzision
description: "Zuerst zum Ball kommen, dann die relative Geschwindigkeit zwischen Ball und Körperschwerpunkt im Moment des Kontakts minimieren. Dieses Prinzip trägt Annahme, Zuspiel und Angriff."
published: true
---

<script>
  import RelativeVelocityReception from '$lib/components/blog/RelativeVelocityReception.svelte';
  import ReceptionZoneScenarios from '$lib/components/blog/ReceptionZoneScenarios.svelte';
  import SetterRelativeVelocity from '$lib/components/blog/SetterRelativeVelocity.svelte';
  import MiddleAttackReach from '$lib/components/blog/MiddleAttackReach.svelte';
</script>

Im Football, Rugby und Ultimate gibt es eine Situation, die vertraut ist: Ein Objekt wird über eine grosse Distanz geworfen, und jemand muss es fangen. Auf den ersten Blick wirkt das extrem schwer. Wie soll man genau vorhersagen, wo das Objekt landet, um rechtzeitig am richtigen Ort zu stehen?

Der Trick ist einfach: Man macht es gar nicht. Statt den Landepunkt zu berechnen, passt man die eigene Geschwindigkeit dem Flugobjekt an. Sobald Spieler und Objekt gleich schnell sind, bleibt das Bild ruhig — man kann in dieser Situation verharren, bis das Objekt tief genug zum Fangen ist.

Das machen nicht nur wir Menschen. Bei Hunden sieht man es noch deutlicher, denn genau das ist ihre Hauptstrategie. Und sobald das Objekt den Boden berührt und seine Geschwindigkeit unvorhersehbar ändert, überschlagen sie sich fast. Allein das zeigt schon, wie gut diese Strategie ist.

Im Volleyball übernehmen wir dieses Prinzip — aber nicht eins zu eins. Der entscheidende Unterschied: Beim Fangen passen wir uns über den **ganzen Flug** an, weil wir sonst gar nicht am richtigen Ort ankommen. Im Volleyball zählt nur ein sehr kurzes Fenster, nämlich das **um den Ballkontakt herum**. Dort — und nur dort — soll die relative Geschwindigkeit zwischen Ball und Körperschwerpunkt so klein wie möglich sein. Was vorher passiert, ist Anlauf: Wir dürfen (und müssen oft) sehr schnell unterwegs sein, um überhaupt zum Ball zu kommen.

---

## Das Freiheitsgrade-Problem von Bernstein

Bernstein hat erkannt, dass koordinative Probleme für den Körper schwer zu lösen sind. Um sie zu vereinfachen, nutzt der Körper zwei Strategien: Er lässt Bewegungsrichtungen — sogenannte Freiheitsgrade — komplett weg, oder er koppelt sie an andere.

Auch das Fangen eines geworfenen Objekts ist so ein komplexes Problem. Physikalisch lässt es sich zwar berechnen, aber die Zeit dafür haben wir nicht. Wenn wir einfach dastehen und den Flug beobachten, können wir den Landepunkt nur grob schätzen — und das ist schwer, denn wir müssen zwei Koordinaten und die Zeit bis zur Landung gleichzeitig treffen.

Mit der Strategie, die Geschwindigkeit des Objekts zu kopieren, fallen die Koordinaten weg. Kommt ein Windstoss oder lenkt das Objekt ab, passen wir uns einfach weiter an. Übrig bleibt nur die Zeit bis zur Landung — und selbst die müssen wir nicht kennen. Wir warten einfach, bis der Ball in Reichweite ist. So schrumpft das Problem von drei Freiheitsgraden auf einen halben.

---

## Zwei Ziele — in dieser Reihenfolge

Bevor wir ins Detail gehen, die wichtigste Ordnung. Wir verfolgen zwei Ziele, und sie sind nicht gleichwertig:

1. **Zum Ball kommen.** Der Ball muss in unsere kontrollierte Zone. Das ist nicht verhandelbar — ohne Ball keine Technik. Auf dem Weg dorthin darf die relative Geschwindigkeit beliebig gross sein; wir sprinten, hechten, springen.
2. **Die relative Geschwindigkeit im Kontaktmoment minimieren.** Sobald Ziel 1 gesichert ist, versuchen wir, uns dem Ball so weit anzugleichen, dass er sich kurz vor dem Kontakt relativ zu uns kaum noch bewegt. Das ist die Kür — sie entscheidet über die Präzision.

Daraus folgt eine wichtige Einschränkung: Solange der Ball **innerhalb der kontrollierten Zone** bleibt, spielt die relative Geschwindigkeit kaum eine Rolle. In der Annahme ist diese Zone etwa 30 cm breit um den Körperschwerpunkt — in diesem Korridor können wir mit den Armen praktisch alles korrigieren. Fehler entstehen erst, wenn der Ball diese Zone während des Kontaktfensters verlässt, also relativ zu uns aus ihr herausdriftet.

Und genau hier kommt die Grösse der Zone ins Spiel: Im Zuspiel ist sie deutlich kleiner, im Angriff noch einmal kleiner. Je kleiner die Zone, desto wichtiger wird die relative Geschwindigkeit — bei gleichem Ball. Das ist der eigentliche Grund, warum Zuspiel und Angriff technisch anspruchsvoller sind als die Annahme.

---

## Der Unterschied zum Volleyball

Im Volleyball sieht die Sache anders aus. Der Ball kommt auf uns zu — wir können seine Geschwindigkeit nicht einfach übernehmen. Oder etwa doch? Das hängt davon ab, welche Geschwindigkeit wir betrachten.

Schauen wir uns eine Annahmesituation an. Der Ball kommt sehr schnell auf uns zu. Aber genau diese Richtung — auf uns zu — löst unser Gehirn bereits mit dem eingebauten Tau, das die Zeit bis zum Kontakt schätzt. Diese Geschwindigkeit kann uns also egal sein.

Interessant sind die anderen beiden Richtungen. Im Aufriss — der Seitenansicht entlang der Netzachse — bewegt sich der Ball in **x-Richtung** (parallel zum Netz) und in **y-Richtung** (Flughöhe). Dank Feldgeometrie und Netz sind beide stark eingeschränkt. Innerhalb unserer Annahmezone können wir deshalb die x-Geschwindigkeit des Balls mit dem Körperschwerpunkt übernehmen. Gelingt das, wird selbst ein Flatterball einfach.

Und genau hier liegt der Kern: Nicht die Ballgeschwindigkeit entscheidet, sondern die **relative Geschwindigkeit zwischen Ball und Körperschwerpunkt im Moment des Kontakts**. Ist sie klein, wird das Spiel einfach. Das folgende Widget zeigt, wie sich diese relative Geschwindigkeit verändert, wenn der Schwerpunkt mitgeht.

<RelativeVelocityReception />

Auch in y-Richtung funktioniert das Prinzip. Der Ball fällt nicht besonders schnell, weil er von weit her geschlagen wird und zuerst über das Netz muss. Kommt er tiefer als erwartet, gehen wir einfach mit nach unten. Hier begrenzt uns oft die eigene Beweglichkeit oder schlicht die fehlende Höhe. Trotzdem gilt: Sobald der Ball unsere Augenhöhe erreicht, können wir mit ihm nach unten gehen.

Wir müssen dabei nicht exakt gleich schnell wie der Ball sein — es reicht, uns ihm ein Stück weit anzupassen. Was eine Situation schwer macht, ist ein Ball, der während des Kontaktfensters mit viel Geschwindigkeit aus unserer Zone herausdriftet. Aber das ist immer relativ zu uns. Bewegen wir uns mit dem Ball mit, wird die Situation sofort einfacher.

---

## Bewegungssteuerung in der Annahme

Ich nehme die Annahme gerne als Beispiel, weil wir hier die langsamste und längste Bewegung haben. Das Prinzip gilt aber genauso für Verteidigung und Gratisball — nur Geschwindigkeit und Bewegungsradius ändern sich.

In der Annahme haben wir einen Bewegungsradius von etwa 2 m zur Seite. Alles, was weiter weg ist, gehört ohnehin der Person neben uns oder liegt ausserhalb des Feldes. Innerhalb dieses Radius gilt Ziel 1: hin zum Ball. Wie schnell wir dabei unterwegs sind, ist zunächst egal — entscheidend ist, dass der Ball in die 30-cm-Zone um unseren Schwerpunkt kommt.

Erst danach kommt Ziel 2. Wir passen unseren **Körperschwerpunkt** so an die x-Geschwindigkeit des Balls an, dass er kurz vor dem Kontakt in der Zone stehen bleibt statt hindurchzuwandern. Die Arme übernehmen nur die Feinabstimmung oder helfen, wenn wir die Geschwindigkeit nicht ganz treffen. Genau hier passieren die meisten Fehler: Der Ball driftet während des Kontakts aus der Zone heraus, und wir bekommen ihn nicht mehr zum Ziel zurück.

Kommt der Ball **von ausserhalb unserer Zone**, ist das also kein anderes Problem, sondern dasselbe in zwei Etappen: erst schnell hin (relative Geschwindigkeit gross, das stört nicht), dann angleichen (relative Geschwindigkeit klein, das entscheidet). Wer nur die erste Etappe macht, kommt zwar an den Ball, spielt ihn aber mit voller Driftgeschwindigkeit — der Ball geht dorthin, wohin er ohnehin wollte. Wer nur die zweite Etappe im Kopf hat, bewegt sich zu vorsichtig und ist gar nicht erst da.

Kommt der Ball direkt in unsere Zone hinein, ist es deutlich einfacher — er bewegt sich auf unseren Schwerpunkt zu. Bei tiefer x-Geschwindigkeit können wir warten. Ist sie hoch, übernehmen wir sie mit dem Schwerpunkt. Das klingt paradox, aber unser Ziel ist es, uns vom Ball weg zu bewegen und ihn ausserhalb der Körperachse zu spielen.

Im Annahmeriegel stehen wir aber nie allein. Drei Spieler mit je 2 m Radius decken das Feld ab — ihre Zonen überlappen sich deutlich, weil die Abstände nur etwa 3 m betragen. Das folgende Widget zeigt das ganze Feld von oben: Jeder Klick erzeugt einen neuen, zufälligen Aufschlag von der Gegenseite.

<ReceptionZoneScenarios />

Der zuständige Spieler läuft dort in zwei klar getrennten Phasen. In **Phase 1** ist der Kontaktpunkt bereits bekannt — die Flugbahn ist gerade — und er bewegt sich **direkt darauf zu**. Die Pfeile sind in dieser Phase gross, die relative Geschwindigkeit spielt schlicht keine Rolle. In **Phase 2**, den letzten rund 0,4 Sekunden, beginnt die **Angleichphase**: Jetzt übernimmt der Schwerpunkt die x-Geschwindigkeit des Balls, damit v_rel im Kontaktmoment klein wird.

Genau deshalb sieht die Animation auf den ersten Blick etwas „falsch“ aus: Der Laufweg knickt gegen Ende ab und der Spieler gleitet ein Stück seitlich mit, statt geradlinig im Kontaktpunkt stehen zu bleiben. Das ist Absicht und keine Ungenauigkeit der Darstellung — die beiden Phasen sind bewusst deutlich getrennt gezeichnet, damit sichtbar wird, dass wir uns zuerst kompromisslos **zum Punkt** bewegen und erst danach **mit dem Ball**. In der Realität verschmelzen die beiden Phasen zu einer fliessenden Bewegung; im Widget sind sie überzeichnet, um genau diesen Wechsel sichtbar zu machen.

Mit dem Umschalter kann man vergleichen, was passiert, wenn Phase 2 fehlt und man nur hinläuft und abstoppt.

Im Widget ist für jeden der drei Spieler seine relative x-Geschwindigkeit zum Ball eingezeichnet. Die Färbung kombiniert beide Ziele: **Grün** heisst, der Ball ist in der Kontrollzone (± 30 cm) **und** die relative Geschwindigkeit ist klein — das ist der Zustand, den wir wollen. **Orange** heisst, der Ball ist zwar in der Zone, aber noch zu schnell relativ zu uns. **Rot** heisst, wir sind ruhig, aber nicht am Ball — Ziel 1 ist nicht erfüllt. **Grau** ist alles andere, typischerweise der Anlauf.

Die überlappenden Zonen sind kein Problem, sondern die Lösung: Nicht der Feldstrich entscheidet, wer den Ball nimmt, sondern wer ihn erstens erreicht und zweitens im Kontaktmoment am ruhigsten in seiner Zone halten kann. Die anderen beiden weichen aus und sichern die frei werdende Fläche ab.

Die y-Geschwindigkeit haben wir bereits angesprochen: Ist sie hoch, lassen wir uns fallen. Zieht der Ball leicht nach oben, gehen wir sofort mit und erhöhen unseren Schwerpunkt.

---

## Wechsel zur Obenannahme

Was, wenn wir auf eine Obenannahme wechseln wollen? Die Idee ist einfach, das Timing schwierig. Diesen Wechsel machen wir nur, wenn der Ball höher kommt als erwartet: Hände nach oben nehmen und den Ball verfolgen.

Was wir dabei oft vergessen: Beim Wechsel entsteht eine tote Zone, in der wir den Ball nicht spielen können — knapp unterhalb der Brusthöhe, je nach Beweglichkeit etwa 10 cm hoch. Diese 10 cm kompensieren wir leicht, indem wir beim Wechsel etwas tiefer in die Knie gehen. Das hilft uns sogar doppelt, denn solche Bälle kommen meist als Flatterbälle, die nach oben ziehen — wir wollen danach ohnehin aufstehen, um die y-Geschwindigkeit des Balls zu kopieren.

Der Kern bleibt derselbe: Unser Schwerpunkt kopiert die Bewegung des Balls so gut wie möglich, dann müssen die Arme nur noch kleine Anpassungen machen. Diese Sichtweise erlaubt es uns sogar, komplett stehen zu bleiben, wenn der Ball genau auf den Schwerpunkt zukommt. Das ist aber selten — deshalb sollten wir den Schwerpunkt immer in Bewegung halten.

---

## Das Zuspiel

Kommen wir zur Königsdisziplin: dem Zuspiel. Dasselbe Prinzip, aber mit einer deutlich kleineren kontrollierten Zone. Beim Zuspiel liegt sie eher im Bereich von 10 bis 15 cm um den Schwerpunkt — der Ball muss über der Stirn und zwischen den Händen sein, sonst verlieren wir die Richtungsfreiheit. Dieselbe relative Geschwindigkeit, die in der Annahme harmlos ist, wirft uns hier aus der Position.

Denn das Zuspiel ist auch inhaltlich komplexer: Wir reflektieren den Ball nicht nur, sondern spielen ihn von einer Position aus präzise auf vier bis sechs Ziele. Dabei sollen wir dem Gegner unsere Absicht nicht verraten. Der Schlüssel ist also nicht nur ein präzises Zuspiel, sondern auch, diese neutrale Position möglichst lange zu halten. Beides erreichen wir mit derselben Überlegung.

Ein präzises Zuspiel gelingt, wenn unser Körperschwerpunkt im Kontaktfenster möglichst die gleiche Bewegung wie der Ball hat. Zuspieler nutzen dafür gerne das Sprungzuspiel, weil sie mit einer leichten seitlichen Bewegung mit dem Ball mitgehen können. Um das zu verstehen, schauen wir den Grundriss an — die Draufsicht. Der Ball hat jetzt eine **x-Geschwindigkeit** (parallel zum Netz) und eine **z-Geschwindigkeit** (Abstand zum Netz). Dank guter Annahme oder Verteidigung sind beide klein.

<SetterRelativeVelocity />

Was ein Zuspieler macht, ist einfach — und es ist wieder dieselbe Reihenfolge. Zuerst Ziel 1: Er geht in die Zone, in der er den Ball spielen wird — besser noch, er ist bereits da. Dort hält er den Schwerpunkt ruhig, um x- und z-Geschwindigkeit des Balls genau einzuschätzen, denn er hat nur eine Chance. Dann setzt er zum Sprung an. Dabei geht es nicht um die Höhe, sondern darum, die x- und z-Geschwindigkeit des Balls zu übernehmen. So bleibt die stabile Position unter dem Ball möglichst lange erhalten, und er kann in alle Richtungen weiterleiten.

Das ist Ziel 2, nur mit engerer Toleranz. Stimmen diese Geschwindigkeiten nicht überein, schrumpft das Zuspielfenster drastisch. Dann ist man nur noch damit beschäftigt, eine Ausgleichbewegung mit den Händen zu kontrollieren — das hat nichts mehr mit Ballkontrolle zu tun, das ist reine Schadensbegrenzung.

Das Schöne: Es reicht oft, **eine** Geschwindigkeitsrichtung zu neutralisieren. Meist übernehmen wir die x-Geschwindigkeit mit dem Schwerpunkt und gleichen die z-Geschwindigkeit mit den Armen aus. Weil sie normalerweise klein ist, gelingt das gut.

---

## Der Angriff

Im Angriff ist die kontrollierte Zone am kleinsten: Sie ist nicht mehr der Raum um den Schwerpunkt, sondern das Schlagfenster über der Schlagschulter — horizontal etwa 0,5 m, und der Arm braucht darin Zeit für die Feinanpassung. Entsprechend hart bestraft der Angriff eine hohe relative Geschwindigkeit im Kontaktmoment.

Beim Angriff gibt es mehrere Wege, den Schwerpunkt an den Ball anzupassen. Der wichtigste — und unintuitivste — ist die Hangtime. Unintuitiv, weil wir uns hier gar nicht dem Ball anpassen, sondern einfach in der Luft hängen. Genau darin liegt der Trick: Beim Hängen ist unsere y-Geschwindigkeit für relativ lange Zeit null. Wir beschleunigen nicht mehr auf den Ball zu, sondern der Ball kommt zu uns. In diesem Fenster schätzen wir am besten ab, wie schnell er sich nähert — in der Aufwärtsbewegung geht das kaum. Ein kontrollierter Schlag braucht einen stabilen Schwerpunkt, und den bekommen wir in y-Richtung durch die Hangtime und einen Form-2-Angriff.

Auch in x-Richtung können wir unsere Geschwindigkeit an den Ball anpassen. Am besten geht das auf den Mittelpositionen, mit etwas Kreativität auch aussen. Beim Dia ist es schwieriger, aber dort auch kein grosses Problem, weil die x-Geschwindigkeit meist klein ist.

Ein häufiges Problem beim Angriff durch die Mitte ist das Timing im Schlagfenster — besonders, wenn der Ball weit weg vom Zuspieler geschlagen werden soll. Dann hat er oft eine hohe x-Geschwindigkeit, und der Schlagarm ist schlicht zu langsam, um den Ball zu erwischen, solange er noch im Fenster ist. Genau hier hilft der Schwerpunkt-Trick: Wir driften mit dem Ball mit und senken die relative Geschwindigkeit unter die kritische Grenze.

<MiddleAttackReach />

Rechnen wir es durch. Das Schlagfenster ist horizontal rund 0,5 m breit, und der Arm braucht etwa 0,25 s, um sich anzupassen. Daraus ergibt sich eine kritische relative x-Geschwindigkeit von 2,0 m/s — schneller darf der Ball relativ zu uns nicht sein. Ein Schuss-Pass durch die Mitte hat aber leicht 4,0 m/s. Der Arm allein kommt nicht mit. Driften wir im Sprung mit rund 2,0 m/s seitlich mit, sinkt die relative Geschwindigkeit auf 2,0 m/s — und der Ball liegt wieder im Fenster.

Deshalb ist es sinnvoll, in der Mitte von rechts nach links zu laufen: So vermindern wir die relative x-Geschwindigkeit des Balls. Denselben Trick können wir aussen anwenden, auch wenn es dort unüblich ist. Müssen wir weit im Feld verteidigen oder wollen einen 4er-Pass angreifen, driften wir im Sprung leicht nach links — die relative x-Geschwindigkeit wird kleiner. In Kombination mit der Hangtime gibt uns das die Zeit, den Block zu sehen und Löcher in der Verteidigung zu finden.

---

## Fazit

Zuerst zum Ball — das bleibt Ziel Nummer eins. Ist das gesichert, entscheidet die **relative Geschwindigkeit zwischen Schwerpunkt und Ball im Moment des Kontakts**: Je kleiner sie ist, desto präziser spielen wir. Anders als beim Fangen müssen wir uns nicht über den ganzen Flug anpassen, sondern nur im kurzen Fenster um den Kontakt.

Wie streng dieses Kriterium ist, hängt an der Grösse der kontrollierten Zone: rund 30 cm in der Annahme, deutlich weniger im Zuspiel, am wenigsten im Angriffs-Schlagfenster. Solange der Ball in dieser Zone bleibt, korrigieren Arme und Hände fast alles. Verlässt er sie während des Kontakts, wird es Schadensbegrenzung.

Dafür brauchen wir Kraft und Mobilität, um schnell in verschiedene Positionen zu kommen. Unser Fokus sollte aber immer auf dem eigenen Körperschwerpunkt liegen: Zu oft bringen wir ihn zur Ruhe und können ihn dann nicht mehr weiterbewegen. Genau dann häufen sich die technischen Fehler.
