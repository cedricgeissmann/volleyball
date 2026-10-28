---
title: "Advantage in Volleyball: What It Is and How We Keep It"
date: 2026-11-24
author: Cedric Geissmann
tags:
  - Tactics
  - Serve
  - Attack
  - Psychology
  - Simulation
description: "Volleyball is a side-out game: whoever holds the advantage wins the rally more often. What exactly that advantage is, why an ace is worth less than it feels, and how serve, attack and breathing help us keep it on our side."
published: true
---

<script>
  import VorteilFlip from '$lib/components/blog/VorteilFlip.svelte';
  import MonteCarloSatz from '$lib/components/blog/MonteCarloSatz.svelte';
</script>

> **Note:** The tactical considerations in this blog are the author's own thoughts and not scientifically proven theories. The one exception is the physiological part on breathing, the nervous system and the Bohr effect — the mechanisms used there are backed by sources at the end of the article.

## The advantage switches sides

At first glance volleyball looks simple: one serve, three contacts per team, and as soon as the ball is out of play someone gets a point. First to 25 wins the set. But the real question is not *how* you score a point, it's how you get to 25 **first**. And that is considerably less trivial.

Volleyball is a side-out game. The receiving team is at an advantage, because most points are scored on the first attack: reception, set, attack — with all hitters available and a controlled first ball. Let's simply call that situation **advantage**. Whoever holds the advantage wins the rally more often than the other team. Everything that follows is an attempt to keep that advantage or to take it away.

This creates two very different situations. If we have the advantage, the point is our job — this is not where you fight, this is where you deliver. If the opponent has the advantage, it's not a disaster if they score: that's the expected outcome. Our task in that situation is a different one — we want to **flip** the advantage.

## Flipping means: getting the ball back

The advantage isn't glued to one team, it travels. The opponent receives and attacks — we block or dig, and suddenly we are the ones with a controlled ball and free hitters. Technically that is not a second side-out, but in spirit it is exactly the same thing: a good scoring opportunity. A free ball is the extreme case of this, often even better than a side-out after a serve.

That gives us a simple, verifiable goal: **Pull as many advantage situations as possible onto our side per rally — and then close them out as quickly as possible.** Not "just get the ball back over somehow", but get the ball back in a way that leaves us with the advantage afterwards.

## And what does that mean for the serve?

Many teams treat the serve as the single most important point and take a correspondingly large amount of risk. The reasoning sounds logical: if I score directly, I've been handed a break. If I make an error, it doesn't matter — the opponent had the advantage anyway, the point would have been lost regardless. So: risk, as much as possible.

The catch is that the serve isn't binary. There are not only errors and aces, there is a third option — and that third option is where the whole thing lives. A ball that stays in play is an **opportunity to flip the advantage**. A service error is exactly that opportunity, never received.

Let's do the rough math with 25 serves per set. Suppose the opponent sides out on 17 of them, we hit 3 aces and win 5 rallies — a decent set. Now distribute those 17 lost serves however you like between "the opponent played it out" and "we served into the net". The points are identical. The difference: every rally that was played out contained at least one chance to flip the advantage. Every service error contained none.

That is exactly why an ace is **worth less than it feels**. An ace brings exactly one point, then the rally is over. A tough serve that stays in play brings less than one point on average — but it produces advantage situations, opponent errors, free balls, counterattack chances. And it costs nothing when it doesn't pay off. The ace is the highlight, the pressure serve is the business model.

In the widget below, every field stands for one of our 25 serves in a set. On the left you see the standard pressure as a reference, on the right your own setting. The fields are always sorted the same way: at the front what stays with the opponent, at the back what we take for ourselves. Drag the serve pressure up — the orange aces do increase, but the red zone grows from the front faster than the blue fields at the back can keep up.

<VorteilFlip />

The maximum number of break points is not at the end of the risk scale, but somewhere in the upper middle: enough pressure to break the opponent's reception, but not so much that we take the opportunities away from ourselves. In practice that doesn't mean "no errors", it means "few and deliberate errors". Team rules that work for this:

- Only two or three designated players are allowed to take full risk.
- From the third serve in a run onwards you may open up — the break is already there.
- After a service error, the next player deliberately serves into the court.

## Not every point is worth the same

The serving strategies above are harder to implement in practice than they look on paper. The reason isn't tactical, it's emotional: the points involved feel very different in weight.

Take the rule "from the third serve in a run we turn up the risk". An ace or a break point at exactly that moment feels enormous — the server seems unable to leave the line, your own team gets a boost, the opponent looks demoralised. Look at the same situation without emotions and little of that remains: a run of four points is statistically unremarkable and can easily be clawed back.

If you simulate two equally strong teams, runs of three and four points appear constantly — purely by chance. The simulator below needs only two numbers: the side-out rates of both teams. Everything else falls out of randomness.

<MonteCarloSatz />

With balanced rates, practically every set contains a four-point run somewhere. Which means: the run is **no proof** that something is broken. Things only break when we react to the run — with risk, with panic, with new errors. Real momentum comes from our reaction, not from the scoreboard.

Two numbers from the simulator are worth a second look:

- **Comeback from −5:** A five-point deficit is turned around far more often than it feels like on the court.
- **Lost from +5:** A lead is not a possession. Anyone who starts ramping up risk while ahead gives back exactly the rate that put them ahead.

## When do we need panic?

Ideally never. Under panic we play less controlled: coordination suffers, planning suffers, and above all working memory suffers. That part is well documented — acute stress impairs the function of the prefrontal cortex via noradrenaline and dopamine, i.e. the region responsible for working memory and conscious action planning (Arnsten, 2009). We can't afford to lose any of those abilities if we want to keep the advantage during a rally.

At the same time stress isn't only harmful. Elevated adrenaline helps us start faster and jump higher. Performance follows an inverted U-curve: a medium level of arousal is optimal, too little and too much are both bad — and the finer the technique required, the earlier the curve tips downwards (Yerkes & Dodson, 1908; Arent & Landers, 2003).

So it's best to combine both: body activated, head calm. The good news is that the activation comes by itself. The stress arises during the rally anyway, especially when we don't have the advantage or can't convert it. We don't need to cultivate it further between rallies. What we need is the opposite: a short **calming phase** in which we actively plan what happens next. That way the stress affects our physical performance, but not our working memory.

There is a simple lever for this: **a long exhale**.

### Why exhaling powers the nervous system down

That sounds esoteric at first, but it has a solid physiological basis. Our heartbeat isn't constant — it fluctuates with the rhythm of our breathing. This phenomenon is called **respiratory sinus arrhythmia**: heart rate rises when inhaling and falls when exhaling (Yasuma & Hayano, 2004).

The main mechanism behind it is the vagus nerve. During exhalation the parasympathetic braking effect on the sinus node increases and the pulse goes down; during inhalation that brake is released and the pulse goes up. On top of that comes a mechanical component: heart and lungs share the limited space in the chest, and the pressure conditions during inhaling and exhaling change venous return and therefore the filling of the heart. Both pull in the same direction — and we can consciously control both through our breathing.

What matters here is the ratio of inhale to exhale. An exhale longer than the inhale measurably increases vagal tone and lowers subjective tension (Zaccaro et al., 2018; Laborde et al., 2022). A controlled study with just five minutes of daily breathing practice showed that of all variants, the one with a markedly extended exhale improved mood and physiological arousal the most — more clearly than meditation (Balban et al., 2023). A long exhale is therefore not a trick, but a tool with which we can directly steer our stress level.

### What this looks like between two rallies

We exhale for 6 to 8 seconds until the lungs are completely empty, and then stay in that state for a few seconds. It's exactly during this time that we plan the next attack or the next reception, deliberately filling our working memory — the more slots we occupy, the longer the plan stays in there.

### Bonus: the Bohr effect

An additional benefit of empty lungs is the **Bohr effect**. It describes how haemoglobin releases oxygen more easily when the partial pressure of CO₂ and the acidity of the blood rise — the oxygen binding curve shifts to the right (Bohr, Hasselbalch & Krogh, 1904; Jensen, 2004). Put differently: without enough CO₂, the oxygen doesn't even leave the red blood cells.

In sport that's not a problem, quite the opposite — our working muscles produce CO₂ exactly where the most oxygen is needed. An increased CO₂ concentration in the blood therefore means our muscles are supplied more efficiently.

The decisive part is the one that's easy to overlook: the CO₂ level only rises quickly when the lungs are empty and no fresh air is being supplied. As long as we keep breathing, we continuously wash the CO₂ back out. Only the pause after a full exhale lets CO₂ pressure rise rapidly — which is why exactly that pause is the effective part of the exercise.

The catch: our body reacts very sensitively to rising CO₂. The urge to breathe we feel is driven almost entirely by CO₂ and pH, and hardly at all by a lack of oxygen (Nattie & Li, 2012; Parkes, 2006). So we feel "air is slowly running out" while oxygen saturation is still completely unremarkable. You first have to make friends with that sensation — tolerance for it can be trained easily and is harmless during short pauses while standing.

> **Note:** Breath holding does not belong in the water and not during movement. What's meant here are exclusively short pauses between two rallies.

### What it all comes down to

Our goal is to start every new rally as calmly as possible so that we control the first ball cleanly. From then on we're only reacting anyway — at that point we no longer need the calm and can switch into an intuitive mode of play. Of course it would be better to stay calm there too, but that isn't equally feasible for everyone. What matters most is **synchronising as a team before the rally**.

## Attack

Anyone who knows me knows that I hate uncontrolled attacks. The reason is the same as with serve pressure: with an uncontrolled attack we hand the advantage straight to the opponent. Every error is an opportunity we never get.

For the attack, though, we still have to distinguish the two situations:

- **We have the advantage.** Here we really shouldn't make an error — the advantage has to be converted. That's the hard part: staying in the advantage without producing the cheap error. How to manage that is something every player has to solve individually.
- **We don't have the advantage.** Here errors are allowed to happen, because losing the point is the expected outcome anyway.

Which raises an obvious question: if we even get to an attack at all — aren't we then automatically in the advantage and absolutely not allowed to make an error? We don't have to be that strict. We have the advantage whenever we can attack **out of reception**; the same goes for a free ball. If, on the other hand, we only reach an attack via an extreme dig or a running action on the second contact, we don't have to count that as an advantage — there we're allowed to apply more pressure.

Of course not every situation can be cleanly categorised, and everyone sees it slightly differently. All that matters is the principle: **use advantages, keep advantages, create advantages.** At a similar level, that wins us a great many sets.

## Sources

The tactical considerations in this blog are the author's own thoughts. The physiological part on breathing, the nervous system and the Bohr effect draws on the following work:

**Stress, arousal and working memory**

- Arnsten, A. F. T. (2009). *Stress signalling pathways that impair prefrontal cortex structure and function.* Nature Reviews Neuroscience, 10(6), 410–422. [doi:10.1038/nrn2648](https://doi.org/10.1038/nrn2648)
- Yerkes, R. M., & Dodson, J. D. (1908). *The relation of strength of stimulus to rapidity of habit-formation.* Journal of Comparative Neurology and Psychology, 18(5), 459–482. [doi:10.1002/cne.920180503](https://doi.org/10.1002/cne.920180503)
- Arent, S. M., & Landers, D. M. (2003). *Arousal, anxiety, and performance: A re-examination of the inverted-U hypothesis.* Research Quarterly for Exercise and Sport, 74(4), 436–444. [doi:10.1080/02701367.2003.10609113](https://doi.org/10.1080/02701367.2003.10609113)

**Breathing and the nervous system**

- Yasuma, F., & Hayano, J. (2004). *Respiratory sinus arrhythmia: Why does the heartbeat synchronize with respiratory rhythm?* Chest, 125(2), 683–690. [doi:10.1378/chest.125.2.683](https://doi.org/10.1378/chest.125.2.683)
- Zaccaro, A., et al. (2018). *How breath-control can change your life: A systematic review on psycho-physiological correlates of slow breathing.* Frontiers in Human Neuroscience, 12, 353. [doi:10.3389/fnhum.2018.00353](https://doi.org/10.3389/fnhum.2018.00353)
- Laborde, S., et al. (2022). *Influence of slow-paced breathing on inhibition after physical exertion — and effects on cardiac vagal activity.* Neuroscience & Biobehavioral Reviews, 138, 104711. [doi:10.1016/j.neubiorev.2022.104711](https://doi.org/10.1016/j.neubiorev.2022.104711)
- Balban, M. Y., et al. (2023). *Brief structured respiration practices enhance mood and reduce physiological arousal.* Cell Reports Medicine, 4(1), 100895. [doi:10.1016/j.xcrm.2022.100895](https://doi.org/10.1016/j.xcrm.2022.100895)

**Bohr effect and CO₂ tolerance**

- Bohr, C., Hasselbalch, K., & Krogh, A. (1904). *Über einen in biologischer Beziehung wichtigen Einfluss, den die Kohlensäurespannung des Blutes auf dessen Sauerstoffbindung übt.* Skandinavisches Archiv für Physiologie, 16(2), 402–412. [doi:10.1111/j.1748-1716.1904.tb01382.x](https://doi.org/10.1111/j.1748-1716.1904.tb01382.x)
- Jensen, F. B. (2004). *Red blood cell pH, the Bohr effect, and other oxygenation-linked phenomena in blood O₂ and CO₂ transport.* Acta Physiologica Scandinavica, 182(3), 215–227. [doi:10.1111/j.1365-201X.2004.01361.x](https://doi.org/10.1111/j.1365-201X.2004.01361.x)
- Nattie, E., & Li, A. (2012). *Central chemoreceptors: Locations and functions.* Comprehensive Physiology, 2(1), 221–254. [doi:10.1002/cphy.c100083](https://doi.org/10.1002/cphy.c100083)
- Parkes, M. J. (2006). *Breath-holding and its breakpoint.* Experimental Physiology, 91(1), 1–15. [doi:10.1113/expphysiol.2005.031625](https://doi.org/10.1113/expphysiol.2005.031625)
