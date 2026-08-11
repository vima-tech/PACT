# Vima Starter Adapter

<!-- @pact R002,R006,R010 -->

Status: `blocked` (`full-stack-spec.v1-draft`).

This descriptor reserves the boundary between a PACT business-system specification
and the Vima Starter host. It does not implement full-stack generation yet.

Promotion to `ready` requires all of the following, backed by automated checks:

- a versioned FullStackSpec and deterministic Starter artifact plan;
- backend business permission enforcement;
- production secret and database migration hardening;
- a backend test baseline and generated contract tests.

Until those conditions are met, the capability router may list this adapter as a
candidate but must never select it for generation.
