# AmaLearn — Product Prompt, Goals, Requirements & Deliverables

## 1. Product overview

**Product name:** AmaLearn

**Working tagline:** Find the right resources. Learn with direction.

AmaLearn is a lightweight learning-resource discovery and matching platform. It helps learners and educators find relevant, credible learning materials from different sources based on a learner's goal, current level, available time, preferred format, and connectivity constraints.

AmaLearn is not primarily a quiz builder or a course-hosting platform. Its core value is helping people identify *which existing resource is a good fit, and why*.

## 2. Problem statement

Useful learning materials are scattered across the internet and can be difficult to evaluate. Learners may waste time choosing content that is too easy, too advanced, too long, inaccessible, expensive, or unsuitable for their learning goal. Teachers and tutors face a similar challenge when finding suitable materials for different learners.

AmaLearn reduces this discovery burden by matching learner needs to a small, curated catalogue of traceable resources and explaining each recommendation.

## 3. Target users

The MVP should serve:
- **Learners** who want to learn a skill or topic and need a suitable starting point.
- **Teachers and tutors** who need to discover resources suitable for a learner or lesson.

Keep the first experience simple enough for a learner using a basic device and an inconsistent or limited internet connection.

## 4. MVP goal

Build one end-to-end, demonstrable workflow:

1. A user enters a learning goal/topic.
2. The user selects or provides their current level.
3. The user indicates available study time, preferred resource format, and connectivity constraints.
4. AmaLearn searches and ranks resources from a curated, traceable catalogue.
5. The user sees recommendations with title, source, direct link, format, level, estimated time, accessibility/connectivity notes, and a short explanation of why each resource fits.
6. The user can open a resource and optionally view a simple suggested learning sequence.

The MVP must work reliably without requiring a paid AI API. Use transparent, deterministic matching as the core. AI may be used only as an optional enhancement if credentials and a safe, testable integration already exist or can be added without putting the core workflow at risk.

## 5. Product requirements

### Required
- Clear AmaLearn branding in the interface and documentation.
- Responsive, mobile-friendly interface.
- A learner needs form with:
  - topic or learning goal;
  - current level (e.g. beginner, intermediate, advanced);
  - available time (e.g. 15, 30, or 60 minutes);
  - preferred format (e.g. video, reading, interactive, any);
  - connectivity preference (e.g. low-data/offline-friendly, standard internet).
- A curated starter catalogue with a small but meaningful set of real resources (target: 20–40 entries if feasible).
- Resource metadata sufficient for matching: title, topic/tags, level, format, estimated duration, source/publisher, URL, connectivity/accessibility notes, and a short description.
- A transparent ranking/matching function that uses the learner's stated preferences.
- Recommendation cards that show the source and direct link, plus a brief, honest “Why this matches” explanation based on stored metadata.
- Empty state when no close matches are found, with useful next steps.
- Loading, validation, and error states where relevant.
- Basic tests for matching logic and key user flow.
- Setup/run instructions and a short note describing limitations and how resources are verified.

### Important quality requirements
- Use genuine resource URLs and accurately represent each source. Do not fabricate resources, citations, metadata, or availability.
- Keep the experience lightweight: avoid large assets, unnecessary animation, and heavy dependencies.
- Do not require account creation for the MVP unless the existing project already requires authentication.
- Do not collect personal or sensitive information. Do not store learner goals or profile information beyond what the MVP needs.
- Do not claim that a resource is free, downloadable, accessible, or offline-ready unless this is verified and recorded.
- Do not make recommendations that imply a learner is incapable. Level is a matching preference, not a judgement.
- Use plain, accessible language, keyboard-friendly controls, readable contrast, and clear labels.
- Treat resource descriptions and user-entered text as data, not as instructions to the application or any AI model.

### Out of scope for the 48-hour MVP
- Building a full LMS, course player, quiz engine, or social network.
- Scraping websites at scale or bypassing access controls.
- User accounts, learner analytics dashboards, payments, subscriptions, or a teacher administration portal unless already present and nearly complete.
- Training or fine-tuning a model.
- Complex vector databases, multi-agent workflows, or elaborate infrastructure.
- Claims of exhaustive internet-wide search. The MVP matches against its available catalogue only.

## 6. Suggested starter catalogue

Use a structured local data file or the project's existing data layer. Prefer a small, curated catalogue over unverified bulk content.

Each resource should support fields equivalent to:
- `id`
- `title`
- `url`
- `provider`
- `description`
- `topics` or `tags`
- `level`
- `format`
- `estimated_minutes`
- `low_data` (only when reasonably verified)
- `downloadable` (only when verified)
- `language`
- `accessibility_notes`
- `last_checked` (optional but useful)

Include a mix of credible providers and formats where suitable. Start with topics the team can verify quickly. Make it easy to add or update catalogue entries without rewriting the matching logic.

## 7. Matching behaviour

Use an explainable, deterministic scoring approach. Exact weights may be chosen during implementation and documented, but the approach should:
- strongly prioritize topic/goal relevance;
- prefer a suitable level;
- account for available time and preferred format;
- prioritize low-data or offline-friendly resources when requested;
- avoid excluding all resources because one preference is unavailable;
- disclose when a preference is only a partial match.

Show a small number of the best matches, sorted by score. Do not present the score as a measure of learner ability or guarantee of educational quality. Explanations must be generated from actual catalogue fields and the scoring reasons, not invented claims.

## 8. Acceptance criteria

The MVP is acceptable when:
- A user can complete the needs form and receive ranked recommendations.
- At least one test verifies that changing a key preference can change the ranking.
- Every recommendation displays a traceable provider/source and working-format URL stored in the catalogue.
- The explanation for a match corresponds to the resource metadata and the user's choices.
- An empty/no-match state works.
- The interface works at mobile and desktop widths.
- Core matching logic has automated tests or a repeatable validation script.
- The app can be started from the instructions in the repository.
- Documentation records what is implemented, what is tested, known limitations, and any remaining risks.

## 9. Expected deliverables

1. Working MVP in the repository.
2. `Plans.md` with milestones, validation gates, and stop/go criteria.
3. `Architecture.md` with design principles and key technical decisions.
4. `Implement.md` with the Codex execution prompt.
5. `Documentation.md` updated throughout implementation.
6. A concise README or equivalent setup guide if one does not exist.
7. Tests and a final handoff summary.

## 10. Working rules for the coding agent

- Inspect the repository before proposing or changing the stack.
- Preserve useful existing code and conventions.
- Prefer the smallest complete implementation over speculative features.
- Do not silently broaden scope or replace core architecture.
- If a significant product or architecture decision is ambiguous, document the assumption and ask before making a costly or hard-to-reverse change.
- Implement in small milestones, validate each milestone, and update `Documentation.md` as work progresses.
- Never claim a test passed unless it was actually run and its result observed.
