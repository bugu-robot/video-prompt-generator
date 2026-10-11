# Prompt formulas and observable settings

Compiler version **1.1.0**. All providers share one normalized typed Motion Plan. The English and Chinese pairs live in the same `PromptSection` objects. Free-text English is never falsely translated; Chinese notes are supplied by the user or shown as untranslated English.

| Compiler | Composition and action expression | Preserved semantics |
| --- | --- | --- |
| Omni | Prioritize the primary action's group, use natural `let <subject> <action>` and concurrent accompaniment; put pacing next, then camera and preservation. Avoid restating the scene or prescribing every intermediate frame. | All selected actions/conditions, camera or rigid path, timing, preservation, loop, notes and audio |
| Veo | Establish camera/shot geometry first, then explicit primary/supporting action hierarchy (`<subject> should <action>`). Place duration and temporal continuity near action, before boundary/preservation clauses. | The same typed intent; no new lens, lighting, frame size or scene invention |
| Grok | Direct subject-action commands (`<subject>: <action>`); action and requested duration precede pacing/camera/boundary instructions. Avoid a decorative scene description. | The same intent; wording informed by xAI I2V API examples, consumer controls remain unknown |

These are composition strategies, not just headings: section order and action syntax differ even after removing opening lines/titles/whitespace. Shared `MotionCue` values, conditional existence, camera/rotation geometry and preservation rules remain centralized in `intent.ts`. A primary environmental action is ordered ahead of subject actions for every provider; list order expresses emphasis, **not** an invented sequential timeline. Within each action group the main action precedes supporting ones. Fully constrained rigid rotations intentionally retain the same mechanical clauses; no artificial provider differences are forced.

Official grounding and scope: [Omni natural conversation/overall intent/camera guide](https://deepmind.google/models/gemini-omni/prompt-guide/), [Veo framing/action guide](https://deepmind.google/models/veo/prompt-guide/), [Veo I2V best practices](https://cloud.google.com/vertex-ai/generative-ai/docs/video/best-practice), [xAI I2V](https://docs.x.ai/developers/model-capabilities/video/image-to-video). Rechecked 2026-10-11. The chosen ordering and density rules are our engineering interpretation; they are not provider-mandated syntax or evidence of better output quality. API documentation never enables consumer controls.

A source image provides the visual scene; prompts avoid reinventing it. Unconfirmed motion elements use **if already visible** wording. Confirming elements only suppresses that condition; it does not perform image analysis. Changing subject type/English or Chinese description, scene notes, motion membership (adding or removing), source image or region clears confirmation. Replacing an image clears it even if metadata is identical; presets/imports also require reconfirmation. Provider, language, length, intensity, timing, camera and unrelated settings do not clear it.

## Modes and camera

Ambient defaults to a locked tripod. Cinematic enables dolly/orbit in addition to the restrained ambient camera set. Rotation emits **only** its rigid turn or camera path, retaining dormant ambient selections for later mode switches. Turntable has a stationary camera; camera orbit keeps the object stationary. Conflicting imported camera/type combinations produce an error.

Dormant selected motions are not checked for conflicts in Rotation, because they are not emitted. The same stored motions are checked again when active in Ambient/Cinematic. Every base/variant/comparison copy gate evaluates its own compiled plan rather than treating hidden settings as emitted actions.

Direction is viewed from the positive selected axis toward the object center. A Y-axis clockwise turn is viewed from above. This is an explicit requested convention, not proof the model follows it. 90°/180° cannot also finish at the start in one single-direction turn; selecting these angles clears return-to-start.

For partial turns, provider workflow advice recommends distinct matching target endpoints where consumer support is confirmed, otherwise an explicit check of unverified controls, no endpoint/no loop, or a separately designed return path/edit. The app does not suggest identical endpoint frames for an intended one-way partial turn or change its angle/direction. Full-turn/returning-pose identical-frame guidance remains available for supported consumer workflows.

## Smart A/B/C

- A keeps the primary motion plus at most one selected secondary motion, uses minimal amplitude and sparse short gestures.
- B uses all selected motions with natural recurrence, preserving the configured amplitude.
- C uses those same actions with sustained environmental movement and longer readable gestures. It never exceeds the user's selected amplitude or adds new objects.

Camera, identity, selected preservation, loop strategy, angle, direction and rotation geometry constraints are retained. Eased rotations can vary the duration of acceleration/deceleration. A rigid fixed-angle uniform/steady turn has no remaining motion freedom; variants intentionally share the same prompt and display that limitation. The app does not claim arbitrary adjective swaps are different motion.

## Length and audio

- Concise uses shorter camera, pacing, duration, loop and mechanical-constraint sentences plus compact action-role wording. It retains each action verb, source condition, angle/direction/axis/speed, identity, applicable preservation, audio and user notes. It is not whitespace-only shortening or arbitrary truncation.
- Balanced uses complete readable action/camera/pace/boundary clauses; Veo displays named shot sections.
- Detailed adds relevant frame-to-frame guidance: coherent intermediate poses for natural actions, rests/faint selected environment for sparse timing, continuous selected environment at the chosen amplitude for sustained timing, progressive intermediate orientations for rotations, and no extra reverse leg for a partial turn. It adds no new scene object or unchecked preservation requirement.

Density tests compare semantic clauses without headings/whitespace. Representative ambient/rotation/cinematic plans are materially shorter in Concise and longer in Detailed. Long user-supplied notes and irreducible geometric constraints can reduce the percentage difference; they are never cut to meet a word target.

No Requested Audio is a visual-only request, not guaranteed silence. Ambient requests only natural sound suitable to visible elements. Provider Default omits audio instructions. Generated audio can be removed in the final rendering.

## Rule audit

No compatibility/success percentage. Findings identify source uncertainty, too many motions, all declared undirected motion conflicts (sleep with breathing, blink, look or gesture), reported once per pair regardless of declaration/selection order, inanimate subjects with biological motion, camera/free-text conflicts, loop-hostile framing changes, deformation risk, duration/reference gates, lighting tension, single-image hidden geometry and unverified Grok consumer workflows. Text notes have a limited keyword audit; the tool does not fully understand arbitrary language.

Each active setting changes prompt intent, plan/export metadata or an explicit workflow finding. Image metadata and the rectangle are local context, not transmitted pixels or an external motion mask. Advanced preservation instructions are emitted only when applicable; rotation geometry/lighting/framing clauses avoid duplicate shared preservation clauses.

## Export provenance

Motion Plan/export schema stays 1.0.0. New exports use compiler 1.1.0; compiler 1.0.0 exports are checked using a frozen historical compiler/audit/capability snapshot, never using current sentences. A version change requires a visible old/new prompt comparison and explicit migration acceptance. See MOCHI_BOT_INTEGRATION.md.
