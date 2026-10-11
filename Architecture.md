# AmaLearn — Architecture and Guiding Principles

## 1. Architectural objective

Deliver a small, dependable learning-resource matching MVP that can be demonstrated within a 48-hour capstone window. Prefer a clear separation between catalogue data, matching logic, and user interface. Adapt to the repository's existing stack rather than replacing it unnecessarily.

## 2. Guiding principles

### Learner-first, not content-volume-first
The main value is finding a suitable resource, not presenting the largest possible catalogue.

### Traceability and honesty
Every recommendation must point to a real, identifiable source. Resource attributes such as cost, downloadability, duration, language, and low-data suitability must not be invented. Unknown is better than an unsupported claim.

### Explainable matching
Use deterministic ranking for the core MVP. Users should understand why a resource appears. Match reasons must be grounded in actual metadata and the learner's selected preferences.

### Inclusive personalization
Preferences guide recommendations; they should not label, shame, or permanently constrain a learner. When an exact match is unavailable, offer reasonable alternatives and explain the trade-off.

### Low-bandwidth by default
Keep pages lightweight, limit unnecessary network calls and large media, and do not embed or autoplay learning videos. Link to original resources. Where possible, identify low-data or downloadable options only when verified.

### Privacy by default
Do not require accounts for the first version unless the existing repository already depends on them. Collect only inputs needed to rank resources. Do not log or persist learner profile inputs unnecessarily. Never commit secrets or API keys.

### Accessibility by design
Use semantic HTML, labels, keyboard support, visible focus, readable contrast, descriptive link text, and responsive layouts. Avoid relying on colour alone to convey meaning.

### Small, testable modules
Keep resource data, matching/scoring, and presentation separate. The matching function should be testable without rendering the UI or making network requests.

### Preserve the repository
Inspect existing structure, dependencies, scripts, patterns, and tests first. Reuse established conventions and avoid unnecessary rewrites.

## 3. Logical components

The MVP should have these logical parts, adapted to the project's existing architecture:

1. **Learner needs input**
   - Topic/goal
   - Current level
   - Available time
   - Preferred format
   - Connectivity preference

2. **Resource catalogue**
   - Structured, curated resource records
   - Provider and URL
   - Topics/tags and level
   - Format and estimated duration
   - Verified connectivity/download/accessibility metadata where available

3. **Matching engine**
   - Normalises user preferences and resource metadata
   - Calculates explainable relevance and fit
   - Returns ranked resources with structured match reasons
   - Handles missing fields and no-result scenarios

4. **Recommendation presentation**
   - Displays ranked resource cards
   - Explains fit and limitations
   - Provides direct links to the original providers
   - Offers useful next steps when results are limited

5. **Validation and tests**
   - Catalogue/schema checks
   - Unit tests for ranking
   - Key-flow smoke test or repeatable manual test steps

## 4. Suggested data shape

Adapt naming to the existing language and conventions. A resource record should contain equivalents of:

```ts
type Resource = {
  id: string;
  title: string;
  url: string;
  provider: string;
  description: string;
  topics: string[];
  level: "beginner" | "intermediate" | "advanced" | "all-levels" | "unknown";
  format: "video" | "reading" | "interactive" | "course" | "download" | "other";
  estimatedMinutes?: number;
  language?: string;
  lowData?: boolean | "unknown";
  downloadable?: boolean | "unknown";
  accessibilityNotes?: string;
  lastChecked?: string;
};
```

This is a conceptual example, not a mandate to use TypeScript if the repository uses another stack. Use explicit unknown values or optional fields rather than filling gaps with guesses.

## 5. Matching approach

Start with a deterministic scoring function. A possible model is:

- Topic/goal relevance: highest weight.
- Level fit: high weight.
- Preferred format: medium weight.
- Time fit: medium weight.
- Connectivity fit: medium-to-high when low-data is requested.

Exact weights and implementation details should be documented after inspecting the codebase. Avoid brittle all-or-nothing filtering. If a preference cannot be satisfied, allow the resource to appear with a lower score and a transparent explanation when it remains relevant.

The engine should return data conceptually similar to:

```ts
type MatchReason = {
  factor: "topic" | "level" | "time" | "format" | "connectivity";
  message: string;
};

type Recommendation = {
  resource: Resource;
  score: number;
  reasons: MatchReason[];
};
```

Do not expose a score as a judgement of the learner's ability. The score is only a ranking aid for resource fit.

## 6. Optional AI use

The deterministic matching engine is the source of truth for ranking. An LLM is optional and must not be required for the main user journey. If an AI explanation is added:
- use only the resource metadata and structured matching reasons as evidence;
- do not let the model invent links, provider claims, duration, or accessibility facts;
- provide a deterministic fallback;
- avoid sending unnecessary personal information to external services;
- keep credentials server-side and out of source control;
- document provider, data flow, and failure behaviour.

Do not add AI merely to make the capstone sound more advanced.

## 7. Security and reliability

- Validate and normalise user input.
- Render user-entered text safely; do not interpret it as HTML or executable content.
- Use safe external-link handling consistent with the chosen framework.
- Avoid scraping or bypassing provider access controls.
- Do not expose server secrets to the client.
- Use only dependencies needed for the core flow.
- Provide useful error and empty states without leaking internal errors.
- Keep resource URLs as curated data; validate URL format and allowed protocols.

## 8. Deployment and environment

First inspect the repository and available deployment target. Keep the app runnable locally with documented commands. Do not introduce a database or hosting service unless the existing app requires one. A local JSON/TS/Python catalogue may be sufficient for the MVP.

Document:
- runtime and package manager;
- install/run/test/build commands;
- environment variables, if any;
- any external-service dependency;
- known limitations and deployment assumptions.

## 9. Key architectural decision rule

When choosing between two approaches, prefer the one that:
1. preserves existing working code;
2. completes the end-to-end matching journey sooner;
3. keeps recommendations traceable and explainable;
4. is testable without paid services;
5. is easier to maintain after the capstone.

Record significant decisions and their rationale in `Documentation.md`.
