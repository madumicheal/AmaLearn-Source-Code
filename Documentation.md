# AmaLearn — Implementation Documentation

> **Purpose:** Live status log for Codex. Update this file after every milestone and meaningful validation run. Do not mark work complete without observed evidence.

## Project status

- **Product:** AmaLearn
- **Current milestone:** Milestone 6 — Realtime search API scaffold
- **Overall status:** COMPLETE
- **Last updated:** 2026-10-11
- **Current blocker:** None recorded
- **Demo-ready:** Yes
- **Private deployment:** https://amalearn.docilejelly2.chatgpt.site
- **Latest audit:** `AUDIT_AND_ROADMAP.md`
- **Realtime search:** `/api/search` implemented; provider key configuration pending

## Milestone tracker

| Milestone | Status | Evidence / notes |
|---|---|---|
| 0. Repository reconnaissance and baseline | COMPLETE | Empty Git repository confirmed; React + Vite selected per user preference |
| 1. Data model and credible resource catalogue | COMPLETE | 24 curated resources in `src/data/resources.js`; schema validation covered by tests |
| 2. Explainable matching engine | COMPLETE | Deterministic matcher and suggested study path in `src/lib/matcher.js`; tests pass |
| 3. Learner-facing experience | COMPLETE | React form, suggested path, results cards, empty state, validation, responsive CSS |
| 4. Integration and quality assurance | COMPLETE | `npm test` and `npm run build` pass; JSDOM UI smoke tests and browser review completed |
| 5. Handoff and capstone demo | COMPLETE | README and this documentation updated; local dev server running; private Sites deployment succeeded |
| 6. Realtime search API scaffold | COMPLETE | `POST /api/search` added with provider adapters, Worker routing, UI integration, and tests |

## Repository baseline

- **Framework / language:** React + Vite, JavaScript modules
- **Package manager / runtime:** Node v24.15.0, npm 11.12.1
- **Existing app entry point:** `index.html` loads `src/main.jsx`
- **Existing test commands:** `npm test`
- **Existing build/lint/type-check commands:** `npm run build`
- **Git working-tree status:** New files are uncommitted; branch `main` has no commits
- **Baseline command results:** Recorded below

## Product scope checklist

### Core workflow
- [x] Learner can enter a goal/topic.
- [x] Learner can select current level.
- [x] Learner can select available study time.
- [x] Learner can select preferred format.
- [x] Learner can select connectivity preference.
- [x] AmaLearn returns ranked resources.
- [x] Each result identifies the provider/source and has a direct link.
- [x] Each result explains why it matches using real metadata.
- [x] Empty/no-close-match state is useful.
- [x] A suggested learning sequence is included only if it is grounded and feasible.

### Quality and trust
- [x] Resource catalogue is structured and easy to maintain.
- [x] Resource URLs and provider labels have been checked to the extent possible.
- [x] Unverified metadata is left unknown, not guessed.
- [x] Matching logic has automated tests.
- [x] Main user flow has been smoke-tested.
- [x] Mobile and desktop layouts checked at implementation level; browser smoke used a local preview.
- [x] Keyboard navigation, labels, focus, and contrast checked at implementation level.
- [x] No unnecessary personal data is collected or persisted.
- [x] No secrets or API keys are committed.
- [x] Setup/run/test instructions are documented.
- [x] Realtime search route exists server-side.
- [x] Realtime results are visually separated from curated catalogue results.
- [x] Search provider secrets are read server-side only.

## Decisions and rationale

Record material decisions here. Include alternatives considered and why the selected option best fits the repository and 48-hour MVP.

| Date | Decision | Rationale | Impact |
|---|---|---|---|
| 2026-10-11 | Use React + Vite for the empty repository | User explicitly preferred React/Next/Vite; Vite keeps the MVP lightweight and fast to scaffold while preserving a clean React component model | Creates a small client-side app with local catalogue data and deterministic matching |
| 2026-10-11 | Add realtime search behind `POST /api/search` instead of calling search APIs from the browser | Keeps provider keys server-side and lets AmaLearn normalize, label, and review realtime resources before presenting them as recommendations | Enables any-subject discovery while preserving the trust boundary between curated and unreviewed results |

## Milestone log

### Milestone 0 — Repository reconnaissance and baseline

**Status:** COMPLETE

**Work completed:**  
- Read `Prompt.md`, `Plans.md`, `Architecture.md`, `Documentation.md`, and `Implement.md`.
- Inspected repository structure, Git status, branch, history, remotes, Node, and npm versions.
- Confirmed the repository is empty apart from `.git`.
- Selected React + Vite as the implementation stack after the user's go-ahead.

**Files added/changed:**  
- Copied project planning documents into the repository.
- Updated `Documentation.md` with baseline findings.

**Validation performed:**  
- `find /Users/user/Desktop/AmaLearn_Codex_Workplan -maxdepth 2 -type f | sort`
- `git status --short`
- `ls -la`
- `git branch --show-current`
- `git log --oneline --decorate -5`
- `git remote -v`
- `find . -maxdepth 3 -not -path './.git/*' -print | sort`
- `node --version`
- `npm --version`

**Observed results:**  
- Workplan contains five markdown files: `Architecture.md`, `Documentation.md`, `Implement.md`, `Plans.md`, and `Prompt.md`.
- Git branch is `main`.
- `git log` reports no commits yet.
- No remotes configured.
- Repository contains no app files before scaffolding.
- Node is `v24.15.0`; npm is `11.12.1`.

**Issues / risks:**  
- No existing stack or reusable design system exists, so the MVP must be scaffolded from scratch.
- Dependency installation was required for the selected stack and completed later in Milestone 4.

**Next action:**  
- Continue maintaining the scaffolded React + Vite app with small, validated changes.

### Milestone 1 — Data model and credible resource catalogue

**Status:** COMPLETE

**Work completed:**  
- Added a structured local catalogue in `src/data/resources.js`.
- Added `src/lib/validateResources.js` to check required fields, URL protocol, IDs, topics, levels, formats, duration values, and conservative availability fields.
- Catalogue contains 24 resource records across web development, programming, Python, computer science, algebra, statistics, machine learning, digital marketing, analytics, business, digital skills, Nigeria digital literacy, African reading resources, open education, and offline-first learning.
- Unknown metadata is represented as `Unknown`/`unknown` rather than inferred.

**Catalogue size and validation:**  
- 24 resources.
- Validation is covered by `npm test`; all catalogue records currently pass schema checks.

**Validation performed / results:**  
- `npm test` passed with 10 tests, including catalogue validation.

**Issues / risks:**  
- Resource metadata remains deliberately conservative. Many duration, accessibility, low-data, and downloadability fields are unknown where not safely verified.
- This starter catalogue is not exhaustive and does not search the live web.

**Next action:**  
- Expand the catalogue only with verified metadata and direct source URLs.

### Milestone 2 — Explainable matching engine

**Status:** COMPLETE

**Work completed:**  
- Added deterministic ranking in `src/lib/matcher.js`.
- Matching considers topic relevance, level fit, format preference, available time, and connectivity preference.
- The matcher returns ranked resources with structured reasons grounded in resource metadata and selected preferences.
- Added a suggested study path generator that uses only the top-ranked recommendations.
- Tightened matching so unrelated resources cannot appear based only on level, format, time, or connectivity preferences.
- Added unit tests in `test/matcher.test.js`.

**Validation performed / results:**  
- `npm test` passed with checks for deterministic output, topic ranking, format ranking, low-data/downloadable preference, empty catalogue behavior, no-close-match behavior, study-path grounding, and catalogue validation.

**Issues / risks:**  
- Topic matching is intentionally simple keyword/tag matching, not semantic search.
- Time fit is limited when catalogue duration is unknown.

**Next action:**  
- Improve synonyms and tag coverage as the catalogue grows.

### Milestone 3 — Learner-facing experience

**Status:** COMPLETE

**Work completed:**  
- Built the React app in `src/main.jsx`.
- Refactored the app into importable `src/App.jsx` plus a small browser bootstrap in `src/main.jsx`.
- Added labelled form controls for goal, level, available time, preferred format, and connectivity.
- Added recommendation cards with provider, direct URL, level, format, duration, connectivity/download status, accessibility notes, and match reasons.
- Added a compact suggested path section above recommendations.
- Added initial empty state, invalid-goal validation, reset action, and responsive CSS in `src/styles.css`.
- Used AmaLearn consistently in the interface and README.

**Validation performed / results:**  
- `npm run build` passed.
- Local browser preview rendered the form, initial empty state, 24-resource catalogue count, suggested path, and recommendation cards after a keyboard-submitted profile.

**Issues / risks:**  
- Browser automation pointer-clicks behaved inconsistently in the in-app browser; keyboard submission was observed working. The app uses a normal form and submit button for real browser use.
- JSDOM UI smoke tests now cover form submission and validation.

**Next action:**  
- Add a full browser E2E test later if the capstone requires live-browser automation.

### Milestone 4 — Integration and quality assurance

**Status:** COMPLETE

**Work completed:**  
- Installed dependencies with `npm install`.
- Added `.gitignore` for generated folders.
- Ran automated tests and production build.
- Started local Vite server at `http://127.0.0.1:5173/`.
- Performed a browser smoke check: entering `learn Python basics` and submitting with Enter rendered 6 recommendation cards; first visible title was `Python`.

**Validation performed / results:**  
- `npm install` completed: 64 packages added, 0 vulnerabilities reported.
- `npm test` passed: 10 tests, 0 failures.
- `npm run build` passed: Vite production build completed.
- `npm run dev -- --port 5173` is running locally.

**Issues / risks:**  
- Full visual regression, screen-reader, and external-link click-through checks are not automated.
- Private deployed app review reached the expected ChatGPT login gate; local preview was used for functional review.
- Source URLs are stored directly in the catalogue; future catalogue edits should continue to validate URLs and avoid unsupported claims.

**Next action:**  
- Rehearse the capstone demo and optionally add E2E tests.

### Milestone 5 — Handoff and capstone demo

**Status:** COMPLETE

**Work completed:**  
- Added `README.md` with setup, validation, MVP scope, and limitations.
- Updated this documentation with baseline, implementation status, validation evidence, and known risks.
- Left the local development server running for preview.

**Validation performed / results:**  
- `npm test` and `npm run build` passed after the final form-submission fix.
- Local preview is available at `http://127.0.0.1:5173/`.
- Private Sites deployment succeeded at `https://amalearn.docilejelly2.chatgpt.site`.

**Known limitations:**  
- Starter catalogue only; not exhaustive web search.
- No accounts, persistence, analytics, paid APIs, or LLM explanation.
- Metadata remains conservative where duration, accessibility, low-data status, or downloadability could not be confidently represented.

**Demo script:**  
1. Start AmaLearn using the documented command.
2. Enter `learn Python basics`.
3. Keep Beginner and Any format, or change format/connectivity to show ranking changes.
4. Submit the form.
5. Review the ranked resources, provider/source links, metadata, and “Why this matches” explanations.
6. Try `algebra equations` or `statistics data` to demonstrate topic-specific results.
7. Submit an empty goal to show validation.

**Next action:**  
- Commit or publish when ready.

### Milestone 6 — Realtime search API scaffold

**Status:** COMPLETE

**Work completed:**  
- Added `src/server/search.js` with `POST /api/search`, input validation, provider selection, and result normalization.
- Added provider adapters for Brave Search API, Tavily Search API, and Google Custom Search JSON API.
- Added Vite dev middleware so local development can exercise `/api/search`.
- Added a Worker build step that serves both static assets and `/api/search` from production.
- Updated the learner UI with a realtime search panel, separate realtime result section, and `Curated` / `Realtime - needs review` labels.
- Added tests for missing provider configuration, short-query validation, realtime normalization, and UI setup messaging.
- Updated `README.md` and `AUDIT_AND_ROADMAP.md` to describe the implemented API layer and remaining provider configuration step.

**Validation performed / results:**  
- `npm test` passed: 14 tests, 0 failures.
- `npm run build` passed: Vite build plus Worker packaging completed.
- Direct Worker check returned `503 Search provider not configured` for `/api/search` without keys and `200 text/html; charset=utf-8` for `/`.
- Local dev server `/api/search` check returned `503 Search provider not configured`, confirming middleware routing is active.

**Known limitations:**  
- No realtime results will appear until one provider key is configured in the server environment.
- Realtime results are intentionally marked as needing review and should not be promoted into the curated catalogue automatically.
- Rate limiting, domain quality rules, and near-duplicate detection are still backlog items.

**Next action:**  
- Configure one search provider key, then add rate limiting and provider quality scoring before broader use.

## Test and command log

Append actual commands and results. Do not write “passed” unless the command ran and passed.

| Date/time | Command or check | Result | Notes |
|---|---|---|---|
| 2026-10-11 20:13 WAT | `node --version` | OBSERVED | `v24.15.0` |
| 2026-10-11 20:13 WAT | `npm --version` | OBSERVED | `11.12.1` |
| 2026-10-11 20:13 WAT | `git status --short` | OBSERVED | No output before project files were added |
| 2026-10-11 20:13 WAT | `git log --oneline --decorate -5` | OBSERVED | Failed with `fatal: your current branch 'main' does not have any commits yet`; expected for empty repo |
| 2026-10-11 20:16 WAT | `npm install` | PASSED | Required escalated network access; 64 packages added, 0 vulnerabilities |
| 2026-10-11 20:17 WAT | `npm test` | FAILED THEN FIXED | Initial format-ranking test was too broad; updated to a clearer web-development preference case |
| 2026-10-11 20:18 WAT | `npm test` | PASSED | 6 tests passed |
| 2026-10-11 20:18 WAT | `npm run build` | PASSED | Vite production build completed |
| 2026-10-11 20:19 WAT | `npm run dev -- --port 5173` | PASSED | Local server running at `http://127.0.0.1:5173/`; required escalated port permission after sandbox EPERM |
| 2026-10-11 20:20 WAT | Browser smoke check | OBSERVED | Initial render showed labelled form, empty state, and 20-resource catalogue count at that time |
| 2026-10-11 20:22 WAT | Browser smoke check | OBSERVED | Keyboard-submitted `learn Python basics` rendered 6 cards; first visible title was `Python` |
| 2026-10-11 20:47 WAT | Sites deployment | PASSED | Private production URL: `https://amalearn.docilejelly2.chatgpt.site`; deployed version `appgprj_6acbe6552f04819195e479d28fbf3e01~appgver_5879e97a816481919556d9c4d1341ce2` |
| 2026-10-11 21:08 WAT | `npm test` | PASSED | 10 tests passed, including JSDOM UI smoke tests |
| 2026-10-11 21:08 WAT | `npm run build` | PASSED | Vite production build completed after catalogue, matcher, UI, and test updates |
| 2026-10-11 21:09 WAT | Browser review | OBSERVED | Private deployment reached expected ChatGPT login gate; local preview verified 24 resources, suggested path, Python recommendations, and Nigeria digital literacy recommendations |
| 2026-10-11 21:22 WAT | MVP audit | COMPLETE | Added `AUDIT_AND_ROADMAP.md` covering resource quality, matching, accessibility, usability, capstone positioning, and realtime search architecture |
| 2026-10-11 21:23 WAT | `npm test` | PASSED | 10 tests passed after accessibility/metadata UI updates |
| 2026-10-11 21:23 WAT | `npm run build` | PASSED | Vite production build completed after audit improvements |
| 2026-10-11 21:24 WAT | Browser review | OBSERVED | Local preview verified skip link, resource-specific source link labels, language and checked metadata, and DL4ALL-first ranking for `digital literacy Nigeria` |
| 2026-10-11 21:45 WAT | `npm test` | PASSED | 14 tests passed, including realtime search API and UI setup-state tests |
| 2026-10-11 21:45 WAT | `npm run build` | PASSED | Vite production build completed and Worker files were generated in `dist/server` |
| 2026-10-11 21:45 WAT | Direct Worker check | PASSED | `/api/search` returned `503 Search provider not configured` without keys; `/` returned `200 text/html; charset=utf-8` |
| 2026-10-11 21:45 WAT | Local `/api/search` middleware check | PASSED | Running dev server returned `503 Search provider not configured`, confirming the route is wired |
| 2026-10-11 21:47 WAT | `npm test` | PASSED | 14 tests passed after final UI label polish |
| 2026-10-11 21:47 WAT | `npm run build` | PASSED | Vite production build and Worker packaging passed after final UI label polish |

## Known limitations and risks

- Catalogue coverage is intentionally small and curated.
- Metadata is conservative; unknown is shown where unsupported claims would be risky.
- Any AI-assisted explanation, if added, must remain optional and grounded in catalogue metadata.
- Realtime discovery is scaffolded but needs a configured provider key before it can return live web results.
- Browser pointer-click automation was inconsistent in the local in-app browser; keyboard submit, JSDOM UI smoke tests, and build/test validation passed.
- Realtime results are not curated automatically; they should remain labelled as needing review until manually checked.

## Handoff notes

- **Run command:** `npm run dev -- --port 5173`
- **Local preview:** `http://127.0.0.1:5173/`
- **Private deployed URL:** `https://amalearn.docilejelly2.chatgpt.site`
- **Test command:** `npm test`
- **Build command:** `npm run build`
- **Actual test/build results:** `npm test` passed 14/14; `npm run build` passed.
- **Working features:** Learner needs form, deterministic recommendations, source-backed resource cards, grounded suggested path, match explanations, conservative metadata display, validation, reset, responsive layout, local catalogue validation, realtime search API scaffold, Worker API routing, and JSDOM UI smoke validation.
- **Known issues:** No full live-browser E2E framework; catalogue is still starter-sized; private deployment requires ChatGPT login; realtime search needs a configured provider key before it returns live results.
- **Next three improvements:** Configure one provider key; add rate limiting and provider quality scoring; add full browser E2E and accessibility checks.
