# Future Mochi Bot V2 integration

This task does **not** modify `bugu-robot/mochi-bot-v2`, initiate browser submissions, log into providers or consume credits. Integration is a future reviewed adapter. The generator is independent of provider automation and account state.

## Versioned contract

- `docs/motion-plan-export.schema.json`: strict JSON Schema 2020-12 for schema **1.0.0**.
- `docs/motion-plan-export.example.json`: complete deterministic illustrative export with fixed timestamp. The example metadata is illustrative, not a real attached Mochi image.
- `src/storage/export.ts`: runtime validation, same-plan mirrored-field checks and original-English recompilation.
- `src/storage/schema.ts`: canonical schema definitions; artifact consistency is tested.

Export fields: format/schema version; provider; internal model selection; generation mode; full Motion Plan; source image filename/MIME/size/dimensions; English prompt; compiler version; capability snapshot date; preset identity; loop settings; findings; export timestamp. Media bytes, object URLs, absolute file paths and credentials are excluded.

Internal model selectors are not API model IDs. `grok-consumer-current` explicitly means the consumer version is unknown. Never select an API version in browser automation based on this string.

## Adapter workflow

1. Receive a source image that the user explicitly selected. Resolve the exported metadata against that **same authorized task asset**; filename/size alone do not establish identity. Do not search unrelated downloads or assume a local app upload was sent to Flow/Grok.
2. Parse with size/depth/unsafe-key limits. Validate the schema, enums, numeric bounds, provider/model consistency, mirror fields and compiler version. Reject unsupported versions; do not reinterpret them silently.
3. Normalize the Motion Plan and deterministically compile the selected provider. Verify the supplied English prompt equals the pinned compiler output. Keep uncertainty findings attached.
4. Show the actual source, provider/model, English prompt and warnings for the existing explicit **APPROVED** requirement. Preserve the existing live-generation **kill switch** and task ownership/lease checks. Importing JSON does not authorize generation.
5. Only the separately authorized browser adapter may attach that asset and submit. Confirm website model/duration/reference controls from real UI evidence. Consumer unknowns require review; API specs do not settle them. Preserve acceptance uncertainty and never auto-resubmit after an ambiguous click/Enter.
6. Download only the result belonging to that task. Retain provider acceptance/result evidence, without credentials.
7. Run local Video QC, then full human review of identity, geometry, camera, natural movement, loop boundary and requested rotation completion. Endpoint pixel difference is only a measurable signal.
8. Upload result/diagnostics to Google Drive after successful download validation. Telegram requests follow the bot's existing authorized notification and approval workflow; this generator sends neither.
9. After the bot's existing video/music/final approvals, continue rendering with separately chosen jazz music and the established final-QC flow. Remove generated audio if requested.

## Approval and failure semantics

An export with structural errors or unapproved source provenance cannot be submitted. Findings must not be converted to a fake compatibility percentage. Unknown consumer features, reconstructions and 360 completion remain explicit uncertainty; do not erase them to enable automation. Keep the bot's existing human approval, credit/freeze waiting, lease ownership, retry and generation-kill behaviors intact.

The v1 generator has no transport endpoint, queue, task runner, provider login, Telegram or Drive integration. A future adapter may reuse the pure TypeScript engine or consume the versioned export; reviewing that adapter is a separate scope.
