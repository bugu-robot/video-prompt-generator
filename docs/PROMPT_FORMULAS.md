# Prompt formulas and observable settings

Compiler version **1.0.0**. All providers share one normalized typed Motion Plan. The English and Chinese pairs live in the same `PromptSection` objects. Free-text English is never falsely translated; Chinese notes are supplied by the user or shown as untranslated English.

| Compiler | Opening and rendering | Shared intent |
| --- | --- | --- |
| Omni | Natural scene continuation; flowing paragraphs | Source region, camera OR rigid rotation, selected conditional motions, qualitative amplitude/timing, duration preference, applicable preservation, loop intent, supplied notes, audio |
| Veo | Controlled single shot with named cinematic sections | The same settings; no provider-specific user intent loss |
| Grok | Direct source-image animation intent | The same settings; current consumer capabilities are conservatively unknown |

A source image provides the visual scene; prompts avoid reinventing it. Unconfirmed motion elements use **if already visible** wording. Confirming elements only suppresses that condition; it does not perform image analysis. Replacing an image, applying a preset or adding motion clears the confirmation.

## Modes and camera

Ambient defaults to a locked tripod. Cinematic enables dolly/orbit in addition to the restrained ambient camera set. Rotation emits **only** its rigid turn or camera path, retaining dormant ambient selections for later mode switches. Turntable has a stationary camera; camera orbit keeps the object stationary. Conflicting imported camera/type combinations produce an error.

Direction is viewed from the positive selected axis toward the object center. A Y-axis clockwise turn is viewed from above. This is an explicit requested convention, not proof the model follows it. 90°/180° cannot also finish at the start in one single-direction turn; selecting these angles clears return-to-start.

## Smart A/B/C

- A keeps the primary motion plus at most one selected secondary motion, uses minimal amplitude and sparse short gestures.
- B uses all selected motions with natural recurrence, preserving the configured amplitude.
- C uses those same actions with sustained environmental movement and longer readable gestures. It never exceeds the user's selected amplitude or adds new objects.

Camera, identity, selected preservation, loop strategy, angle, direction and rotation geometry constraints are retained. Eased rotations can vary the duration of acceleration/deceleration. A rigid fixed-angle uniform/steady turn has no remaining motion freedom; variants intentionally share the same prompt and display that limitation. The app does not claim arbitrary adjective swaps are different motion.

## Length and audio

Concise joins all required semantic clauses into one paragraph. Balanced separates them; Veo uses section titles. Detailed adds a continuous-shot/frame-to-frame continuity instruction without adding new scene objects or overriding unchecked preservation options.

No Requested Audio is a visual-only request, not guaranteed silence. Ambient requests only natural sound suitable to visible elements. Provider Default omits audio instructions. Generated audio can be removed in the final rendering.

## Rule audit

No compatibility/success percentage. Findings identify source uncertainty, too many motions, incompatible sleeping/blinking/looking actions, inanimate subjects with biological motion, camera/free-text conflicts, loop-hostile framing changes, deformation risk, duration/reference gates, lighting tension, single-image hidden geometry and unverified Grok consumer workflows. Text notes have a limited keyword audit; the tool does not fully understand arbitrary language.

Each active setting changes prompt intent, plan/export metadata or an explicit workflow finding. Image metadata and the rectangle are local context, not transmitted pixels or an external motion mask. Advanced preservation instructions are emitted only when applicable; rotation geometry/lighting/framing clauses avoid duplicate shared preservation clauses.
