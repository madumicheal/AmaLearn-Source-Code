# AmaLearn

AmaLearn is a lightweight resource-matching MVP for learners and tutors. It collects a learner's goal, current level, available time, preferred format, and connectivity preference, then ranks a curated catalogue of real learning resources with transparent reasons.

## Run Locally

```bash
npm install
npm run dev
```

Private deployment: https://amalearn.docilejelly2.chatgpt.site

## Validate

```bash
npm test
npm run build
```

## Realtime Search API

AmaLearn now includes a server-side `POST /api/search` layer for realtime resource discovery. The endpoint normalizes web search results into the same resource shape used by the curated catalogue, then the client scores and displays them separately as `Realtime` and `Needs review`.

The endpoint is intentionally conservative:

- API keys stay on the server and are never exposed to the browser.
- Unknown duration, accessibility, low-data, language, or download claims remain unknown.
- Realtime results are not treated as curated catalogue records.
- If no provider key is configured, the endpoint returns a clear `Search provider not configured` response.

Supported provider environment variables:

- Brave Search API: `BRAVE_SEARCH_API_KEY`
- Tavily Search API: `TAVILY_API_KEY`
- Google Custom Search JSON API: `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_CX`

## MVP Scope

- React + Vite client app.
- Local, structured catalogue of 24 curated learning resources.
- Deterministic matching logic with topic, level, format, time, and connectivity factors.
- Recommendation cards with provider, source URL, metadata, and match reasons.
- Suggested study path generated only from the top-ranked catalogue matches.
- Server-side realtime search endpoint with Brave, Tavily, and Google adapter support.
- Realtime results displayed separately from curated recommendations with review status labels.
- Empty and validation states.
- Unit and UI smoke tests for catalogue validation, ranking behavior, form submission, validation, study-path rendering, and search API normalization.

## Limitations

- AmaLearn can only return realtime web results after a provider key is configured in the server environment.
- Metadata is conservative. Unknown duration, accessibility, low-data, or download claims are shown as unknown rather than guessed.
- No learner account, analytics, persistence, paid API, or LLM is required.

## Roadmap

See [AUDIT_AND_ROADMAP.md](./AUDIT_AND_ROADMAP.md) for the resource-quality audit, accessibility/usability notes, and the recommended realtime search architecture.
