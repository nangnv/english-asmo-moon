# Working on ASMO Quest

Read `README.md`, `docs/PROJECT_STATUS.md`, and `CONTRIBUTING.md` before changing code. These instructions apply to Codex, Claude Code, and other coding tools.

## Product

- Vietnamese-speaking Grade 6 learner preparing for ASMO English National Round on 2026-11-22.
- Use Asia/Ho_Chi_Minh calendar dates. Keep the exam date editable.
- Encourage effort and understanding; avoid pressure, peer rankings, or guaranteed exam results.
- Distinguish first-exposure performance from repeated practice, assisted answers, and XP.
- Label family-provided practice PDFs and AI-written questions accurately; do not call them official papers without evidence.

## Current architecture

- Dependency-free ESM app; Node.js 22+ for local work.
- `src/index.html`, `src/style.css`, `src/app.js`: browser UI.
- `src/core.js`: learning state, selection, scoring, rewards, backup validation.
- `src/server.js`: Worker API and OpenAI requests.
- `src/bank.json`: question bank, source references, explanations.
- `scripts/bundle.mjs` generates `worker/index.js`. Edit source files, then regenerate; do not hand-edit the generated Worker.
- `.openai/hosting.example.json` is a build-only template without a Site identity. The existing live Site uses an ignored `.openai/hosting.json` configured by its owner. Do not create or relink a Site when working on this repository without user authorization.

## Checks

Run `npm test`, `npm run build`, and `npm run validate` after relevant changes. No npm install is needed for the current app. Add focused tests for scoring, authentication, persisted data, or API changes. Never call paid APIs from CI. For UI changes, check desktop/mobile and keyboard operation when browser tooling is available; state any verification limits.

## Secrets and learner data

- Never read aloud, print, commit, or put API keys in browser code, screenshots, logs, issues, or PRs.
- Local secrets belong in ignored `.env.local`; `.env.example` documents names only.
- Production secrets belong in the hosting service's secret storage.
- No real learner progress, chat transcripts, names, or account credentials in fixtures or commits.
- The current API gate trusts Sites identity headers only behind Sites. Do not reuse this gate on another host: validate the new provider's sessions/tokens server-side.
- Do not remove the current private access gate before replacement authentication and authorization have been implemented and verified.

## Collaboration

- One task per branch: `codex/<topic>` or `claude/<topic>`.
- Use separate clones or Git worktrees for concurrent work. Two agents must not edit the same working directory concurrently.
- Check `git status` before edits. Preserve others' uncommitted changes; do not reset or force-push shared history.
- Pull requests describe the user-visible behavior, files involved, checks run, and remaining limits.
- Update `docs/PROJECT_STATUS.md` when a feature's actual status changes. Discussion or scaffolding is not completion.
- Do not deploy, change sharing, or create paid services merely because a branch is ready; follow the user's authorization for the current task.
