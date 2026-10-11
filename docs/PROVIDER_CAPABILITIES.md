# Provider capabilities — evidence snapshot 2026-10-11

The authoritative registry is `src/models/provider-capabilities.ts`. Statuses are **supported / unsupported / unknown**, scoped explicitly to the consumer website. No runtime provider connection exists. Source-backed does not mean the feature was exercised in the user's account.

## Flow consumer website

Official URL for every entry in this table: https://support.google.com/flow/answer/16352836?hl=en. Verified 2026-10-11, confidence **high** for the table, **unknown** for account/region rollout.

| Consumer model identifier | First frame / last frame | References | Video editing | Extend | I2V durations listed |
| --- | --- | --- | --- | --- | --- |
| Gemini Omni Flash 1.1 | Supported / supported | Supported | Supported | Not currently supported (coming soon) | 4, 6, 8, 10 seconds |
| Veo 3.1 Fast | Supported / supported | Supported, reference workflow 8 s | Unsupported | Unsupported | 4, 6, 8 seconds |
| Veo 3.1 Lite | Supported / supported | Supported, reference workflow 8 s | Unsupported | Supported, restricted external workflow | 4, 6, 8 seconds |
| Veo 3.1 Quality | Supported / supported | Unsupported | Unsupported | Unsupported | 4, 6, 8 seconds |

The Flow table reports both orientations; exact consumer aspect-ratio numbers are not independently established here. Omni resolutions are listed as 720p and draft 360p. Exact Veo consumer resolutions are left **unknown**, not copied from API specs. No aspect-ratio/resolution control is exposed by this generator.

The Omni model prompt guide mentions scene extension, while Flow's consumer table lists extension as coming soon. The app gates against the **Flow table**. Source: https://deepmind.google/models/gemini-omni/prompt-guide/ (2026-10-11, high confidence that both pages differ; availability must be rechecked).

Consumer workflow URLs: https://support.google.com/flow/answer/16353334?hl=en (frames/references) and https://support.google.com/flow/answer/16935718?hl=en (editing). Verified 2026-10-11, high confidence. Frames anchor endpoints; Ingredients provide reference identity. The app does not assume both workflows can be combined.

The app's endpoint suggestion is a **motion-dependent engineering policy**, not an additional capability: the four supported Flow model entries recommend distinct target endpoints or no endpoint/no loop for one-way 90°/180° turntable/orbit. Full revolutions and returning-pose plans can instead suggest identical images. A separately designed return path/edit is not submitted by this tool. Angle, direction and mechanics are never silently changed. This follows visual-input/text agreement in the Flow creation guide above; generation fidelity remains unverified.

## Grok consumer website

Stable internal selector: `grok-consumer-current`, a **non-versioned app selector**, not a claimed xAI model version. Consumer source: https://docs.x.ai/grok/overview, verified 2026-10-11, high confidence for general Imagine image/video availability.

I2V controls, end frames, multiple reference views, duration choices, exact resolutions/aspect ratios, editing, extension and exact audio controls are **unknown** in the consumer registry. Relevant dedicated sources retrieved describe the API; none verifies these controls in the current consumer account. The UI warns and marks duration/reference options as preferences or workflow guidance.

Partial-turn distinct-end-frame advice is conditional on verifying the actual website controls first. It does not promote Grok endpoint support from unknown or use API evidence to enable consumer features.

## API evidence — kept separate

| Official source URL | Verified scope and confidence | App behavior |
| --- | --- | --- |
| https://ai.google.dev/gemini-api/docs/veo | API docs name `veo-3.1-fast-generate-preview`; image, reference, last-frame and audio features are model-dependent. 2026-10-11, high for API only. | No API client, key, quota consumption or automatic website configuration. |
| https://docs.x.ai/developers/model-capabilities/video/image-to-video | API docs name `grok-imagine-video-1.5`; image input is supported. 2026-10-11, high for API only. | Conservative animation prompt; website specs unknown. |
| https://docs.x.ai/developers/model-capabilities/video/reference-to-video | API 1.5 documents reference images and pinned endpoints/keyframes. 2026-10-11, high for API only. | Consumer multiple-view workflow stays unverified. |
| https://docs.x.ai/developers/model-capabilities/video/generation | API parameter control is documented independently. 2026-10-11, high for API only. | No exact API limits are shown as website limits. |

## Guarantees and gates

Precise geometric reconstruction, actual 360° completion and mathematically seamless loops are **unknown/unpromised** for every provider (low confidence for a guarantee; no official promise found). These are manual QC requirements, not compatibility percentages.

Supported consumer durations are disabled where incompatible; retained imported/switching preferences raise an error rather than being silently discarded. Veo Quality References yields an explicit error. Unknown Grok workflows remain guidance with a warning. Free-text custom notes cannot configure external features and are audited only by a limited keyword rule set.

Before updating a capability, verify a new official page, record date/URL/confidence and add or update a regression test. API evidence cannot upgrade a consumer status.
