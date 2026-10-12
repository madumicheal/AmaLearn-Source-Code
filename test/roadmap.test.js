import test from "node:test";
import assert from "node:assert/strict";
import { projects } from "../src/data/projects.js";
import { createLearningRoadmap, findProjectIdeas } from "../src/lib/roadmap.js";

const pythonRecommendation = {
  resource: {
    id: "python-tutorial",
    title: "The Python Tutorial",
    topics: ["python", "programming"],
    format: "reading",
  },
};

const practiceRecommendation = {
  resource: {
    id: "kaggle-python",
    title: "Python",
    topics: ["python", "data"],
    format: "interactive",
  },
};

test("finds project ideas that match a learner goal and recommendations", () => {
  const matches = findProjectIdeas(
    projects,
    {
      goal: "python basics",
      level: "beginner",
      timeMinutes: 60,
    },
    [pythonRecommendation],
  );

  assert.ok(matches.length > 0);
  assert.match(matches[0].project.id, /python/);
  assert.match(matches[0].reason, /concrete|study window/);
});

test("creates a four-stage learning roadmap from resources and projects", () => {
  const projectIdeas = findProjectIdeas(
    projects,
    {
      goal: "python basics",
      level: "beginner",
      timeMinutes: 60,
    },
    [pythonRecommendation, practiceRecommendation],
  );
  const roadmap = createLearningRoadmap({
    recommendations: [pythonRecommendation, practiceRecommendation],
    projects: projectIdeas,
    plan: { items: [] },
    needs: { goal: "python basics", level: "beginner", timeMinutes: 60 },
  });

  assert.deepEqual(
    roadmap.map((stage) => stage.label),
    ["Foundation", "Practice", "Apply", "Review"],
  );
  assert.equal(roadmap[0].item.title, "The Python Tutorial");
  assert.equal(roadmap[1].item.title, "Python");
  assert.ok(roadmap[2].item.title);
});

test("roadmap handles missing recommendations without inventing resources", () => {
  const roadmap = createLearningRoadmap({
    recommendations: [],
    projects: [],
    plan: { items: [] },
    needs: { goal: "astronomy telescope" },
  });

  assert.equal(roadmap[0].item, null);
  assert.equal(roadmap[2].item, null);
  assert.match(roadmap[0].note, /Search/);
});
