# AmaLearn — Implementation Plan

## Delivery target

Build a credible, demonstrable AmaLearn MVP within a 48-hour capstone window. The priority is one reliable end-to-end resource-matching workflow, not feature count.

## Milestone 0 — Repository reconnaissance and baseline

**Goal:** Understand the project before changing it.

### Tasks
- Inspect repository structure, package manifests, framework, scripts, existing UI, data layer, tests, and README.
- Run existing tests/build/lint commands when available.
- Identify any existing design system or reusable components.
- Record the current state and blockers in `Documentation.md`.
- Propose the smallest implementation path compatible with the repository.

### Validation gate
- Existing app can be run, or the exact reason it cannot is documented.
- Existing checks and their baseline outcomes are recorded.
- No code changes are made before the repository and stack are understood.

### Stop/go
Proceed once the implementation path is clear. If the repository is empty, choose a simple, maintainable stack and document the decision before scaffolding.

## Milestone 1 — Data model and credible resource catalogue

**Goal:** Establish a reliable, traceable set of learning resources.

### Tasks
- Define a resource schema with stable IDs and fields described in `Prompt.md`.
- Add an initial curated catalogue; aim for 20–40 resources if this can be done accurately in the time available.
- Verify URLs and source names to the extent possible with available tools.
- Mark uncertain metadata as unknown rather than guessing.
- Separate catalogue data from matching logic and UI.
- Add schema/data validation where practical.

### Validation gate
- Every displayed item has a title, provider, URL, topic/tag, level, format, and duration or an explicit unknown value where appropriate.
- No placeholder or fabricated URLs appear in recommendations.
- Invalid records are caught by validation or tests.

### Stop/go
A smaller accurate catalogue is preferable to a larger unverified one. If the full target is not feasible, document the actual count and prioritise a working end-to-end flow.

## Milestone 2 — Explainable matching engine

**Goal:** Rank resources based on user needs without depending on an external AI service.

### Tasks
- Implement topic relevance, level fit, time fit, format preference, and connectivity preference.
- Make the scoring logic deterministic and easy to test.
- Avoid overly strict filters that leave users with no results when reasonable alternatives exist.
- Return both ranked resources and structured match reasons.
- Add unit tests for expected ranking and edge cases.

### Validation gate
- Matching is stable for identical inputs.
- Changing topic or a major preference can affect ranking appropriately.
- Match explanations are derived from actual metadata and scoring reasons.
- Empty catalogue, unknown preferences, and no-close-match cases are handled safely.

### Stop/go
Do not integrate an LLM until the deterministic path works and is tested. AI is optional, not a blocker for the MVP.

## Milestone 3 — Learner-facing experience

**Goal:** Make the matching engine usable in a clear, responsive interface.

### Tasks
- Build a concise landing/introduction and needs form.
- Add clear labels, keyboard-accessible controls, validation, and useful defaults.
- Show recommendation cards with source, direct link, level, duration, format, connectivity/accessibility notes, and “Why this matches”.
- Add loading/error/empty states as appropriate.
- Add a simple suggested sequence only if it can be grounded in catalogue metadata and completed without compromising the core flow.
- Use AmaLearn consistently in the UI.

### Validation gate
- A new user can submit the form and understand the recommendations without explanation from the developer.
- Links are visibly identifiable and open the intended resource.
- Mobile and desktop layouts are usable.
- Accessibility basics are checked: semantic structure, labels, focus visibility, contrast, and keyboard operation.

## Milestone 4 — Integration and quality assurance

**Goal:** Confirm the MVP works as a whole.

### Tasks
- Run automated tests, lint, type checks, and build scripts available in the project.
- Add or run a key-flow smoke test.
- Test representative profiles: beginner/short time/video/low-data; intermediate/reading/standard internet; broad topic/no close match.
- Check malformed input, missing metadata, empty results, and external-link behaviour.
- Fix critical failures before polishing.

### Validation gate
- All critical checks pass, or any failures are explicitly documented with impact.
- The core end-to-end flow is demonstrated successfully.
- No known critical privacy, security, or broken-navigation issue remains.

## Milestone 5 — Handoff and capstone demo

**Goal:** Make the result easy to run, evaluate, and explain.

### Tasks
- Update `Documentation.md` with status, evidence, test results, known limitations, and next steps.
- Add/update README setup instructions and commands.
- Prepare a short demo path: enter goal → set preferences → inspect ranked matches → open a source.
- Prepare a concise explanation of the problem, approach, differentiator, and limitations.
- Confirm the repository contains no secrets, API keys, or personal learner data.

### Validation gate
- Another developer can follow the setup instructions.
- Demo path works from a clean start as far as the environment allows.
- Documentation distinguishes implemented features from planned ideas.

## Suggested 48-hour time budget

Use this as a prioritisation guide, not a rigid schedule.

| Window | Priority |
|---|---|
| Hours 0–3 | Milestone 0: inspect repository and baseline |
| Hours 3–8 | Milestone 1: schema and verified starter catalogue |
| Hours 8–14 | Milestone 2: matching logic and unit tests |
| Hours 14–26 | Milestone 3: form, results, and responsive UI |
| Hours 26–34 | Milestone 4: integration and QA |
| Hours 34–40 | Fixes, accessibility, catalogue improvements |
| Hours 40–44 | Milestone 5: README and documentation |
| Hours 44–48 | Demo rehearsal and contingency buffer |

## Scope protection rules

1. The end-to-end matching workflow outranks optional features.
2. Do not add authentication, dashboards, scraping, vector search, or paid API dependencies unless already present and essential.
3. If time slips, reduce catalogue breadth or visual polish before sacrificing testability, traceable sources, or the core workflow.
4. Every milestone ends with observed validation and a `Documentation.md` update.
5. Do not report success based on code inspection alone when a command or manual test can be run.
