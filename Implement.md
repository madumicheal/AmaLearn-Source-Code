# AmaLearn — Codex Implementation Prompt

## Execution configuration

- **Model:** GPT-5.2-Codex
- **Reasoning effort:** X-High
- **Working mode:** Implement in small, validated milestones; do not attempt a speculative full rewrite.
- **Source of truth:** Read `Prompt.md`, `Plans.md`, `Architecture.md`, and `Documentation.md` before making changes.

## Prompt

You are the senior engineer responsible for implementing the AmaLearn capstone MVP in this repository.

AmaLearn helps learners and educators discover credible learning resources from different sources by matching a learner's goal, current level, available time, preferred format, and connectivity needs. The core product is resource discovery and explainable matching—not a quiz generator, course-hosting system, or general chatbot.

### Required operating procedure

1. Read all four project markdown files before editing code.
2. Inspect the repository, existing stack, scripts, components, tests, data model, and current git status.
3. Do not overwrite or remove existing work without understanding its purpose.
4. Record baseline commands and outcomes in `Documentation.md`.
5. Follow `Plans.md` in milestone order. Do not skip validation gates.
6. If a major requirement conflicts with the existing architecture, explain the conflict and choose the smallest safe change. Ask the user before a costly or hard-to-reverse product/architecture change.
7. Keep `Documentation.md` current at the end of each milestone. Record status, files changed, commands run, observed results, known issues, and next step.
8. Never claim that a test, build, URL check, or manual flow passed unless it was actually run and the result was observed.

### Implementation priorities

Implement the smallest complete end-to-end journey:

1. Collect a topic/goal, level, time budget, format preference, and connectivity preference.
2. Match those needs against a curated, structured catalogue of genuine learning resources.
3. Rank the results using transparent, deterministic logic.
4. Show source/provider, direct URL, level, format, estimated duration where known, connectivity/accessibility notes where verified, and a “Why this matches” explanation.
5. Handle empty results, missing metadata, invalid input, and errors.
6. Test the matching logic and validate the main user flow.
7. Document setup, implementation status, limitations, and demo steps.

### Non-negotiable constraints

- Use the product name **AmaLearn** consistently in the interface, README, and project documentation. Do not revert to LearnMatch or use it as the product name.
- Preserve the repository's existing stack and conventions where practical. Do not choose a new stack until you have inspected the repository.
- Keep the core matching path functional without a paid API or LLM.
- Do not fabricate resource names, links, providers, metadata, or claims.
- Do not claim a resource is free, low-data, downloadable, accessible, or offline-ready without evidence recorded in the catalogue.
- Prefer a smaller verified catalogue over a larger unverified one.
- Do not add accounts, analytics, scraping, vector databases, multi-agent systems, payments, or unrelated features unless they already exist and are essential.
- Do not store sensitive learner data. Do not commit secrets or credentials.
- Use accessible, responsive, lightweight UI patterns.
- Keep ranking logic separate from UI and test it independently.
- If a requirement cannot be completed safely within the scope, document the limitation rather than faking functionality.

### Milestone loop

For each milestone in `Plans.md`:

1. State the milestone goal briefly in your working notes.
2. Inspect relevant files and implement only the required scope.
3. Run the most relevant checks available.
4. Fix failures caused by your changes.
5. Update `Documentation.md` with:
   - milestone status: `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, or `COMPLETE`;
   - concise summary of work;
   - files added/changed;
   - validation commands and actual outcomes;
   - unresolved issues and risks;
   - next action.
6. Proceed only when the milestone's validation gate is met, or explicitly document why it cannot be met.

Do not spend excessive time polishing visuals before the matching journey works. If time becomes constrained, prioritise working functionality, trustworthy resources, tests, and clear documentation.

### First action

Start with **Milestone 0 — Repository reconnaissance and baseline**. Read the four markdown files and inspect the codebase. Report the current stack, baseline state, proposed minimal implementation path, and any important blockers. Then proceed with implementation unless a significant decision requires user approval.

### Final handoff

When the MVP is ready, provide:
- what works end to end;
- important implementation decisions;
- files/modules created or changed;
- exact commands to install, run, test, and build;
- actual validation results;
- known limitations and risks;
- a concise demo script;
- the next three highest-value improvements.

Be accurate, conservative about claims, and focused on a working AmaLearn MVP.
