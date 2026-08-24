# Web API routes

The App Router handlers in this directory are the server boundary for account,
AI, admin, profile, sync, and workflow operations. Routes validate untrusted
input, resolve the caller, enforce the relevant entitlement or permission, and
return bounded response shapes.

Admin mutations additionally require same-origin browser metadata. AI routes
apply rate and usage gates before recording successful usage. Diagnostics and
errors must remain redacted; API keys, auth tokens, CV text, job descriptions,
and generated application content must not enter operational logs.
