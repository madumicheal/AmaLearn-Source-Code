# AmaLearn Audit and Roadmap

Last updated: 2026-10-12

## Executive Summary

AmaLearn is in a strong MVP state for a capstone: the core flow works, the matching logic is deterministic and tested, the catalogue is conservative rather than inflated, and the UI now gives learners source-backed recommendations, ready tracks, and a suggested path.

The next product risk is not basic functionality. It is trust at scale. To support any subject or course in realtime, AmaLearn now has a server-side search layer scaffold, and it still needs a configured provider key plus quality controls before realtime results should be treated as reliable.

## Current MVP Audit

### Resource Quality

Current catalogue:
- 64 resources.
- 30 providers.
- 2 resources with known estimated minutes.
- 8 resources with verified downloadable status.
- 2 resources with verified low-data suitability.
- 18 ready tracks across career paths, quick skills, school support, and project paths.
- 0 resources with detailed accessibility metadata.

Strengths:
- Resources are real and source-backed.
- Unknown metadata is shown as unknown instead of guessed.
- The catalogue now includes more regional and low-connectivity relevance through NITDA DL4ALL, Kolibri, African Storybook, and OER Africa.
- The browseable track layer makes roadmap-style discovery possible without pretending AmaLearn hosts the courses itself.

Risks:
- Duration and accessibility metadata are still thin.
- Provider trust is implicit, not yet represented as structured data.
- Catalogue entries do not yet store a provenance note explaining where each claim was verified.
- Track resource lists are manually curated and should keep growing through review rather than automatic realtime promotion.

Recommended next improvements:
- Add `verificationNotes` per resource for claims such as downloadable, low-data, duration, and accessibility.
- Add `resourceType` or `providerType`, such as official documentation, open textbook, platform course, offline platform, or teacher resource.
- Add more Nigeria/Africa-relevant resources only when direct source URLs and metadata can be verified.

### Matching Quality

Strengths:
- Ranking is deterministic.
- Topic fit is now required, so unrelated resources are not returned only because format, level, or connectivity preferences match.
- Study paths are generated only from ranked recommendations.
- Tests cover topic changes, format changes, low-data preference, empty catalogues, unrelated goals, and study path grounding.
- Tests cover track integrity and ensure each ready track returns catalogue matches.

Risks:
- Topic matching is still keyword-based.
- Synonyms are hand-maintained.
- There is no provider quality score yet.
- Realtime search deduplicates exact URLs, but it does not yet detect near-duplicate titles or mirrored content.

Recommended next improvements:
- Add provider quality weights for official/open/public-benefit sources.
- Add duplicate URL/title detection.
- Add a confidence label per result: strong, partial, or exploratory.
- Add topic normalization for common Nigerian curriculum/course terms.

### Accessibility

Strengths:
- Semantic labels are present.
- Focus styles are visible.
- The results region uses `aria-live`.
- Repeated source links now have resource-specific accessible labels.
- A skip link now lets keyboard users jump to recommendations.

Risks:
- No automated accessibility engine is installed.
- Screen-reader review is not complete.
- External provider pages may vary widely in accessibility.
- Realtime results must keep accessibility fields as unknown unless a provider page exposes verifiable metadata.

Recommended next improvements:
- Add `axe-core` or Playwright accessibility checks.
- Test keyboard-only flow on desktop and mobile widths.
- Add structured accessibility metadata only where a provider makes it verifiable.

### Usability

Strengths:
- The first screen is the actual matching workflow, not a landing page.
- The recommendation cards show source, metadata, and match reasons.
- The suggested path gives the product a clearer “learn with direction” feeling.

Risks:
- Users may assume realtime results are curated unless labels remain visible.
- No-match states should explain when realtime search is unavailable because no provider key is configured.
- Users cannot yet filter or sort after results appear.

Recommended next improvements:
- Keep clear labels between curated catalogue recommendations and realtime search results.
- Add a filter/sort refinement panel only after the core flow remains stable.
- Add an optional review workflow that lets a trusted reviewer promote a realtime result into the curated catalogue.

## Realtime Search Direction

### Product Goal

Enable learners to search for any subject or course in realtime while preserving AmaLearn's trust model:
- Real source URLs.
- No fabricated metadata.
- Unknown fields stay unknown.
- Recommendations remain explainable.
- API keys are never exposed in the browser.

### Recommended Architecture

AmaLearn uses a hybrid model:

1. Search curated catalogue first.
2. If close matches are insufficient, call a server-side realtime search endpoint.
3. Search endpoint queries one or more approved search providers.
4. Normalize results into temporary `Resource` records.
5. Run the same validation and matching pipeline.
6. Display realtime results separately from curated results with clear provenance labels.

Client flow:
- User submits goal/preferences.
- App displays curated matches immediately.
- If few/weak matches exist, the app shows an option to search the web.
- Realtime results appear under a label such as “Realtime results, not yet curated.”

Server flow:
- `POST /api/search`
- Inputs: goal, level, format, time, connectivity.
- Secrets stay server-side.
- Search query is constrained to learning intent, e.g. `"{goal}" course tutorial open educational resource`.
- Results are normalized and scored.
- Unsafe protocols, duplicate URLs, thin snippets, and irrelevant domains are filtered out.

Current implementation status:
- `POST /api/search` exists in local Vite middleware and the production Worker build.
- Brave, Tavily, and Google Custom Search adapters are scaffolded behind server-side environment variables.
- The client shows realtime results separately and marks them as needing review.
- The endpoint returns a 503 setup response if no provider key is configured.

### Provider Options

Candidate providers:
- Brave Search API: broad web search API with documented web search endpoints.
- Google Custom Search JSON API: documented JSON search API, but requires a custom search engine and API configuration.
- Tavily Search API: search API oriented toward AI/research workflows.

Recommendation:
- Start with one backend adapter interface and one provider.
- Prefer Brave or Tavily for a prototype because they are straightforward web-search APIs.
- Keep Google Custom Search as an option only if its account/project constraints fit the team.

### Trust Rules for Realtime Results

Realtime results must not be treated as curated resources until reviewed.

Display labels:
- `Curated` for catalogue records.
- `Realtime` for search results.
- `Needs review` for results with unknown duration/download/accessibility metadata.

Do not claim:
- Free access unless the provider page states it clearly.
- Downloadability unless verified.
- Offline readiness unless verified.
- Accessibility unless verified.
- Duration unless retrieved from reliable metadata.

### Implementation Phases

Phase 1: Search design scaffold - complete
- Add `sourceType`, `verificationNotes`, and `curationStatus` fields to resources.
- Add UI labels for curated vs realtime results.
- Add tests for search-result normalization using fixtures.

Phase 2: Backend search endpoint - scaffold complete, provider configuration pending
- Add a minimal server/API route.
- Store provider API key server-side.
- Normalize web results into AmaLearn resource candidates.
- Add query length limits.
- Add rate limiting before public or high-traffic use.

Phase 3: Quality controls
- Add allowed/discouraged domain lists.
- Add duplicate detection.
- Add provider confidence labels.
- Add review workflow to promote a realtime result into the curated catalogue.

Phase 4: Better discovery
- Add source-specific connectors where useful, such as OpenStax, MDN, OpenCourseWare, or other OER catalogues.
- Add curriculum-aware topic aliases.
- Add optional AI summarization only after deterministic metadata and source checks are stable.

## Capstone Positioning

Use this framing:

AmaLearn is not trying to host courses or generate content. It solves the decision problem: “Which credible resource should I start with, and why?”

Strong capstone message:
- MVP: curated catalogue, explainable matching, conservative metadata.
- Quality: deterministic ranking, tested logic, source-backed results.
- Inclusion: low-data/downloadable metadata and Africa/Nigeria-relevant resources.
- Future: realtime discovery through a controlled search backend, not unsafe scraping or invented AI answers.

## Immediate Next Backlog

1. Configure one realtime search provider key in the deployment environment.
2. Add provider quality weights and confidence labels to recommendation cards.
3. Add `axe-core` accessibility checks.
4. Add rate limiting for `/api/search`.
5. Add domain quality rules and near-duplicate detection for realtime results.
6. Add “Promote to curated catalogue” workflow for reviewed realtime results.
