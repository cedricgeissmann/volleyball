---
title: "Playing with Precision: The Relative Velocity Between Ball and Centre of Gravity"
date: 2026-09-01
author: Cedric Geissmann
tags:
  - Technique
  - Centre of Gravity
  - Stability
  - Precision
description: "First get to the ball, then minimise the relative velocity between ball and body's centre of gravity at the moment of contact. This principle carries reception, setting and attacking alike."
published: true
---

<script>
  import RelativeVelocityReception from '$lib/components/blog/RelativeVelocityReception.svelte';
  import ReceptionZoneScenarios from '$lib/components/blog/ReceptionZoneScenarios.svelte';
  import SetterRelativeVelocity from '$lib/components/blog/SetterRelativeVelocity.svelte';
  import MiddleAttackReach from '$lib/components/blog/MiddleAttackReach.svelte';
</script>

In football, rugby and ultimate there is a familiar situation: an object is thrown over a large distance, and someone has to catch it. At first glance this looks extremely hard. How are you supposed to predict exactly where the object will land in order to be in the right place in time?

The trick is simple: you don't. Instead of calculating the landing point, you match your own velocity to the flying object. As soon as player and object are moving at the same speed, the picture stands still — you can stay in this situation until the object is low enough to catch.

It's not only us humans who do this. With dogs you see it even more clearly, because this is precisely their main strategy. And as soon as the object touches the ground and changes its velocity unpredictably, they almost tumble over themselves. That alone shows how good this strategy is.

In volleyball we adopt this principle — but not one to one. The decisive difference: when catching, we adjust over the **entire flight**, because otherwise we won't arrive in the right place at all. In volleyball only a very short window matters, namely the one **around ball contact**. There — and only there — the relative velocity between ball and body's centre of gravity should be as small as possible. What happens before that is the approach: we may (and often must) move very fast just to get to the ball at all.

---

## Bernstein's Degrees-of-Freedom Problem

Bernstein recognised that coordinative problems are hard for the body to solve. To simplify them, the body uses two strategies: it drops movement directions — so-called degrees of freedom — entirely, or it couples them to others.

Catching a thrown object is such a complex problem too. Physically it can be calculated, but we don't have the time for that. If we simply stand there and watch the flight, we can only roughly estimate the landing point — and that is hard, because we have to hit two coordinates and the time until landing simultaneously.

With the strategy of copying the object's velocity, the coordinates drop out. If a gust of wind comes or the object deflects, we simply keep adjusting. All that remains is the time until landing — and we don't even need to know that. We just wait until the ball is within reach. This shrinks the problem from three degrees of freedom to half a degree.

---

## Two Goals — in This Order

Before we go into detail, the most important ordering. We pursue two goals, and they are not equally weighted:

1. **Get to the ball.** The ball has to reach our controlled zone. This is non-negotiable — no ball, no technique. On the way there the relative velocity may be arbitrarily large; we sprint, dive, jump.
2. **Minimise the relative velocity at the moment of contact.** Once goal 1 is secured, we try to match the ball closely enough that, just before contact, it barely moves relative to us. This is the finesse — it determines the precision.

From this follows an important limitation: as long as the ball stays **inside the controlled zone**, the relative velocity hardly matters. In reception this zone is about 30 cm wide around the body's centre of gravity — within this corridor we can correct practically anything with our arms. Errors only arise when the ball leaves this zone during the contact window, i.e. when it drifts out of it relative to us.

And this is exactly where the size of the zone comes into play: in the set it is considerably smaller, in the attack smaller still. The smaller the zone, the more important the relative velocity becomes — for the same ball. This is the real reason why setting and attacking are technically more demanding than reception.

---

## The Difference in Volleyball

In volleyball things look different. The ball comes toward us — we can't simply adopt its velocity. Or can we? That depends on which velocity we consider.

Let's look at a reception situation. The ball comes at us very fast. But this very direction — toward us — is already handled by our brain with the built-in tau, which estimates the time until contact. So this velocity is of no concern to us.

The other two directions are the interesting ones. In the side elevation — the view along the net axis — the ball moves in the **x-direction** (parallel to the net) and in the **y-direction** (flight height). Thanks to court geometry and the net, both are heavily constrained. Within our reception zone we can therefore adopt the ball's x-velocity with our centre of gravity. If we manage this, even a float serve becomes easy.

And this is the heart of it: it isn't the ball's velocity that matters, but the **relative velocity between ball and body's centre of gravity at the moment of contact**. If it is small, the game becomes easy. The following widget shows how this relative velocity changes when the centre of gravity moves along.

<RelativeVelocityReception />

The principle works in the y-direction too. The ball doesn't fall particularly fast, because it is struck from far away and first has to clear the net. If it comes lower than expected, we simply go down with it. Here we are often limited by our own mobility or simply by our lack of height. Still, the rule holds: as soon as the ball reaches our eye level, we can go down with it.

We don't have to move at exactly the same speed as the ball — it's enough to match it partway. What makes a situation hard is a ball that drifts out of our zone with a lot of velocity during the contact window. But that is always relative to us. If we move along with the ball, the situation immediately becomes easier.

---

## Movement Control in Reception

I like to use reception as an example, because here we have the slowest and longest movement. But the principle applies just as much to defence and free balls — only the speed and range of movement change.

In reception we have a movement radius of about 2 m to the side. Anything farther away belongs to the person next to us anyway, or lies outside the court. Within this radius, goal 1 applies: toward the ball. How fast we move in doing so doesn't matter at first — what matters is that the ball reaches the 30 cm zone around our centre of gravity.

Only after that comes goal 2. We match our **centre of gravity** to the ball's x-velocity so that, just before contact, it comes to rest in the zone instead of wandering through it. The arms only handle the fine-tuning, or help out when we don't quite hit the velocity. This is exactly where most errors happen: the ball drifts out of the zone during contact, and we can no longer bring it back to the target.

If the ball comes **from outside our zone**, that isn't a different problem, but the same one in two stages: first get there fast (relative velocity large, that doesn't hurt), then match up (relative velocity small, that decides). Anyone who only does the first stage does reach the ball, but plays it at full drift velocity — the ball goes wherever it wanted to go anyway. Anyone who only has the second stage in mind moves too cautiously and isn't there in the first place.

If the ball comes directly into our zone, it is considerably easier — it is moving toward our centre of gravity. At low x-velocity we can wait. If it is high, we adopt it with our centre of gravity. This sounds paradoxical, but our goal is to move away from the ball and play it off the body's axis.

In the reception line we are never alone, though. Three players, each with a 2 m radius, cover the court — their zones overlap considerably, because the spacings are only about 3 m. The following widget shows the whole court from above: each click generates a new, random serve from the opposing side.

<ReceptionZoneScenarios />

The responsible player runs there in two clearly separated phases. In **phase 1** the contact point is already known — the trajectory is straight — and he moves **directly toward it**. In this phase the arrows are large; the relative velocity simply doesn't matter. In **phase 2**, the last roughly 0.4 seconds, the **matching phase** begins: now the centre of gravity adopts the ball's x-velocity so that v_rel becomes small at the moment of contact.

This is exactly why the animation looks a bit "wrong" at first glance: the running path bends toward the end and the player glides sideways along with the ball for a stretch, instead of stopping straight at the contact point. This is intentional and not an inaccuracy of the depiction — the two phases are deliberately drawn as clearly separate, so that it becomes visible that we first move uncompromisingly **to the point** and only afterwards **with the ball**. In reality the two phases merge into one fluid movement; in the widget they are exaggerated to make exactly this transition visible.

With the toggle you can compare what happens when phase 2 is missing and you just run there and stop.

In the widget, each of the three players' relative x-velocity to the ball is shown. The colouring combines both goals: **green** means the ball is in the control zone (± 30 cm) **and** the relative velocity is small — this is the state we want. **Orange** means the ball is in the zone, but still too fast relative to us. **Red** means we are still, but not at the ball — goal 1 is not fulfilled. **Grey** is everything else, typically the approach.

The overlapping zones are not a problem but the solution: it isn't the court line that decides who takes the ball, but who firstly reaches it and secondly can keep it most still in their zone at the moment of contact. The other two get out of the way and cover the space that opens up.

We have already touched on the y-velocity: if it is high, we let ourselves drop. If the ball pulls slightly upward, we immediately go with it and raise our centre of gravity.

---

## Switching to an Overhead Reception

What if we want to switch to an overhead reception? The idea is simple, the timing is difficult. We only make this switch when the ball comes higher than expected: take the hands up and follow the ball.

What we often forget in doing so: during the switch a dead zone arises in which we can't play the ball — just below chest height, about 10 cm tall depending on mobility. We easily compensate for these 10 cm by bending a little deeper into the knees during the switch. This even helps us twice, because such balls usually come as float serves that pull upward — we want to stand up afterwards anyway in order to copy the ball's y-velocity.

The core stays the same: our centre of gravity copies the ball's movement as well as possible, then the arms only have to make small adjustments. This perspective even allows us to stand completely still when the ball comes exactly toward our centre of gravity. But that is rare — which is why we should always keep the centre of gravity in motion.

---

## The Set

Now to the supreme discipline: the set. The same principle, but with a considerably smaller controlled zone. In setting it is more in the range of 10 to 15 cm around the centre of gravity — the ball has to be above the forehead and between the hands, otherwise we lose our directional freedom. The same relative velocity that is harmless in reception throws us out of position here.

For the set is also more complex in content: we don't just reflect the ball, we play it precisely from one position onto four to six targets. And we shouldn't reveal our intention to the opponent. So the key isn't only a precise set, but also holding this neutral position as long as possible. We achieve both with the same reasoning.

A precise set succeeds when, during the contact window, our body's centre of gravity moves as much as possible like the ball. Setters like to use the jump set for this, because with a slight sideways movement they can go along with the ball. To understand this, let's look at the floor plan — the top view. The ball now has an **x-velocity** (parallel to the net) and a **z-velocity** (distance from the net). Thanks to a good reception or defence, both are small.

<SetterRelativeVelocity />

What a setter does is simple — and it's the same order again. First goal 1: he goes into the zone where he will play the ball — better yet, he is already there. There he keeps the centre of gravity still in order to gauge the ball's x- and z-velocity precisely, because he only has one chance. Then he sets up for the jump. This isn't about the height, but about adopting the ball's x- and z-velocity. This way the stable position under the ball is maintained as long as possible, and he can distribute in all directions.

That is goal 2, just with a tighter tolerance. If these velocities don't match, the setting window shrinks drastically. Then you are only busy controlling a compensating movement with the hands — that has nothing to do with ball control any more, that is pure damage limitation.

The nice thing: it is often enough to neutralise **one** velocity direction. Usually we adopt the x-velocity with the centre of gravity and balance out the z-velocity with the arms. Because it is normally small, this works well.

---

## The Attack

In the attack the controlled zone is smallest: it is no longer the space around the centre of gravity, but the hitting window above the hitting shoulder — horizontally about 0.5 m, and the arm needs time within it for the fine adjustment. Accordingly, the attack punishes a high relative velocity at the moment of contact severely.

In the attack there are several ways to match the centre of gravity to the ball. The most important — and most counter-intuitive — is hang time. Counter-intuitive because here we don't adjust to the ball at all, but simply hang in the air. That is precisely where the trick lies: while hanging, our y-velocity is zero for a relatively long time. We are no longer accelerating toward the ball; instead the ball comes to us. In this window we can best estimate how fast it is approaching — during the upward movement that is barely possible. A controlled hit needs a stable centre of gravity, and we obtain that in the y-direction through hang time and a form-2 attack.

In the x-direction, too, we can match our velocity to the ball. This works best in the middle positions, and with some creativity outside as well. On the opposite (D) it is harder, but there it also isn't a big problem, because the x-velocity is usually small.

A common problem in the attack through the middle is the timing within the hitting window — especially when the ball is to be hit far away from the setter. Then it often has a high x-velocity, and the hitting arm is simply too slow to catch the ball while it is still in the window. This is exactly where the centre-of-gravity trick helps: we drift along with the ball and lower the relative velocity below the critical threshold.

<MiddleAttackReach />

Let's run the numbers. The hitting window is horizontally about 0.5 m wide, and the arm needs about 0.25 s to adjust. This yields a critical relative x-velocity of 2.0 m/s — the ball must not be faster than that relative to us. But a shoot pass through the middle easily has 4.0 m/s. The arm alone can't keep up. If we drift sideways in the jump at about 2.0 m/s, the relative velocity drops to 2.0 m/s — and the ball is back inside the window.

That is why it makes sense in the middle to run from right to left: this reduces the ball's relative x-velocity. We can apply the same trick outside, even if it is unusual there. If we have to defend far into the court or want to attack a "4" pass, we drift slightly to the left in the jump — the relative x-velocity becomes smaller. Combined with hang time, this gives us the time to see the block and find gaps in the defence.

---

## Conclusion

First to the ball — that remains goal number one. Once that is secured, the **relative velocity between centre of gravity and ball at the moment of contact** decides: the smaller it is, the more precisely we play. Unlike catching, we don't have to adjust over the entire flight, but only in the short window around contact.

How strict this criterion is depends on the size of the controlled zone: about 30 cm in reception, considerably less in setting, least of all in the attack's hitting window. As long as the ball stays in this zone, the arms and hands correct almost everything. If it leaves the zone during contact, it becomes damage limitation.

For this we need strength and mobility to reach various positions quickly. But our focus should always be on our own centre of gravity: too often we bring it to rest and can then no longer move it on. That is exactly when the technical errors pile up.
