# Loop-friendly workflows

These are local engineering recommendations, verified as implemented on 2026-10-11; they are not provider guarantees.

| Strategy | Intended behavior | Trade-off |
| --- | --- | --- |
| Match Starting/Ending Pose | Subject settles back to its initial pose; framing/appearance match at the boundary | Motion may slow or feel repetitive. Rain/steam particles still need boundary inspection. |
| Continuous Ambient Motion | Ambient movement stays active across the boundary | Matching endpoint pixels are not expected for every particle; discontinuities can remain. |
| Post-Production Crossfade Friendly | Calm, similar first/last moments for an editing dissolve | Crossfade can create ghosting and cannot repair every geometry change. |
| None | One-off cinematic action | No repeatability constraint. |

Locked camera and one primary plus a small number of secondary motions are the default. Push-ins, pans, tilts and parallax change framing; the app warns that a one-way camera move is usually not directly seamless. The tool does not silently replace a user's camera choice.

For Flow models whose consumer registry confirms first/last frames, manually place the same image in both external frame slots if suitable, describe the in-between movement, and verify that all requested movement actually occurs. This generator neither fills those slots nor uploads images. For Grok, consumer frame support remains unverified. See the dated sources in PROVIDER_CAPABILITIES.md.

For 360° turns prefer stable framing and uniform angular speed; easing may pause at the loop boundary. Matching orientations are a request, not evidence of a full revolution. Review the whole video and several repeated plays. Endpoint MAE metrics cannot prove motion is correct or perceptually seamless.

In the Little Jazz Stories workflow, remove generated audio, attach separately produced jazz music and inspect transitions after rendering. The app does not render the final loop or crossfade.
