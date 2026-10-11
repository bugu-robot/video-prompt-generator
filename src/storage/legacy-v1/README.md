# Immutable v1 export verifier

This directory snapshots the exact compiler, normalization, audit, catalogs,
labels and consumer-capability evidence from reviewed HEAD
`8858a181d116668ce9b78938b33d6b0724773411` (compiler 1.0.0,
capability snapshot 2026-10-11). Do not remediate historical behavior here.
It is used only to validate historical exports, never to generate new prompts
or decide current copy gates. In particular its old asymmetric conflict audit
must remain reproducible; the current compiler reaudits migrated plans.

Add a new immutable verifier and allowlisted compiler/snapshot pair before
changing current compiler output or capability-derived findings again. Retain
historical fixtures. This validates internal consistency, not authorship or
cryptographic authenticity. No files or prompts are silently migrated.
