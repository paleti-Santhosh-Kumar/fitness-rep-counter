# Security policy

## Supported versions

Security fixes are applied to the current default branch. Deployments should use current supported Node.js and PostgreSQL releases and keep dependencies patched.

## Reporting a vulnerability

Please do not disclose a suspected vulnerability in a public issue. If the repository host supports private vulnerability reporting or security advisories, use that private channel and include:

- the affected version or commit;
- the endpoint, configuration, or component involved;
- concise reproduction steps and impact;
- any mitigation you have already identified.

If private reporting is not enabled yet, contact the repository maintainers through the private contact method provided by the hosting organization. The repository owner should enable private vulnerability reporting before advertising a public deployment.

Please allow maintainers reasonable time to investigate and coordinate a fix before public disclosure. Do not send real passwords, session cookies, personal health information, or webcam footage as proof of concept.

## Operational guidance

Use HTTPS, keep `DATABASE_URL` in a server-side secret store, restrict database network access, and configure a shared rate limiter and trusted proxy headers for multi-instance deployments. The built-in in-memory auth limiter is not a distributed rate-limiting system. See the security and deployment notes in [README.md](README.md).
