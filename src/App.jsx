import React, { useMemo, useState } from "react";
import { resources } from "./data/resources.js";
import { createStudyPath, findRecommendations } from "./lib/matcher.js";
import { validateResources } from "./lib/validateResources.js";

const levelOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const formatOptions = [
  { value: "any", label: "Any format" },
  { value: "video", label: "Video" },
  { value: "reading", label: "Reading" },
  { value: "interactive", label: "Interactive" },
  { value: "course", label: "Course" },
  { value: "download", label: "Download" },
];

const connectivityOptions = [
  { value: "standard", label: "Standard internet" },
  { value: "low-data", label: "Low-data or downloadable preferred" },
];

const timeOptions = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "180", label: "A longer session" },
];

const initialNeeds = {
  goal: "",
  level: "beginner",
  timeMinutes: "30",
  format: "any",
  connectivity: "standard",
};

export function App() {
  const [needs, setNeeds] = useState(initialNeeds);
  const [submittedNeeds, setSubmittedNeeds] = useState(null);
  const [touched, setTouched] = useState(false);

  const catalogueIssues = useMemo(() => validateResources(resources), []);
  const recommendations = useMemo(() => {
    if (!submittedNeeds || catalogueIssues.length > 0) {
      return [];
    }

    return findRecommendations(resources, {
      ...submittedNeeds,
      timeMinutes: Number(submittedNeeds.timeMinutes),
    });
  }, [submittedNeeds, catalogueIssues]);
  const studyPath = useMemo(() => createStudyPath(recommendations), [recommendations]);

  const goalError =
    touched && needs.goal.trim().length < 2
      ? "Enter a topic or learning goal."
      : "";

  function updateNeed(field, value) {
    setNeeds((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);

    const formData = new FormData(event.currentTarget);
    const nextNeeds = {
      goal: String(formData.get("goal") || "").trim(),
      level: String(formData.get("level") || initialNeeds.level),
      timeMinutes: String(formData.get("timeMinutes") || initialNeeds.timeMinutes),
      format: String(formData.get("format") || initialNeeds.format),
      connectivity: String(formData.get("connectivity") || initialNeeds.connectivity),
    };

    setNeeds(nextNeeds);

    if (nextNeeds.goal.length < 2) {
      setSubmittedNeeds(null);
      return;
    }

    setSubmittedNeeds(nextNeeds);
  }

  function handleReset() {
    setNeeds(initialNeeds);
    setSubmittedNeeds(null);
    setTouched(false);
  }

  return (
    <main className="app-shell">
      <a className="skip-link" href="#results-title">
        Skip to recommendations
      </a>
      <section className="workspace" aria-labelledby="app-title">
        <header className="topbar">
          <div className="brand" aria-label="AmaLearn">
            <span className="brand-mark" aria-hidden="true">
              A
            </span>
            <div>
              <p className="eyebrow">AmaLearn</p>
              <h1 id="app-title">Find the right resource for your next study session.</h1>
            </div>
          </div>
          <p className="tagline">Curated sources, ranked with clear reasons.</p>
        </header>

        <div className="experience-grid">
          <form className="needs-panel" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="goal">Learning goal or topic</label>
              <input
                id="goal"
                name="goal"
                value={needs.goal}
                onBlur={() => setTouched(true)}
                onChange={(event) => updateNeed("goal", event.target.value)}
                placeholder="Example: learn Python basics"
                aria-describedby={goalError ? "goal-error" : "goal-hint"}
                aria-invalid={Boolean(goalError)}
              />
              {goalError ? (
                <p className="field-error" id="goal-error">
                  {goalError}
                </p>
              ) : (
                <p className="field-hint" id="goal-hint">
                  Try a skill, subject, or outcome.
                </p>
              )}
            </div>

            <div className="form-row">
              <SelectField
                id="level"
                label="Current level"
                value={needs.level}
                options={levelOptions}
                onChange={(value) => updateNeed("level", value)}
              />
              <SelectField
                id="timeMinutes"
                label="Available time"
                value={needs.timeMinutes}
                options={timeOptions}
                onChange={(value) => updateNeed("timeMinutes", value)}
              />
            </div>

            <div className="form-row">
              <SelectField
                id="format"
                label="Preferred format"
                value={needs.format}
                options={formatOptions}
                onChange={(value) => updateNeed("format", value)}
              />
              <SelectField
                id="connectivity"
                label="Connectivity"
                value={needs.connectivity}
                options={connectivityOptions}
                onChange={(value) => updateNeed("connectivity", value)}
              />
            </div>

            <div className="action-row">
              <button className="primary-button" type="submit">
                Match resources
              </button>
              <button className="secondary-button" type="button" onClick={handleReset}>
                Reset
              </button>
            </div>
          </form>

          <section className="results-panel" aria-live="polite" aria-labelledby="results-title">
            <div className="results-heading">
              <div>
                <p className="eyebrow">Recommendations</p>
                <h2 id="results-title">
                  {submittedNeeds ? `Best matches for "${submittedNeeds.goal}"` : "Ready when you are"}
                </h2>
              </div>
              <span className="catalogue-count">{resources.length} resources</span>
            </div>

            {catalogueIssues.length > 0 ? (
              <StatusMessage
                title="Catalogue needs attention"
                body="AmaLearn found invalid resource records. Fix the catalogue before showing recommendations."
              />
            ) : !submittedNeeds ? (
              <StatusMessage
                title="Set your study needs"
                body="Enter a goal and preferences to see ranked, source-backed resources from the catalogue."
              />
            ) : recommendations.length === 0 ? (
              <StatusMessage
                title="No close matches yet"
                body="Try a broader topic, choose any format, or use standard internet while the catalogue grows."
              />
            ) : (
              <>
                <StudyPath steps={studyPath} />
                <div className="resource-list">
                  {recommendations.map((recommendation) => (
                    <ResourceCard
                      key={recommendation.resource.id}
                      recommendation={recommendation}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function SelectField({ id, label, value, options, onChange }) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StudyPath({ steps }) {
  return (
    <section className="study-path" aria-labelledby="study-path-title">
      <div>
        <p className="eyebrow">Suggested path</p>
        <h3 id="study-path-title">A grounded sequence from your top matches</h3>
      </div>
      <ol>
        {steps.map((step) => (
          <li key={step.resource.id}>
            <span>{step.label}</span>
            <strong>{step.resource.title}</strong>
            <small>{step.reason}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ResourceCard({ recommendation }) {
  const { resource, reasons } = recommendation;

  return (
    <article className="resource-card">
      <div className="resource-main">
        <div>
          <p className="provider">{resource.provider}</p>
          <h3>{resource.title}</h3>
        </div>
        <a
          className="resource-link"
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open source for ${resource.title}`}
        >
          Open source
        </a>
      </div>

      <p className="description">{resource.description}</p>

      <dl className="metadata-grid">
        <MetaItem label="Level" value={formatValue(resource.level)} />
        <MetaItem label="Format" value={formatValue(resource.format)} />
        <MetaItem label="Duration" value={resource.durationLabel} />
        <MetaItem label="Download" value={availabilityLabel(resource.downloadable)} />
        <MetaItem label="Language" value={resource.language || "Unknown"} />
        <MetaItem label="Checked" value={resource.lastChecked || "Unknown"} />
      </dl>

      <div className="notes">
        <p>
          <strong>Connectivity:</strong> {availabilityLabel(resource.lowData)}
        </p>
        <p>
          <strong>Accessibility:</strong> {resource.accessibilityNotes || "Unknown"}
        </p>
      </div>

      <div className="match-reasons">
        <h4>Why this matches</h4>
        <ul>
          {reasons.map((reason) => (
            <li key={`${resource.id}-${reason.factor}`}>{reason.message}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatusMessage({ title, body }) {
  return (
    <div className="status-message">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function formatValue(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function availabilityLabel(value) {
  if (value === true) {
    return "Verified";
  }
  if (value === false) {
    return "Not verified";
  }
  return "Unknown";
}
