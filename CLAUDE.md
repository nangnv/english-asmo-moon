# Claude Code: ASMO Quest

Read and follow `AGENTS.md`, `CONTRIBUTING.md`, and `docs/PROJECT_STATUS.md` before working.

## Start here

```sh
npm test
npm run build
npm run validate
npm run dev
```

No dependencies need installation for the current JavaScript app. Open http://127.0.0.1:4173. Without `.env.local`, the existing question bank works; AI requests report missing configuration.

Use a `claude/<topic>` branch in your own clone/worktree. Coordinate task ownership with Codex before editing shared areas, especially `src/app.js`, `src/core.js`, and `src/server.js`.

## Next product priorities

1. Independent student login, preferably direct Google login, without requiring a ChatGPT account.
2. Persist learner progress per account and allow parent access with explicit authorization.
3. Improve the practice bank and fair measurement of new-question performance.

Google login and Supabase were discussed, but neither is implemented or provisioned. Do not claim they work. The existing private Sites gate still requires ChatGPT sign-in. Read the authentication notes in `docs/PROJECT_STATUS.md` before proposing hosting changes.

Keep API secrets server-side. Regenerate `worker/index.js` from source and run the checks before handing work back.
