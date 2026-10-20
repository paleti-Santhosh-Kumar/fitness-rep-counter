# Contributing to NO ESCAPE

Thanks for helping improve NO ESCAPE. Contributions should keep the app approachable for beginners, protect user privacy, and never represent sample or simulated values as live workout measurements.

## Before you start

- Read the project setup and architecture in [README.md](README.md).
- For significant changes, open an issue or discussion in the repository where this project is hosted before investing in a large implementation.
- Keep changes focused. Explain user-visible behavior and any schema, security, or privacy implications.

## Development workflow

1. Use Node.js 22 or a compatible current Node release and a local PostgreSQL database.
2. Copy `.env.example` to `.env`, configure `DATABASE_URL`, then run `npm install` and `npx drizzle-kit push`.
3. Start the application with `npm run dev`.
4. Add or update unit tests for changed pose, validation, or analytics logic.
5. Before opening a pull request, run:
   ```bash
   node --experimental-strip-types --test tests/*.test.mjs
   npx next typegen
   npm exec tsc -- --noEmit --pretty false
   npm run lint
   npm run build
   ```

## Pull requests

- Describe the problem, the solution, and how it was tested.
- Include screenshots or a short screen recording for visual changes; do not include real workout video or personal account data.
- Keep camera capture opt-in and browser-local. Do not add video/frame upload, background camera activation, or fabricated live pose values.
- Keep illustrative starter data clearly labeled and excluded from actual progress totals.
- Use Drizzle and owner-scoped queries for persisted resources. Never commit credentials, personal data, or generated build artifacts.
- Mention required environment variables or database changes. Update `README.md` when setup, API, security, or deployment behavior changes.

## License

By submitting a contribution, you agree that it may be distributed under the project's MIT License. You retain ownership of your contribution.
