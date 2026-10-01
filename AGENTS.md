# Project Architecture Rules

- Route operational failures through `reportAppError`; keep diagnostic context allowlisted and free of patient, clinical, credential, or token data so support telemetry remains LGPD-safe.
- Persist authenticated failures in `app_error_logs` and queue pre-auth failures locally for upload after sign-in, because logging must never block clinical workflows.