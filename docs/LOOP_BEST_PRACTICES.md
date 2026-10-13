# Loop-friendly workflows

These are local engineering recommendations, verified as implemented on 2026-10-11; they are not provider guarantees.

| Strategy | Intended behavior | Trade-off |
| --- | --- | --- |
| Match Starting/Ending Pose | Subject settles back to its initial pose; framing/appearance match at the boundary | Motion may slow or feel repetitive. Rain/steam particles still need boundary inspection. |
| Continuous Ambient Motion | Ambient movement stays active across the boundary | Matching endpoint pixels are not expected for every particle; discontinuities can remain. |
| Post-Production Crossfade Friendly | Calm, similar first/last moments for an editing dissolve | Crossfade can create ghosting and cannot repair every geometry change. |
| None | One-off cinematic action | No repeatability constraint. |

Locked camera and one primary plus a small number of secondary motions are the default. Push-ins, pans, tilts and parallax change framing; the app warns that a one-way camera move is usually not directly seamless. The tool does not silently replace a user's camera choice.

For Flow models whose consumer registry confirms first/last frames, identical endpoint images are appropriate guidance only for a requested full revolution or a genuinely returning-pose plan. Manually attach them in the external frame slots, describe the in-between movement and verify that movement actually occurs. This generator neither fills those slots nor uploads images. For Grok, consumer frame support remains unverified. See the dated sources in PROVIDER_CAPABILITIES.md.

An intended one-way 90°/180° turntable or camera orbit has different ending orientation/viewpoint. If using a supported external frame workflow, provide a **distinct end image matching that requested endpoint**, or omit the end-frame control and choose no loop. Repetition requires a separately designed return path or editing, with its own quality review. The generator keeps the selected angle, direction and turntable/orbit mechanics; it does not add a return leg or silently extend the turn to 360°. Unknown Grok endpoint controls stay explicitly unverified; distinct endpoints are conditional guidance after checking the real website. These endpoint choices are local engineering advice, not new provider capability claims.

For 360° turns prefer stable framing and uniform angular speed; easing may pause at the loop boundary. Continuous rotation describes angular motion rather than unrelated environmental movement. One-way 90°/180° turns do not close their path; the app warns and does not request a contradictory return orientation. Matching orientations are a request, not evidence of a full revolution. Review the whole video and several repeated plays. Endpoint MAE metrics cannot prove motion is correct or perceptually seamless.

In the Little Jazz Stories workflow, remove generated audio, attach separately produced jazz music and inspect transitions after rendering. The app does not render the final loop or crossfade.

## Compiler 1.2.0 density and review

Concise retains return-pose/boundary/editing intent in shorter clauses. Detailed adds coherent poses only for selected discrete actions, smooth evolution only for selected continuous motion, or progressive rotation orientations; a one-way partial turn never gains an extra return leg. Provider composition changes instruction priority, not the chosen loop/camera/angle/direction. Old exported loop instructions remain preserved verbatim and are validated using their historical compiler before explicit migration; current warnings and any copy-blocking errors are rerun. Ordinary prompt editing or provider/language comparison preserves the QC player's position, playback state, notes and checklist, so full-timeline inspection can continue.
