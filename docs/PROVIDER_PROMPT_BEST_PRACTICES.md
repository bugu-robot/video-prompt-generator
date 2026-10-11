# Provider prompt research

Verified on **2026-10-11** using the official pages below. Model guides describe models; the Flow Help model table describes the consumer website. Nothing here was tested by consuming generation credits. Website availability can depend on region, account and rollout.

| Official source | Scope | Findings used by this app | Confidence |
| --- | --- | --- | --- |
| https://deepmind.google/models/gemini-omni/prompt-guide/ | Omni model guide | Natural-language motion intent, camera direction and references; iterative editing; first/last-frame transitions. Compiler 1.1.0 leads with motion intent and concurrent accompaniment, then camera/preservation; it does not micro-script every frame. | High for documented prompting, unverified for output fidelity |
| https://deepmind.google/models/veo/prompt-guide/ | Veo model guide | Describe framing, camera motion and action. This app preserves the supplied image instead of rewriting the whole scene. Veo leads with shot/camera geometry, main/supporting actions, then timing/boundary/preservation. | High for guidance; image-preservation strategy is our engineering interpretation |
| https://support.google.com/flow/answer/16353334?hl=en | Flow consumer creation workflow | Frames and Ingredients are separate workflows. Manually attach images in Flow. Visual inputs and text should agree; clean references reduce unwanted subjects. | High |
| https://support.google.com/flow/answer/16352836?hl=en | Flow consumer capabilities | Model-specific availability controls warnings and disabled duration options. See PROVIDER_CAPABILITIES.md. | High for listed features; account UI needs UAT |
| https://support.google.com/flow/answer/16935718?hl=en | Flow consumer editing | Omni editing is an external workflow; this app does not edit videos. Flow extension availability differs from model-guide examples. | High |
| https://ai.google.dev/gemini-api/docs/veo | Veo API, not Flow UI | Image input, references, last frame and generation parameters are documented for API models. Do not transfer API specifications to Flow without separate website evidence. | High for API only |
| https://docs.x.ai/developers/model-capabilities/video/image-to-video | xAI API | A still image and optional prompt animate source content. The compiler uses direct subject-action commands with adjacent timing, then camera/endpoint constraints. Current consumer controls are not established by this API page. | High for API, low for consumer UI inference |
| https://docs.x.ai/developers/model-capabilities/video/reference-to-video | xAI API | Model-dependent reference and pinned-frame workflows are documented. Those inputs are not automatically supplied by this app. | High for API only |
| https://docs.x.ai/grok/overview | Grok consumer overview | Imagine can create images/video. This overview does not establish precise I2V controls, durations, aspect ratios or reference workflows. | High for general consumer product; specific capabilities unknown |
| https://docs.x.ai/grok/faq | Grok consumer FAQ | Output quality can depend on tier/caps. No precise current I2V timing specification was established in this research. | Medium |

## Local compiler policy

1. Use the uploaded image as a visual reference; no computer vision is implemented.
2. Describe only selected motion, camera, pacing and applicable preservation constraints.
3. If the user has not confirmed image elements, use conditional motion language. Presets never confirm that a cup, window, animal or tree exists.
4. Distinguish stationary-camera object rotation from a camera path around a stationary object.
5. Express loop/rotation as intent. Matching endpoints do not verify a full revolution or seamless playback.
6. Concise compresses actual clauses (not just layout), retaining every selected action and applicable constraint; Balanced is complete; Detailed adds timing/mode-relevant continuity. Chinese interpretation uses the same sections and user-supplied Chinese notes, without translation APIs.
7. Provider composition changes action grammar and priority ordering while retaining shared MotionCue semantics. These local strategies are documented in PROMPT_FORMULAS.md. The Grok compiler is a conservative local formula inferred from API examples, **not** a verified consumer-specific best-prompt standard.
8. Keep frame workflow advice consistent with the motion path. One-way 90°/180° turntable/orbit guidance uses a distinct final orientation/viewpoint or no endpoint/no loop; repetition needs a separately designed return path or edit. Identical endpoint images are reserved for full revolutions or returning-pose plans. This is engineering interpretation of the documented visual-input/text agreement (Flow creation URL above, verified 2026-10-11, high confidence for documentation; output fidelity unverified), not a provider rotation guarantee. Grok consumer endpoint support remains unknown.

Object rotation, hidden-surface reconstruction, crossfading and A/B/C timing are **engineering strategies**, not documented provider guarantees. Consumer I2V UAT and subjective video quality remain manual.

## Recheck for compiler 1.1.0

The three primary prompting/I2V links above were opened again on 2026-10-11. Omni guidance explicitly contrasts overall intent with Veo's precise directions; Veo describes framing/camera and action. The separate [official Veo I2V best-practice guide](https://cloud.google.com/vertex-ai/generative-ai/docs/video/best-practice) grounds source-image continuation rather than a replacement scene description. xAI's image-plus-instructions examples ground direct animation wording. Action hierarchy, provider section ordering, density reduction and detailed continuity are our engineering interpretation, not a verified consumer-specific success formula. No generation trial or account probe was performed.
