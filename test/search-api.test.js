import test from "node:test";
import assert from "node:assert/strict";
import { handleSearchRequest, normalizeSearchResults } from "../src/server/search.js";

test("api search reports missing provider configuration without exposing secrets", async () => {
  const response = await handleSearchRequest(
    new Request("https://amalearn.test/api/search", {
      method: "POST",
      body: JSON.stringify({ query: "biology course" }),
    }),
    {},
  );
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.error, "Search provider not configured");
  assert.deepEqual(payload.setup.requiredEnvironmentVariables, ["BRAVE_SEARCH_API_KEY"]);
});

test("api search validates short queries", async () => {
  const response = await handleSearchRequest(
    new Request("https://amalearn.test/api/search", {
      method: "POST",
      body: JSON.stringify({ query: "a" }),
    }),
    {},
  );

  assert.equal(response.status, 400);
});

test("normalizes realtime search results into AmaLearn resources", () => {
  const resources = normalizeSearchResults(
    [
      {
        title: "Biology library",
        url: "https://example.edu/biology",
        description: "Open biology lessons, course readings, and practice resources for learners.",
      },
      {
        title: "Duplicate Biology library",
        url: "https://example.edu/biology",
        description: "Duplicate URL should be removed from realtime search results.",
      },
      {
        title: "Bad URL",
        url: "javascript:alert(1)",
        description: "This should never appear.",
      },
    ],
    "biology course",
    "test",
  );

  assert.equal(resources.length, 1);
  assert.equal(resources[0].sourceType, "realtime");
  assert.equal(resources[0].curationStatus, "needs-review");
  assert.equal(resources[0].provider, "example.edu");
  assert.equal(resources[0].durationLabel, "Unknown");
});
