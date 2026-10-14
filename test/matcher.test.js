import test from "node:test";
import assert from "node:assert/strict";
import { resources } from "../src/data/resources.js";
import { createStudyPath, findRecommendations } from "../src/lib/matcher.js";
import { validateResources } from "../src/lib/validateResources.js";

test("catalogue records satisfy the required schema", () => {
  assert.deepEqual(validateResources(resources), []);
});

test("matching is deterministic for identical input", () => {
  const needs = {
    goal: "learn python basics",
    level: "beginner",
    timeMinutes: 60,
    format: "reading",
    connectivity: "standard",
  };

  assert.deepEqual(findRecommendations(resources, needs), findRecommendations(resources, needs));
});

test("topic changes affect the top recommendation", () => {
  const pythonTop = findRecommendations(resources, {
    goal: "python programming",
    level: "beginner",
    timeMinutes: 60,
    format: "reading",
    connectivity: "standard",
  })[0].resource.id;

  const algebraTop = findRecommendations(resources, {
    goal: "algebra equations",
    level: "beginner",
    timeMinutes: 60,
    format: "interactive",
    connectivity: "standard",
  })[0].resource.id;

  assert.notEqual(pythonTop, algebraTop);
  assert.match(pythonTop, /python|mit|kaggle/);
  assert.match(algebraTop, /algebra/);
});

test("format preference can change ranking", () => {
  const readingTop = findRecommendations(resources, {
    goal: "web development",
    level: "beginner",
    timeMinutes: 60,
    format: "reading",
    connectivity: "standard",
  })[0].resource.id;

  const interactiveTop = findRecommendations(resources, {
    goal: "web development",
    level: "beginner",
    timeMinutes: 60,
    format: "interactive",
    connectivity: "standard",
  })[0].resource.id;

  assert.notEqual(readingTop, interactiveTop);
});

test("format preference scopes catalogue recommendations", () => {
  const courseRecommendations = findRecommendations(resources, {
    goal: "python programming",
    level: "beginner",
    timeMinutes: 60,
    format: "course",
    connectivity: "standard",
  });

  assert.ok(courseRecommendations.length > 0);
  assert.ok(courseRecommendations.every((item) => item.resource.format === "course"));
});

test("video preference does not fall back to reading when no curated videos match", () => {
  const recommendations = findRecommendations(resources, {
    goal: "python programming",
    level: "beginner",
    timeMinutes: 60,
    format: "video",
    connectivity: "standard",
  });

  assert.deepEqual(recommendations, []);
});

test("low-data preference lifts verified downloadable resources", () => {
  const top = findRecommendations(resources, {
    goal: "statistics",
    level: "intermediate",
    timeMinutes: 60,
    format: "reading",
    connectivity: "low-data",
  })[0];

  assert.equal(top.resource.downloadable, true);
  assert.ok(top.reasons.some((reason) => reason.factor === "connectivity"));
});

test("empty catalogue returns no recommendations", () => {
  assert.deepEqual(
    findRecommendations([], {
      goal: "python",
      level: "beginner",
      timeMinutes: 30,
      format: "any",
      connectivity: "standard",
    }),
    [],
  );
});

test("unrelated goals do not return preference-only matches", () => {
  assert.deepEqual(
    findRecommendations(resources, {
      goal: "astronomy telescope",
      level: "beginner",
      timeMinutes: 30,
      format: "any",
      connectivity: "standard",
    }),
    [],
  );
});

test("study path is grounded in ranked recommendations", () => {
  const recommendations = findRecommendations(resources, {
    goal: "python programming",
    level: "beginner",
    timeMinutes: 60,
    format: "reading",
    connectivity: "standard",
  });

  const path = createStudyPath(recommendations);

  assert.equal(path.length, 3);
  assert.equal(path[0].resource.id, recommendations[0].resource.id);
  assert.equal(path[1].resource.id, recommendations[1].resource.id);
  assert.match(path[0].reason, /strongest match|highest-ranked|Format|format/);
});
