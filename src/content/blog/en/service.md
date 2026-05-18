---
title: "The Serve: Variants and Invariants"
date: 2026-05-14
author: Cedric Geissmann
tags:
  - Serve
  - Technique
description: "What makes a good serve — and how do you learn it? From the kinetic chain to Bernstein's degrees of freedom to a 3D simulation."
published: true
---

<script>
  import ServiceSimulation from '$lib/components/blog/ServiceSimulation.svelte';
  import HandVelocityAnimation from '$lib/components/blog/HandVelocityAnimation.svelte';
  import VelocityDisplay from '$lib/components/blog/VelocityDisplay.svelte';
</script>

You want a really good serve? You've already tried a lot, but something still isn't clicking — or your shoulder starts complaining after training? Then you're in the right place. In this post we'll look at what actually makes a good serve, why certain techniques cause shoulder pain, and how a simple conceptual framework can accelerate your learning.

## Why Does the Serve Destroy Your Shoulder?

Many players know the feeling: after an intense training day, there's an unpleasant pulling sensation in the shoulder. Most of the time this isn't caused by "too much training" — it comes from a single bad habit, the so-called **cannonball technique**.

What is that? When we swing the arm as early and explosively as possible out of the shoulder, the arm is essentially hurled forward with little control. That feels powerful — and it is — but it's neither precise nor joint-friendly. The shoulder has to not only generate the force but simultaneously brake and stabilise the arm. That's a recipe for overuse.

The good news: there's a better way. And it's not based on more strength — it's based on more coordination.

## Variants and Invariants — What This Means for You

Before we get to the solution, we need a concept that makes training much simpler: the difference between **variants** and **invariants**.

Let's start with the two most common types of serve:

**Topspin serve**: The goal is to get the ball into the opponent's court as fast as possible with heavy forward spin, arriving so quickly that the reception is too late or the opponent is forced into a difficult situation.

**Float serve** (standing or jump): The goal is to make the ball flutter unpredictably without spin. This makes it hard to read and difficult to receive — even at moderate speed.

Both types are **variants** of the same task: put the opponent under pressure. One does it with speed, the other with unpredictability. Neither is fundamentally superior — the choice depends on the situation, the opponent, and your own strengths.

The **invariant** stays the same in both: the ball must land in the court and put the opponent under pressure.

**What does this mean for you in practice?** You don't have to copy a single "correct" technique. You can choose the variant that suits you — and focus on the invariant, the result you need. That removes the pressure of looking perfect and puts attention where it belongs: on the outcome.

The same concept applies to every technique in volleyball. In attack there's the spike, the tip, and the shot — all **variants**. The **invariant** is that the ball touches the floor on the other side. For the float serve, the invariant is a zone in the opponent's court. Exactly how you get it there is the variant — and that's precisely what makes volleyball learnable for everyone.

## The Kinetic Chain — Your Body as a Whip

Now we get to the core: where does the power for a good serve actually come from?

Think of a whip. The thin tip at the end moves fastest — not because it has the strongest muscles, but because each segment of the chain passes its motion on to the next. The final segment receives the energy of all previous segments and rotates rapidly around its own attachment point.

That is exactly how the human body works during a serve — we call this the **kinetic chain**:

1. **Running speed** (for the jump serve): Already during the approach you set your entire body in motion. That speed is available to your hand for free.
2. **Hips**: Hip rotation starts the chain. Because the hand is so far from the hips, even a small rotation already creates a meaningful velocity at the hand.
3. **Shoulder**: The shoulder movement adds to the hips — controlled and coordinated, not explosive.
4. **Elbow whip**: The forearm snaps through last. Because it sits at the shortest lever arm, it can move very fast — without the shoulder taking on extreme stress.

The result: your hand reaches a high velocity without any single joint having to do all the work alone. The shoulder stays in control, the serve becomes more consistent — and the shoulder pain disappears.

This is exactly what the Russian physiologist Nikolai Bernstein observed in the 1920s — not in volleyball players, but in blacksmiths. He recorded the hammer strikes of experienced smiths using the then-new high-speed cameras and discovered something surprising: the hammer hit the anvil at nearly the same spot on every strike — but the movement of the individual joints was slightly different each time. Shoulder, elbow, and wrist combined in a slightly new way each time to achieve the same result.

Bernstein called this **"repetition without repetition"**. The outcome — the contact point on the anvil — was stable. The path to it — which joints contributed how much — varied constantly. And that is precisely what protects against overuse: because no two repetitions load exactly the same structures in exactly the same way, no single joint can accumulate stress. Variability in execution is not a flaw — it's a built-in protection mechanism.

For the serve this means: when your shoulder hurts after training, it's usually not because you served too much. It's because you repeatedly overloaded the same joint in the same way — because you used too few degrees of freedom, too few segments of the kinetic chain. A blacksmith who hammers with only their wrist will feel pain after ten strikes. A blacksmith who coordinates hips, shoulder, and elbow can work for hours.

Try it yourself. In the animation below you can set the four components of the kinetic chain individually. Watch how the maximum hand speed changes as you try different combinations. With the default settings the hand reaches roughly **<VelocityDisplay kmh={true} />** — with load distributed evenly across all joints.

<HandVelocityAnimation />

A few observations you can make:

- **Shoulder to zero**: The serve becomes noticeably slower, but it's still possible. This shows that hips and elbow alone can already produce a usable serve.
- **Shoulder to maximum**: Hand speed increases, but notice how uncontrolled the movement becomes — that's the cannonball technique.
- **Increase running speed**: Even 3–4 m/s of approach adds directly to hand speed. That's "free" speed that takes load off the shoulder.
- **Everything balanced**: The strongest and most stable combination is when all four parts work together.

> **Note on the simulation:** The values you see in this animation come from a simplified model. Real hand speeds depend on body size, muscle mass, fitness level, and technique, and can vary significantly. The numbers themselves are not to be taken literally — the point is to understand the *principle*: how the individual links of the kinetic chain interact, and why coordination matters more than raw force in a single joint.

## Bernstein's Degrees of Freedom — Why Learning Takes Time

Bernstein described something else that's directly related to degrees of freedom: for a single serving motion, your body has to coordinate dozens of joints and muscles simultaneously. For beginners that's simply too much at once.

The nervous system solves this pragmatically: it **freezes joints**. Beginners often serve with a stiff arm, almost no hip rotation, no elbow whip. This isn't a mistake — it's a survival mechanism. The body has too many degrees of freedom at once and reduces them to make the task manageable.

So if you're in the process of learning the serve from scratch or switching to the other side, you'll recognise this freezing: everything feels stiff and unnatural. That's completely normal. The next step — gradually unlocking the degrees of freedom — happens by itself as you keep playing.

**What can you actively do?** Instead of adjusting each joint individually, focus on an **external focus**: the contact point on the ball. This one concrete piece of information triggers the self-organisation of your body. You don't need to think "elbow higher, wrist loose, rotate hips" — when you know exactly where you want to hit the ball, your nervous system handles the rest automatically, more efficiently than any internal controller could.

## The Two Invariants of a Good Float Serve

For the float serve there isn't one invariant — there are **two**, and they have to work together: the **contact point** and the **hand speed**.

### Invariant 1: The Contact Point

The contact point on the ball determines where the ball travels and how it behaves — regardless of whether you're standing or jumping, whether you take a long or short approach.

- Hit centre-front: the ball flies straight and flutters evenly.
- Hit slightly above centre: the ball gets light topspin and drops faster.
- Hit to the side: the ball drifts sideways.

If you have a target — a weak reception position, a specific zone in the court — then solve only that geometry problem: *Where exactly do I need to hit the ball for it to land there?* Leave everything else to your body.

### Invariant 2: Hand Speed

Hand speed at contact determines how fast the ball travels and how far it reaches. Here too you're free in how you generate it — that's the variant. Whether you use more approach, more hips, or more shoulder doesn't matter, as long as the right speed arrives at the hand.

At 60–80% of maximum speed — which at your current settings corresponds to roughly **<VelocityDisplay factor={0.6} /> to <VelocityDisplay factor={0.8} kmh={true} />** — you have enough control to reliably find the contact point. Only once that's stable does it make sense to add more speed.

These two invariants are connected: a precise contact point is useless if the ball is too slow to reach the court. And high speed doesn't help if you can't control the contact point. The goal is to stabilise both together — start at reduced speed, then increase gradually.

In the simulation below you can do exactly that: choose a contact point, set speed and height, and see where the ball lands.

<ServiceSimulation />

The simulation shows something that surprises many players: at the same hand speed, the ball travels farther when you hit it slightly lower on the ball's surface — because the launch angle becomes steeper and the ball covers more distance before hitting the floor. That sounds like a simple trick at first, but it has two important consequences:

**If your serve is already long**, you can't simply hit even lower — the ball will land out. Hitting lower increases distance, not precision. In this case you need to either reduce hand speed or correct the contact point upward.

**If your serve barely clears the net**, you can try hitting the ball slightly lower to gain more distance — but only up to a point. The simulation shows this clearly: too far below centre shortens the serve again, because the launch angle becomes so steep that the ball flies high but no longer far. There's an optimal window for the contact point vertically, and it depends directly on your hand speed and the distance to your target.

> **Note on the simulation:** This simulation too is a simplified model — it calculates a straight flight path with no air resistance and no spin. In reality that's only part of the picture. A real float serve creates irregular airflow through the spin-free rotation of the ball, causing it to break sideways or downward unpredictably — the actual flight path is therefore harder to predict than shown here. This becomes even more pronounced with a topspin serve: the forward spin presses the ball down earlier, allowing it to land in the court at higher speeds and from greater contact heights. The simulation doesn't show what's possible — it shows how the fundamental parameters relate to each other. The specific numbers are approximations, not measurements.

## How It All Comes Together

Now we have all the pieces: the kinetic chain for hand speed, the contact point as the first invariant for direction, hand speed as the second invariant for power — and the understanding of variants, that there are multiple paths to the same goal.

A good float serve comes together like this:
- **Define the target**: Which zone should the ball hit? Which reception position would find a specific zone difficult?
- **Plan the contact point**: Where exactly on the ball do I need to hit for it to reach that zone?
- **Choose hand speed**: How much speed do I need for this distance and flight path?
- **Activate the kinetic chain**: Approach, hips, shoulder, elbow — coordinated, not explosive. The hand speed follows from that.
- **Stay external**: During the serve, focus on the contact point, not on your arm.

What makes this particularly powerful: because the kinetic chain consists of many parts, it's also flexible. If you're injured and need to protect your shoulder, you can use more hips and approach. If you're tired, you can reduce the intensity of each link without giving up the serve entirely. Your body automatically finds a new solution — as long as you give it clear invariants: the contact point and the target speed.

The simulations in this post help make these connections tangible — but they are simplifications. Real bodies aren't machines with fixed levers, and real balls don't fly in a vacuum. A float ball wobbles unpredictably, a topspin ball drops earlier, headwind shortens the flight. The numbers in the simulations are approximations that illustrate the principle — not benchmarks to verify in training. What you can take away is the underlying pattern: coordination beats strength, invariants guide the movement, and variability protects the body.

## What This Means for Your Attack

This concept transfers directly to other situations in volleyball. Think back to the previous post on attack timing: there we distinguished between Form 1 (reactive, retaining control) and Form 2 (committing early, reading timing from the setter).

The **invariants** in a Form-2 attack are the same as in the serve: the contact point on the ball and a specific hand speed for the chosen attack direction. The attacker commits early to a position and a jump timing — that's the moment they give up control. From there the only task is: where exactly on the ball's surface do I make contact, at what speed, for the ball to go there?

Just like in the serve: no instructions to the arm, no internal controller. Only the two invariants as an external focus.

That's no coincidence. The principle of external focus on concrete **invariants** works throughout volleyball — in the serve, the attack, the set, even in reception. Anyone who understands this no longer needs to memorise individual movements. They only need to learn to identify the right invariants for each situation — and then focus on them.

The rest takes care of itself.
