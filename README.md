# NO ESCAPE

A responsive, browser-first fitness app for beginners and home-workout athletes. NO ESCAPE tracks real squat and push-up movement with a webcam, counts completed pose cycles, gives visibility-aware form cues, and keeps workout plans, history, and preferences in a private account.

## What’s included

- **Open access — no login or signup.** Each browser automatically gets a private anonymous workspace, identified by a random HttpOnly session cookie (only its SHA-256 digest is stored). No email or password is collected.
- Protected, account-scoped API routes for plans, routines, sessions, profile, and preferences.
- PostgreSQL persistence using Drizzle ORM. A new workspace starts with labeled sample plans and routines only — workout history contains real, user-started sessions exclusively.
- Browser-local MediaPipe Pose Landmarker tracking for 7 exercises — squats, push-ups, lunges, jumping jacks, high knees, mountain climbers (rep counters) and plank (timed hold) — each with a demo image, steps and camera setup tips, joint-angle tracking, landmark-visibility checks, form feedback, and a hysteretic full-cycle rep counter with cooldown.
- A dark, responsive dashboard; plan/routine CRUD; camera and manual session history; progress analytics; and profile settings.
- An MIT-licensed open-source project with contribution, community conduct, and security-reporting guidance.
- Goals (total reps/seconds or number of workouts, per exercise or any) with progress bars and a confetti celebration when reached — achievement is verified server-side against real sessions. Reaching the weekly workout goal also triggers a celebration.
- No demo workout history: only sessions you actually record (camera or manual) appear in history, stats and goals.

## Open source

NO ESCAPE is released under the [MIT License](LICENSE). Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md), the [Code of Conduct](CODE_OF_CONDUCT.md), and [Security Policy](SECURITY.md) before participating. The full application source, tests, database schema, and self-hosting instructions are included in this repository.

## Stack note

This project uses the platform-provided **Next.js App Router / Node.js route handlers / PostgreSQL / Drizzle ORM** stack. The API backend runs on the Node.js Next server; it is not a separate Express process, and persistence is PostgreSQL rather than MongoDB. This keeps the app compatible with the supplied runtime and database configuration.

## Requirements

- Node.js 22 (or a compatible current Node release).
- PostgreSQL 14+.
- A browser with `getUserMedia`, WebAssembly, and WebGL/GPU or CPU fallback support for camera workouts.
- HTTPS for camera access in deployed environments. `localhost` is also treated as a secure context by modern browsers.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create an environment file from the template and point it at PostgreSQL:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL` to a PostgreSQL connection string. Do not commit a real credential.
3. Create/update the tables with Drizzle:
   ```bash
   npx drizzle-kit push
   ```
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`. The dashboard opens immediately; a private workspace with clearly labeled sample starter data is created on first visit.

The application and Drizzle Kit both read `DATABASE_URL`. The application does not require an external AI API key or a server-side camera service.

## Tests and validation

Run the focused unit tests with Node’s built-in test runner:

```bash
node --experimental-strip-types --test tests/*.test.mjs
```

The tests exercise real pose-counter transitions (full-cycle squat/push-up counting, visibility dropouts, shallow/incomplete movement, and jitter cooldown) and API input schemas (bounded workout fields and rejection of caller-supplied sample flags).

Also run the app checks before deployment:

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

## Camera and data privacy

- The camera is requested only after the user presses **Enable camera & start**. Audio is not requested.
- The video stream is passed directly to MediaPipe inside the browser. Frames are not posted to NO ESCAPE or the model/WASM hosts, and no video or image is persisted.
- MediaPipe’s JavaScript/WASM runtime and pose model are fetched by the browser from the version-pinned jsDelivr package and Google’s public model host. These hosts receive normal asset requests, not camera frames.
- If the user chooses to save a completed set, the server receives only the exercise summary (reps, duration, optional measured form score, and source). Manual logs are labeled separately and are never described as AI or camera measurements.
- Pose scores are geometry-based workout guidance, not medical advice or a diagnosis. Results depend on lighting, camera placement, and landmark visibility. Users should stop if they feel pain or dizziness.

## Security notes

- There are no accounts. Workspaces are isolated by a random 32-byte token in an HttpOnly, SameSite=Lax cookie (Secure in production); the database stores only its digest. Clearing cookies starts a new workspace, and old data is no longer reachable from that browser.
- Mutating routes apply a same-origin check. Zod schemas bound user input, reject unknown keys where appropriate, and server queries include the authenticated user ID for ownership checks.
- Because workspaces are created automatically, put a reverse proxy or API gateway rate limit in front of public deployments and periodically purge stale workspaces (`auth_sessions.expires_at`).
- The browser sends the measured workout summary after the user elects to save; as with other browser-submitted telemetry, the server cannot cryptographically attest that an untrusted client used a physical camera. The product UI never fabricates or simulates live readings.

## API overview

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/overview` | `GET` | Create (if needed) and return the browser workspace’s data |
| `/api/plans`, `/api/plans/:id` | `GET`, `POST`, `PATCH`, `DELETE` | Workout plan CRUD |
| `/api/routines`, `/api/routines/:id` | `GET`, `POST`, `PATCH`, `DELETE` | Exercise routine CRUD |
| `/api/sessions`, `/api/sessions/:id` | `GET`, `POST`, `PATCH`, `DELETE` | Camera/manual session history CRUD |
| `/api/goals`, `/api/goals/:id` | `GET`, `POST`, `PATCH`, `DELETE` | Goals CRUD and verified achievement |
| `/api/preferences` | `GET`, `PUT` | Weekly goal, units, and camera tips |
| `/api/profile` | `PATCH` | Update display name |
| `/api/health` | `GET` | PostgreSQL health check |

## Database schema

Tables are defined in `src/db/schema.ts`: `users`, `auth_sessions`, `user_preferences`, `workout_plans`, `exercise_routines`, `workout_sessions`, and `goals`. User-owned records cascade on account deletion. Workout plan/routine references on sessions are nullable and use `ON DELETE SET NULL` so history survives removal of a plan or routine.

`drizzle.config.ts` loads `DATABASE_URL` from the environment. For production, apply schema changes as a controlled release step and keep database credentials in the hosting provider’s secret manager.

## Deployment

1. Provision PostgreSQL and configure `DATABASE_URL` as a server-side secret. Never prefix it with `NEXT_PUBLIC_`.
2. Install dependencies and apply the schema:
   ```bash
   npm ci
   npx drizzle-kit push
   ```
3. Build and run with the Node.js Next server:
   ```bash
   npm run build
   npm run start
   ```
4. Serve over HTTPS, allow camera access for the deployed origin, and test camera permission/model loading in the target browsers.
5. Configure trusted proxy headers and a proxy-level rate limit on workspace creation when running multiple instances. Restrict database network access to the app service.

The app exposes `/api/health` for a database readiness check. Do not use an edge-only runtime for the protected API routes; database operations use Node.js APIs.
