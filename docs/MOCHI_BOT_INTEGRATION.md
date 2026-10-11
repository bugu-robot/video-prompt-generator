# Future Mochi Bot V2 integration

This task does **not** modify `bugu-robot/mochi-bot-v2`, initiate browser submissions, log into providers or consume credits. Integration is a future reviewed adapter. The generator is independent of provider automation and account state.

## Versioned contract

- `docs/motion-plan-export.schema.json`: strict JSON Schema 2020-12 for schema **1.0.0**.
- `docs/motion-plan-export.example.json`: unchanged historical compiler 1.0.0 illustrative export with fixed timestamp. The example metadata is illustrative, not a real attached Mochi image.
- `docs/motion-plan-export.current.example.json`: current compiler 1.1.0 fixture.
- `src/storage/export.ts`: strict runtime validation, historical-version verification, explicit migration review and separate current recompilation.
- `src/storage/export-profiles.ts`: exact allowlisted compiler/capability snapshot pairs.
- `src/storage/legacy-v1/`: immutable old compiler/audit/catalog/capability sources; only for historical verification.
- `src/storage/schema.ts`: canonical schema definitions; artifact consistency is tested.

Schema/plan version stays 1.0.0, and the historical example bytes are unchanged. The schema allows registered 1.0.0/1.1.0 compiler profiles; runtime also checks the exact compiler/snapshot pair. Validated mirrored JSON objects compare by keys/values irrespective of key order (including `loopSettings` and source metadata). Arrays remain ordered; values, unknown-field rejection, exact schema/compiler/capability versions, canonical dates and deterministically recompiled English prompts remain strict. The parser's 1 MiB limit counts UTF-8 bytes, not JavaScript string length. Import interoperability does not authorize generation or loosen approval/kill-switch requirements.

Export fields: format/schema version; provider; internal model selection; generation mode; full Motion Plan; source image filename/MIME/size/dimensions; English prompt; compiler version; capability snapshot date; preset identity; loop settings; findings; export timestamp. Media bytes, object URLs, absolute file paths and credentials are excluded.

Internal model selectors are not API model IDs. `grok-consumer-current` explicitly means the consumer version is unknown. Never select an API version in browser automation based on this string.

## Adapter workflow

1. Receive a source image that the user explicitly selected. Resolve the exported metadata against that **same authorized task asset**; filename/size alone do not establish identity. Do not search unrelated downloads or assume a local app upload was sent to Flow/Grok.
2. Parse with size/depth/unsafe-key limits. Validate the schema, enums, numeric bounds, provider/model consistency, mirror fields and compiler version. Reject unsupported versions; do not reinterpret them silently.
3. Use `reviewConfigurationImport(raw)` to validate the canonical original plan, mirror fields, original prompt and original findings against its pinned historical compiler/snapshot. It returns separate `original`, byte-exact `originalRaw`, `recompiled`, `migrationRequired` and changes. If migration is required, show both prompts and new warnings; only an explicit choice permits `importConfiguration(raw, { acceptMigration: true })`. No automatic version rewriting, prompt substitution or model/camera/angle normalization is allowed. Keep the original raw export separately. Recheck current findings even if the historical audit was clear; an old audit never authorizes new generation.
4. Show the actual source, provider/model, English prompt and warnings for the existing explicit **APPROVED** requirement. Preserve the existing live-generation **kill switch** and task ownership/lease checks. Importing JSON does not authorize generation.
5. Only the separately authorized browser adapter may attach that asset and submit. Confirm website model/duration/reference controls from real UI evidence. Consumer unknowns require review; API specs do not settle them. Preserve acceptance uncertainty and never auto-resubmit after an ambiguous click/Enter.
6. Download only the result belonging to that task. Retain provider acceptance/result evidence, without credentials.
7. Run local Video QC, then full human review of identity, geometry, camera, natural movement, loop boundary and requested rotation completion. Endpoint pixel difference is only a measurable signal.
8. Upload result/diagnostics to Google Drive after successful download validation. Telegram requests follow the bot's existing authorized notification and approval workflow; this generator sends neither.
9. After the bot's existing video/music/final approvals, continue rendering with separately chosen jazz music and the established final-QC flow. Remove generated audio if requested.

## Approval and failure semantics

An export with structural errors or unapproved source provenance cannot be submitted. Findings must not be converted to a fake compatibility percentage. Unknown consumer features, reconstructions and 360 completion remain explicit uncertainty; do not erase them to enable automation. Keep the bot's existing human approval, credit/freeze waiting, lease ownership, retry and generation-kill behaviors intact.

The v1 generator has no transport endpoint, queue, task runner, provider login, Telegram or Drive integration. A future adapter may reuse the pure TypeScript engine or consume the versioned export; reviewing that adapter is a separate scope.

## Adding future versions safely

1. Freeze the complete currently released compiler, normalization, audit, motion/camera catalogs, labels and dated capability evidence before changing them. Retain historical export fixtures and their unchanged original strings.
2. Add only the exact legitimate compiler/snapshot pair and verifier to `EXPORT_PROFILES`; extend schema enums from that registry. Unknown versions/pairs fail safely, not through a permissive semver/date range. Retain the v1 plan contract and retired selectors for validation; a unavailable external model requires an explicit user selection, never a fallback model. Future incompatible schema changes need an explicit, separately tested migration, not normalization.
3. Verify old prompts/findings against their historical profile; compile a separate current prompt and require equality of the original/current Motion Plan. Lossy intent migration fails with an actionable error. Unit tests simulate a later capability date to verify independent historical/current handling and rejection of mixed pairs.
4. Keep original prompt text/compiler/date/timestamp and raw export unchanged. A newly exported plan gets current prompt/compiler/date/findings and a new export timestamp. This app stores original imports only in session memory with an exact download action, never mixed into new exports or automatically persisted.
5. Rerun tampering, key-order/ordered-array, canonical-date, historical-fixture and current-fixture tests. Historical consistency validation is not a cryptographic authorship signature; a different fully self-consistent export is a new configuration requiring review.

Custom presets already store versioned plans rather than compiled English or capability snapshots; compiler 1.1.0 needs no preset rewrite. Their v1 schema, limits, atomic writes, unreadable-data backup and opt-in recovery remain unchanged. Loading a preset regenerates current prompts and findings.
