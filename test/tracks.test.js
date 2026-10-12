import test from "node:test";
import assert from "node:assert/strict";
import { resources } from "../src/data/resources.js";
import { learningTracks, trackCategories } from "../src/data/tracks.js";
import { findRecommendations } from "../src/lib/matcher.js";

test("expanded catalogue has enough curated coverage for phase 1 tracks", () => {
  assert.ok(resources.length >= 50);
  assert.ok(learningTracks.length >= 16);
});

test("tracks reference valid categories and curated resources", () => {
  const categoryIds = new Set(trackCategories.map((category) => category.id));
  const resourceIds = new Set(resources.map((resource) => resource.id));

  learningTracks.forEach((track) => {
    assert.ok(categoryIds.has(track.category), `${track.id} has a valid category`);
    assert.ok(track.resourceIds.length >= 3, `${track.id} has at least three resource suggestions`);

    track.resourceIds.forEach((resourceId) => {
      assert.ok(resourceIds.has(resourceId), `${track.id} references ${resourceId}`);
    });
  });
});

test("each track produces catalogue recommendations from its learning goal", () => {
  learningTracks.forEach((track) => {
    const recommendations = findRecommendations(resources, {
      goal: track.goal,
      level: track.level,
      timeMinutes: Number(track.timeMinutes),
      format: track.format,
      connectivity: track.connectivity,
    });

    assert.ok(recommendations.length > 0, `${track.id} should have at least one match`);
  });
});
