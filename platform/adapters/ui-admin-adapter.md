# UI Admin Adapter

<!-- @pact R002,R006,R010 -->

Status: `ready` for `app-spec.v1` UI artifact planning.

The adapter consumes a PACT specification plus UI Admin's structured AppSpec
builder contract. It produces standalone Vue admin UI plans. Business entities,
backend APIs, persistence, authorization and data adapters remain outside this
adapter and must not be inferred.
