import React, { useEffect, useMemo, useState } from "react";
import { projects } from "./data/projects.js";
import { resources } from "./data/resources.js";
import { findTrackById, learningTracks, trackCategories } from "./data/tracks.js";
import {
  addResourceToPlan,
  createEmptyPlan,
  getNextActivity,
  moveResourceInPlan,
  PLAN_STORAGE_KEY,
  recordCheckIn,
  removeResourceFromPlan,
  restorePlan,
  serializePlan,
  suggestNextStep,
  summarizeProgress,
} from "./lib/learningPlan.js";
import { createStudyPath, findRecommendations } from "./lib/matcher.js";
import { createLearningRoadmap, findProjectIdeas } from "./lib/roadmap.js";
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

const difficultyOptions = [
  { value: "", label: "Difficulty not recorded" },
  { value: "easy", label: "Felt manageable" },
  { value: "ok", label: "Felt okay" },
  { value: "hard", label: "Felt difficult" },
];

const directionPrompts = [
  {
    label: "Career path",
    goal: "web development",
    level: "beginner",
    timeMinutes: "60",
    format: "course",
    connectivity: "standard",
  },
  {
    label: "Quick skill",
    goal: "SQL basics",
    level: "beginner",
    timeMinutes: "30",
    format: "interactive",
    connectivity: "standard",
  },
  {
    label: "School support",
    goal: "algebra equations",
    level: "beginner",
    timeMinutes: "30",
    format: "any",
    connectivity: "low-data",
  },
  {
    label: "Build project",
    goal: "python basics",
    level: "beginner",
    timeMinutes: "60",
    format: "any",
    connectivity: "standard",
  },
];

export function App() {
  const [needs, setNeeds] = useState(initialNeeds);
  const [submittedNeeds, setSubmittedNeeds] = useState(null);
  const [touched, setTouched] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [learningPlan, setLearningPlan] = useState(loadSavedPlan);
  const [planMessage, setPlanMessage] = useState("");
  const [checkInDifficulty, setCheckInDifficulty] = useState("");
  const [adaptiveSuggestion, setAdaptiveSuggestion] = useState(null);
  const [realtimeSearch, setRealtimeSearch] = useState({
    status: "idle",
    message: "",
    provider: "",
    results: [],
  });

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
  const realtimeRecommendations = useMemo(() => {
    if (!submittedNeeds || realtimeSearch.results.length === 0) {
      return [];
    }

    return findRecommendations(realtimeSearch.results, {
      ...submittedNeeds,
      timeMinutes: Number(submittedNeeds.timeMinutes),
    });
  }, [submittedNeeds, realtimeSearch.results]);
  const allRecommendations = useMemo(
    () => [...recommendations, ...realtimeRecommendations],
    [recommendations, realtimeRecommendations],
  );
  const projectIdeas = useMemo(() => {
    if (!submittedNeeds) {
      return [];
    }

    return findProjectIdeas(projects, submittedNeeds, recommendations);
  }, [submittedNeeds, recommendations]);
  const learningRoadmap = useMemo(
    () =>
      createLearningRoadmap({
        recommendations,
        projects: projectIdeas,
        plan: learningPlan,
        needs: submittedNeeds || needs,
      }),
    [recommendations, projectIdeas, learningPlan, submittedNeeds, needs],
  );
  const planSummary = useMemo(() => summarizeProgress(learningPlan), [learningPlan]);
  const nextActivity = useMemo(() => getNextActivity(learningPlan), [learningPlan]);
  const selectedTrack = useMemo(() => findTrackById(selectedTrackId), [selectedTrackId]);

  const goalError =
    touched && needs.goal.trim().length < 2
      ? "Enter a topic or learning goal."
      : "";

  useEffect(() => {
    savePlan(learningPlan);
  }, [learningPlan]);

  function updateNeed(field, value) {
    setSelectedTrackId("");
    setNeeds((current) => ({ ...current, [field]: value }));
  }

  function applyDirectionPrompt(prompt) {
    setSelectedTrackId("");
    setNeeds({
      goal: prompt.goal,
      level: prompt.level,
      timeMinutes: prompt.timeMinutes,
      format: prompt.format,
      connectivity: prompt.connectivity,
    });
    setTouched(false);
  }

  function applyLearningTrack(track) {
    const nextNeeds = {
      goal: track.goal,
      level: track.level,
      timeMinutes: track.timeMinutes,
      format: track.format,
      connectivity: track.connectivity,
    };

    setNeeds(nextNeeds);
    setSubmittedNeeds(nextNeeds);
    setSelectedTrackId(track.id);
    setTouched(false);
    setRealtimeSearch({ status: "idle", message: "", provider: "", results: [] });
    setAdaptiveSuggestion(null);
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
    setSelectedTrackId("");

    if (nextNeeds.goal.length < 2) {
      setSubmittedNeeds(null);
      setRealtimeSearch({ status: "idle", message: "", provider: "", results: [] });
      setAdaptiveSuggestion(null);
      return;
    }

    setSubmittedNeeds(nextNeeds);
    setRealtimeSearch({ status: "idle", message: "", provider: "", results: [] });
    setAdaptiveSuggestion(null);
  }

  function handleReset() {
    setNeeds(initialNeeds);
    setSubmittedNeeds(null);
    setSelectedTrackId("");
    setTouched(false);
    setRealtimeSearch({ status: "idle", message: "", provider: "", results: [] });
    setAdaptiveSuggestion(null);
  }

  async function handleRealtimeSearch() {
    if (!submittedNeeds) {
      return;
    }

    setRealtimeSearch({ status: "loading", message: "Searching trusted web sources...", provider: "", results: [] });

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: submittedNeeds.goal,
          level: submittedNeeds.level,
          format: submittedNeeds.format,
          timeMinutes: submittedNeeds.timeMinutes,
          connectivity: submittedNeeds.connectivity,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setRealtimeSearch({
          status: "error",
          message: formatRealtimeMessage(payload.message, "Realtime search is unavailable right now."),
          provider: "",
          results: [],
        });
        return;
      }

      setRealtimeSearch({
        status: "complete",
        message: formatRealtimeMessage(
          payload.notice,
          "These are live web results. AmaLearn has not reviewed their metadata yet.",
        ),
        provider: payload.provider,
        results: payload.results || [],
      });
    } catch {
      setRealtimeSearch({
        status: "error",
        message: "Realtime search could not be reached. Try again later.",
        provider: "",
        results: [],
      });
    }
  }

  function handleAddToPlan(resource) {
    setLearningPlan((currentPlan) => addResourceToPlan(currentPlan, resource));
    setPlanMessage(`${resource.title} is in your learning plan.`);
  }

  function handleRemoveFromPlan(resourceId) {
    setLearningPlan((currentPlan) => removeResourceFromPlan(currentPlan, resourceId));
    setAdaptiveSuggestion(null);
    setPlanMessage("Removed from your learning plan.");
  }

  function handleMovePlanItem(resourceId, direction) {
    setLearningPlan((currentPlan) => moveResourceInPlan(currentPlan, resourceId, direction));
    setAdaptiveSuggestion(null);
    setPlanMessage("Learning plan sequence updated.");
  }

  function handleCheckIn(resourceId, outcome) {
    setLearningPlan((currentPlan) => {
      const updatedPlan = recordCheckIn(currentPlan, resourceId, outcome, checkInDifficulty);
      setAdaptiveSuggestion(
        suggestNextStep({
          plan: updatedPlan,
          resourceId,
          outcome,
          difficulty: checkInDifficulty,
          recommendations: allRecommendations,
          needs: submittedNeeds || needs,
        }),
      );
      return updatedPlan;
    });
    setPlanMessage("Check-in saved.");
  }

  function handleResetProgress() {
    setLearningPlan(createEmptyPlan());
    setAdaptiveSuggestion(null);
    setPlanMessage("Learning progress reset on this device.");
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
              <h1 id="app-title">Choose a path or search a learning goal.</h1>
            </div>
          </div>
          <div className="topbar-aside" aria-label="AmaLearn learning loop">
            <p className="tagline">AmaLearn recommends credible resources, explains the match, and helps you keep going.</p>
            <div className="hero-stat-grid" aria-label="AmaLearn catalogue summary">
              <span>
                <strong>{resources.length}</strong>
                Curated resources
              </span>
              <span>
                <strong>{learningTracks.length}</strong>
                Ready tracks
              </span>
              <span>
                <strong>Live</strong>
                Web search
              </span>
            </div>
            <div className="loop-strip" aria-hidden="true">
              <span>Discover</span>
              <span>Choose</span>
              <span>Learn</span>
              <span>Adapt</span>
            </div>
          </div>
        </header>

        <TrackBrowser
          categories={trackCategories}
          tracks={learningTracks}
          resources={resources}
          selectedTrackId={selectedTrackId}
          onSelectTrack={applyLearningTrack}
        />

        <div className="experience-grid">
          <form className="needs-panel" onSubmit={handleSubmit} noValidate>
            <div className="start-note">
              <p className="eyebrow">Start here</p>
              <p>Choose a track above for speed, or refine a custom goal here.</p>
            </div>

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

            <div className="direction-prompts" aria-label="What should I learn next suggestions">
              <p className="eyebrow">Quick prompts</p>
              <div>
                {directionPrompts.map((prompt) => (
                  <button
                    className="prompt-chip"
                    key={prompt.label}
                    type="button"
                    onClick={() => applyDirectionPrompt(prompt)}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
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
                  {selectedTrack
                    ? `${selectedTrack.title} track`
                    : submittedNeeds
                      ? `Best matches for "${submittedNeeds.goal}"`
                      : "Ready when you are"}
                </h2>
                {selectedTrack ? <p className="track-summary">{selectedTrack.summary}</p> : null}
                {submittedNeeds ? (
                  <p className="results-subtitle">
                    Start with the strongest catalogue matches. Use the roadmap, projects, and companion
                    when you want more structure.
                  </p>
                ) : null}
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
              <>
                <StatusMessage
                  title="No close catalogue matches yet"
                  body="Try a broader topic, or use realtime search to look beyond the curated catalogue."
                />
                <RealtimeSearchPanel
                  status={realtimeSearch.status}
                  message={realtimeSearch.message}
                  provider={realtimeSearch.provider}
                  results={realtimeRecommendations}
                  plan={learningPlan}
                  onSearch={handleRealtimeSearch}
                  onAddToPlan={handleAddToPlan}
                />
              </>
            ) : (
              <>
                <StudyPath steps={studyPath} />
                <div className="resource-list">
                  {recommendations.map((recommendation) => (
                    <ResourceCard
                      key={recommendation.resource.id}
                      recommendation={recommendation}
                      isInPlan={isResourceInPlan(learningPlan, recommendation.resource.id)}
                      onAddToPlan={handleAddToPlan}
                    />
                  ))}
                </div>
                <div className="secondary-guidance" aria-label="Optional learning structure">
                  <RoadmapView stages={learningRoadmap} />
                  <ProjectIdeas ideas={projectIdeas} />
                </div>
                <RealtimeSearchPanel
                  status={realtimeSearch.status}
                  message={realtimeSearch.message}
                  provider={realtimeSearch.provider}
                  results={realtimeRecommendations}
                  plan={learningPlan}
                  onSearch={handleRealtimeSearch}
                  onAddToPlan={handleAddToPlan}
                />
              </>
            )}
            <LearningCompanion
              plan={learningPlan}
              summary={planSummary}
              nextActivity={nextActivity}
              message={planMessage}
              difficulty={checkInDifficulty}
              difficultyOptions={difficultyOptions}
              suggestion={adaptiveSuggestion}
              onDifficultyChange={setCheckInDifficulty}
              onCheckIn={handleCheckIn}
              onMove={handleMovePlanItem}
              onRemove={handleRemoveFromPlan}
              onResetProgress={handleResetProgress}
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function TrackBrowser({ categories, tracks, resources, selectedTrackId, onSelectTrack }) {
  const resourceIds = useMemo(() => new Set(resources.map((resource) => resource.id)), [resources]);

  return (
    <section className="track-browser" aria-labelledby="tracks-title">
      <div className="track-browser-heading">
        <div>
          <p className="eyebrow">Course categories</p>
          <h2 id="tracks-title">Explore ready learning tracks</h2>
        </div>
        <p>
          Start with a familiar path, then let AmaLearn match credible resources and a practical next step.
        </p>
      </div>
      <div className="track-category-list">
        {categories.map((category, categoryIndex) => {
          const categoryTracks = tracks.filter((track) => track.category === category.id);

          return (
            <details className="track-category" key={category.id} open={categoryIndex === 0}>
              <summary>
                <span>{category.label}</span>
                <p>{category.description}</p>
              </summary>
              <div className="track-list">
                {categoryTracks.map((track) => {
                  const coveredResources = track.resourceIds.filter((id) => resourceIds.has(id)).length;
                  const isSelected = selectedTrackId === track.id;

                  return (
                    <button
                      className={isSelected ? "track-card selected" : "track-card"}
                      key={track.id}
                      type="button"
                      onClick={() => onSelectTrack(track)}
                      aria-pressed={isSelected}
                    >
                      <span>{track.title}</span>
                      <small>{track.summary}</small>
                      <strong>{coveredResources} catalogue matches</strong>
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function RealtimeSearchPanel({ status, message, provider, results, plan, onSearch, onAddToPlan }) {
  return (
    <section className="realtime-panel" aria-labelledby="realtime-title">
      <div>
        <p className="eyebrow">Realtime search</p>
        <h3 id="realtime-title">Search beyond the curated catalogue</h3>
        <p>
          Live web results help when the catalogue is not enough. AmaLearn keeps their
          duration, download, and accessibility details marked unknown until reviewed.
        </p>
      </div>
      <button
        className="secondary-button"
        type="button"
        onClick={onSearch}
        disabled={status === "loading"}
      >
        {status === "loading" ? "Searching..." : "Search web resources"}
      </button>

      {message ? (
        <p className={status === "error" ? "realtime-error" : "realtime-note"}>{message}</p>
      ) : null}

      {results.length > 0 ? (
        <div className="realtime-results">
          <p className="realtime-note">
            Showing {results.length} realtime result{results.length === 1 ? "" : "s"}
            {provider ? ` from ${provider}` : ""}.
          </p>
          {results.map((recommendation) => (
            <ResourceCard
              key={recommendation.resource.id}
              recommendation={recommendation}
              isInPlan={isResourceInPlan(plan, recommendation.resource.id)}
              onAddToPlan={onAddToPlan}
            />
          ))}
        </div>
      ) : null}
    </section>
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

function RoadmapView({ stages }) {
  return (
    <section className="roadmap-panel" aria-labelledby="roadmap-title">
      <div>
        <p className="eyebrow">Roadmap</p>
        <h3 id="roadmap-title">A simple path from learning to practice</h3>
      </div>
      <ol className="roadmap-grid">
        {stages.map((stage) => (
          <li key={stage.id}>
            <span>{stage.label}</span>
            <strong>{stage.item?.title || stage.description}</strong>
            <small>{stage.note}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProjectIdeas({ ideas }) {
  if (ideas.length === 0) {
    return null;
  }

  return (
    <section className="projects-panel" aria-labelledby="projects-title">
      <div>
        <p className="eyebrow">Practice projects</p>
        <h3 id="projects-title">Apply the topic with something small</h3>
      </div>
      <div className="project-list">
        {ideas.map(({ project, reason }) => (
          <article className="project-card" key={project.id}>
            <div>
              <span className="source-badge">Project idea</span>
              <h4>{project.title}</h4>
              <p>{project.description}</p>
            </div>
            <dl className="project-meta">
              <MetaItem label="Level" value={formatValue(project.level)} />
              <MetaItem label="Time" value={`${project.estimatedMinutes} minutes`} />
            </dl>
            <p>
              <strong>Deliverable:</strong> {project.deliverable}
            </p>
            <p>
              <strong>Why this project:</strong> {reason}
            </p>
            <p>
              <strong>Access:</strong> {project.accessNotes}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LearningCompanion({
  plan,
  summary,
  nextActivity,
  message,
  difficulty,
  difficultyOptions,
  suggestion,
  onDifficultyChange,
  onCheckIn,
  onMove,
  onRemove,
  onResetProgress,
}) {
  return (
    <section className="companion-panel" aria-labelledby="companion-title">
      <div className="companion-heading">
        <div>
          <p className="eyebrow">Adaptive companion</p>
          <h3 id="companion-title">Plan, check in, and adapt your next step</h3>
        </div>
        <span className="catalogue-count">
          {summary.completed}/{summary.total} completed
        </span>
      </div>

      {plan.items.length === 0 ? (
        <p className="empty-helper">
          No learning plan yet. Add a resource when you are ready to turn recommendations into a short study sequence.
        </p>
      ) : (
        <>
          {nextActivity ? (
            <div className="next-activity">
              <p className="eyebrow">Next activity</p>
              <h4>{nextActivity.resource.title}</h4>
              <p>
                Start here because this is the first unfinished item in your plan. Keep it
                manageable and check in when you finish studying.
              </p>
              <a
                className="resource-link"
                href={nextActivity.resource.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open next activity source for ${nextActivity.resource.title}`}
              >
                Open source
              </a>
            </div>
          ) : (
            <StatusMessage
              title="Plan complete"
              body="All planned resources are marked complete. Search a related goal or add another recommendation when you are ready."
            />
          )}

          {message ? <p className="plan-message">{message}</p> : null}

          {suggestion ? (
            <div className="adaptive-suggestion">
              <p className="eyebrow">Suggested next step</p>
              <p>{suggestion.message}</p>
              {suggestion.resource ? (
                <strong>{suggestion.resource.title}</strong>
              ) : null}
            </div>
          ) : null}

          <div className="checkin-controls">
            <label htmlFor="difficulty">Optional difficulty</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(event) => onDifficultyChange(event.target.value)}
            >
              {difficultyOptions.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <ol className="plan-list">
            {plan.items.map((item, index) => (
              <li key={item.resource.id} className="plan-item">
                <div>
                  <span className="step-label">Step {index + 1}</span>
                  <h4>{item.resource.title}</h4>
                  <p>
                    {formatValue(item.resource.format)} - {formatValue(item.resource.level)} -{" "}
                    {item.resource.durationLabel}
                  </p>
                  <p>
                    Access: {availabilityLabel(item.resource.lowData)} low-data,{" "}
                    {availabilityLabel(item.resource.downloadable)} download
                  </p>
                  <p>Status: {formatValue(item.status)}</p>
                </div>
                <div className="plan-actions" aria-label={`Check in for ${item.resource.title}`}>
                  <button type="button" onClick={() => onCheckIn(item.resource.id, "completed")}>
                    Completed
                  </button>
                  <button type="button" onClick={() => onCheckIn(item.resource.id, "partial")}>
                    Partly completed
                  </button>
                  <button type="button" onClick={() => onCheckIn(item.resource.id, "help")}>
                    I need help
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onMove(item.resource.id, "up")}
                    disabled={index === 0}
                  >
                    Move up
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onMove(item.resource.id, "down")}
                    disabled={index === plan.items.length - 1}
                  >
                    Move down
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onRemove(item.resource.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <button className="secondary-button" type="button" onClick={onResetProgress}>
            Reset learning progress
          </button>
          <p className="field-hint">
            Progress is saved only in this browser on this device.
          </p>
        </>
      )}
    </section>
  );
}

function ResourceCard({ recommendation, isInPlan = false, onAddToPlan }) {
  const { resource, reasons } = recommendation;

  return (
    <article className="resource-card">
      <div className="resource-main">
        <div>
          <p className="provider">{resource.provider}</p>
          {resource.sourceType === "realtime" ? (
            <span className="source-badge">Live web - review metadata</span>
          ) : (
            <span className="source-badge curated">Curated</span>
          )}
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
        {resource.verificationNotes ? (
          <p>
            <strong>Verification:</strong> {resource.verificationNotes}
          </p>
        ) : null}
      </div>

      <div className="match-reasons">
        <h4>Why this matches</h4>
        <ul>
          {reasons.map((reason) => (
            <li key={`${resource.id}-${reason.factor}`}>{reason.message}</li>
          ))}
        </ul>
      </div>

      {onAddToPlan ? (
        <button
          className="secondary-button add-plan-button"
          type="button"
          onClick={() => onAddToPlan(resource)}
          disabled={isInPlan}
        >
          {isInPlan ? "In learning plan" : "Add to learning plan"}
        </button>
      ) : null}
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

function formatRealtimeMessage(message, fallback) {
  const text = String(message || "").trim();

  if (!text) {
    return fallback;
  }

  if (text.toLowerCase().includes("provider key")) {
    return "Live web search is connected in the app, but this environment does not have a server-side search key available.";
  }

  if (text.toLowerCase().includes("needs review") || text.toLowerCase().includes("not curated")) {
    return "These are live web results. AmaLearn has not reviewed their metadata yet.";
  }

  return text;
}

function isResourceInPlan(plan, resourceId) {
  return plan.items.some((item) => item.resource.id === resourceId);
}

function loadSavedPlan() {
  if (typeof window === "undefined" || !window.localStorage) {
    return createEmptyPlan();
  }
  return restorePlan(window.localStorage.getItem(PLAN_STORAGE_KEY));
}

function savePlan(plan) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, serializePlan(plan));
  } catch {
    // Keep the app usable if private browsing or storage limits block persistence.
  }
}
