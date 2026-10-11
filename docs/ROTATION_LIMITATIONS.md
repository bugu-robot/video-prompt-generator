# Rotation limitations and acceptance

| Input/workflow | What it means here | Limitation |
| --- | --- | --- |
| Single image | Prompt for approximate reconstruction from visible surfaces | Back/occluded geometry is not verified; shape, markings and proportions may drift. |
| Multiple reference views | Guidance to manually supply views in an external supported consumer workflow | Local upload does not attach them. Ingredients/references do not automatically lock a first frame. Unsupported/unknown models raise findings. |
| True 3D source | Recommendation to use an external 3D renderer for exact geometry | No local 3D importer, renderer or fake AI reconstruction exists in this app. |

Turntable: object rotates about its own selected axis, stationary camera. Camera orbit: object remains stationary, camera moves around it. Direction is observed from the positive selected axis toward the object center; Y-axis direction is observed from above. Depth-axis orbit is unusual and gets an advisory.

360° requests one full revolution and, if selected, the starting orientation/camera view at completion. 90°/180° with return-to-start is rejected as a contradictory single-direction request. The UI clears that return option when partial angles are selected. Partial turns with any loop preference also warn that endpoints differ; pose/continuous prompt clauses describe coherent motion within the turn and a separately designed edit/return path rather than inventing a completed loop. Continuous 360° loop intent describes angular movement, not unselected ambient animation.

Uniform speed is the usual loop-friendly request. Slow means steady but slower motion. Ease-in/ease-out changes angular cadence and may create a pause at the boundary. A fixed uniform rotation leaves no variation freedom, so A/B/C disclose identical core prompts; eased cadence supports distinct variants without changing angle/direction/axis.

For one-way 90°/180° turntable **and** orbit, external Flow frame advice uses a different end image matching the intended final orientation/viewpoint, or recommends omitting the endpoint and using no loop. A repeatable edit/return path must be designed separately. Do not use the same source in both slots for a non-closing partial turn. Full revolutions and genuine returning-pose plans retain identical-endpoint guidance where the consumer registry supports that control. Grok controls remain unverified. No advice automatically changes the selected angle, direction or mechanics.

Ambient subject/environment selections stay stored when entering Rotation. They are dormant: the rigid turn/orbit prompt and its motion-conflict audit exclude them. Returning to Ambient or Cinematic restores those selections and any genuine conflicts. This behavior applies equally to base, A/B/C and provider-comparison copy checks.

## Manual acceptance

Check the complete timeline, not just endpoint images:

- The subject actually moves through the requested angle; front, side and rear views appear in the intended order.
- Turntable/orbit are distinguishable and follow the chosen direction.
- Proportions, geometry, face, markings and materials remain coherent.
- Scale, center, lighting and framing obey selected constraints.
- There is no deformation/disappearance/extra object or unexpected camera cut.
- For loops, speed and orientation remain natural across repeated boundaries.

The local QC panel supplies duration, resolution and approximate first/near-last samples. It does not estimate 3D pose, track identity or measure angular completion. Low endpoint difference can also mean the object never moved.
