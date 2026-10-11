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

## MVP Scope

- React + Vite client app.
- Local, structured catalogue of 24 curated learning resources.
- Deterministic matching logic with topic, level, format, time, and connectivity factors.
- Recommendation cards with provider, source URL, metadata, and match reasons.
- Suggested study path generated only from the top-ranked catalogue matches.
- Empty and validation states.
- Unit and UI smoke tests for catalogue validation, ranking behavior, form submission, validation, and study-path rendering.

## Limitations

- AmaLearn matches only the local starter catalogue; it does not search the whole web.
- Metadata is conservative. Unknown duration, accessibility, low-data, or download claims are shown as unknown rather than guessed.
- No learner account, analytics, persistence, paid API, or LLM is required.

## Roadmap

See [AUDIT_AND_ROADMAP.md](./AUDIT_AND_ROADMAP.md) for the resource-quality audit, accessibility/usability notes, and the recommended realtime search architecture.
