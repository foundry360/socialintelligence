# Security

## Threat assumptions

- Tenant documents may be confidential.
- External signals/docs may contain prompt injection.
- Multi-tenant data leakage is unacceptable.

## Controls

### Authentication

Supabase Auth (email/password MVP). Session validated on server for API routes.

### Authorization

Role-based membership per tenant. Check role before mutations (knowledge write, approve, admin).

### Tenant isolation

- `tenant_id` on rows
- Supabase RLS
- Intelligence/DB helpers require explicit `tenantId` (no global “current company” singleton without session binding)

### Secrets

- Never expose LLM or service keys to the client
- `.env*` gitignored
- Vercel/Supabase secret stores in deployed envs

### Audit

Log: login-sensitive admin actions, knowledge ingest, approvals, provider calls (metadata only).

### Untrusted content / prompt injection

1. Separate system, tenant knowledge, external, and user channels in prompt assembly.
2. Wrap external content in delimiters; instruct the model that delimited content is data.
3. Prefer structured outputs; validate schemas.
4. Do not allow external content to set tool/policy instructions.
5. Sanitize/limit size of signal bodies sent to models.

### Document ingestion (later)

MIME allowlists, size limits, private storage buckets, optional malware scanning, sensitivity tags.

## Incident posture

Rotate keys on suspicion of leak; revoke memberships; review audit logs for cross-tenant query anomalies.
