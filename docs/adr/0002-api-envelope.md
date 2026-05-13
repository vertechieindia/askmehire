# ADR 0002 — JSON API envelope for machine clients

- **Status:** Accepted  
- **Date:** 2026-05-12  

## Context

Ad-hoc error shapes across routes complicate client handling, observability, and forward-compatible versioning.

## Decision

Standardize JSON responses as:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "requestId": "uuid"
}
```

Binary exports (`POST /api/resume-docx`) return raw bytes on success; errors use the same JSON envelope with appropriate HTTP status.

## Consequences

- **Positive:** consistent client parsing, correlation IDs always present on JSON routes.
- **Negative:** breaking change for any external client expecting bare `ResumeGenerationResult` JSON (mitigated by updating first-party UI).
