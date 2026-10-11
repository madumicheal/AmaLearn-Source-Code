import test from "node:test";
import assert from "node:assert/strict";
import {
  addResourceToPlan,
  createEmptyPlan,
  getNextActivity,
  moveResourceInPlan,
  recordCheckIn,
  removeResourceFromPlan,
  restorePlan,
  serializePlan,
  suggestNextStep,
  summarizeProgress,
} from "../src/lib/learningPlan.js";

const python = {
  id: "python-tutorial",
  title: "The Python Tutorial",
  url: "https://docs.python.org/3/tutorial/",
  provider: "Python Software Foundation",
  description: "Official Python tutorial.",
  topics: ["python", "programming"],
  level: "beginner",
  format: "reading",
  estimatedMinutes: null,
  durationLabel: "Unknown",
  language: "English",
  lowData: "unknown",
  downloadable: "unknown",
  accessibilityNotes: "Unknown",
  lastChecked: "2026-10-11",
};

const kaggle = {
  ...python,
  id: "kaggle-python",
  title: "Python",
  url: "https://www.kaggle.com/learn/python",
  provider: "Kaggle Learn",
  format: "interactive",
  estimatedMinutes: 20,
  durationLabel: "20 minutes",
};

const advanced = {
  ...python,
  id: "advanced-python",
  title: "Advanced Python Patterns",
  level: "advanced",
  format: "course",
  estimatedMinutes: 120,
};

test("creates, deduplicates, summarizes, and removes learning plan items", () => {
  const empty = createEmptyPlan();
  const withPython = addResourceToPlan(empty, python, "2026-10-11T21:00:00.000Z");
  const deduped = addResourceToPlan(withPython, python, "2026-10-11T21:01:00.000Z");
  const withKaggle = addResourceToPlan(deduped, kaggle, "2026-10-11T21:02:00.000Z");

  assert.equal(withKaggle.items.length, 2);
  assert.equal(getNextActivity(withKaggle).resource.id, "python-tutorial");
  assert.deepEqual(summarizeProgress(withKaggle), {
    total: 2,
    completed: 0,
    inProgress: 0,
    planned: 2,
  });

  const removed = removeResourceFromPlan(withKaggle, "python-tutorial");
  assert.equal(removed.items.length, 1);
  assert.equal(removed.items[0].resource.id, "kaggle-python");
});

test("moves resources to adjust the learning sequence", () => {
  const plan = addResourceToPlan(
    addResourceToPlan(createEmptyPlan(), python, "2026-10-11T21:00:00.000Z"),
    kaggle,
    "2026-10-11T21:01:00.000Z",
  );

  const movedUp = moveResourceInPlan(plan, "kaggle-python", "up");
  assert.equal(movedUp.items[0].resource.id, "kaggle-python");

  const movedDown = moveResourceInPlan(movedUp, "kaggle-python", "down");
  assert.equal(movedDown.items[1].resource.id, "kaggle-python");
});

test("records completed, partial, and help check-ins", () => {
  let plan = addResourceToPlan(createEmptyPlan(), python, "2026-10-11T21:00:00.000Z");

  plan = recordCheckIn(plan, "python-tutorial", "completed", "easy", "2026-10-11T21:10:00.000Z");
  assert.equal(plan.items[0].status, "completed");
  assert.equal(plan.items[0].lastOutcome, "completed");

  plan = recordCheckIn(plan, "python-tutorial", "partial", "hard", "2026-10-11T21:20:00.000Z");
  assert.equal(plan.items[0].status, "in-progress");
  assert.equal(plan.items[0].lastOutcome, "partial");

  plan = recordCheckIn(plan, "python-tutorial", "help", "", "2026-10-11T21:30:00.000Z");
  assert.equal(plan.items[0].status, "in-progress");
  assert.equal(plan.items[0].lastOutcome, "help");
  assert.equal(plan.items[0].checkIns.length, 3);
});

test("suggests transparent next steps for each check-in outcome", () => {
  const plan = addResourceToPlan(
    addResourceToPlan(createEmptyPlan(), python, "2026-10-11T21:00:00.000Z"),
    advanced,
    "2026-10-11T21:01:00.000Z",
  );
  const recommendations = [{ resource: kaggle }, { resource: advanced }];

  const completed = suggestNextStep({
    plan,
    resourceId: "python-tutorial",
    outcome: "completed",
    recommendations,
    needs: { timeMinutes: 30 },
  });
  assert.equal(completed.type, "advance");
  assert.equal(completed.resource.id, "advanced-python");
  assert.match(completed.message, /completed/);

  const partial = suggestNextStep({
    plan,
    resourceId: "python-tutorial",
    outcome: "partial",
    recommendations,
    needs: { timeMinutes: 30 },
  });
  assert.equal(partial.type, "shorter");
  assert.equal(partial.resource.id, "kaggle-python");
  assert.match(partial.message, /shorter activity/);

  const help = suggestNextStep({
    plan,
    resourceId: "advanced-python",
    outcome: "help",
    recommendations,
    needs: { timeMinutes: 30 },
  });
  assert.equal(help.type, "support");
  assert.equal(help.resource.id, "kaggle-python");
  assert.match(help.message, /needed help/);
});

test("saves, restores, and tolerates malformed stored plan data", () => {
  const plan = addResourceToPlan(createEmptyPlan(), python, "2026-10-11T21:00:00.000Z");
  const restored = restorePlan(serializePlan(plan));

  assert.equal(restored.items.length, 1);
  assert.equal(restored.items[0].resource.title, "The Python Tutorial");
  assert.deepEqual(restorePlan("{not-json"), createEmptyPlan());
  assert.deepEqual(restorePlan(JSON.stringify({ items: [{ resource: {} }] })), createEmptyPlan());
});
