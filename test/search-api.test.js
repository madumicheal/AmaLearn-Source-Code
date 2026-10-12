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

test("api search rejects oversized request bodies before provider work", async () => {
  const response = await handleSearchRequest(
    new Request("https://amalearn.test/api/search", {
      method: "POST",
      body: JSON.stringify({ query: "python", extra: "x".repeat(5000) }),
    }),
    { TAVILY_API_KEY: "test-key" },
  );
  const payload = await response.json();

  assert.equal(response.status, 413);
  assert.equal(payload.error, "Request too large");
});

test("api search rate limits repeated requests without exposing provider secrets", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    calls.push("provider-called");
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const store = new Map();
    const options = {
      rateLimitStore: store,
      now: () => 1000,
      rateLimit: { maxRequests: 2, windowMs: 60_000 },
    };

    const makeRequest = () =>
      new Request("https://amalearn.test/api/search", {
        method: "POST",
        headers: { "CF-Connecting-IP": "203.0.113.10" },
        body: JSON.stringify({ query: "python programming" }),
      });

    assert.equal(
      (await handleSearchRequest(makeRequest(), { TAVILY_API_KEY: "secret-test-key" }, options))
        .status,
      200,
    );
    assert.equal(
      (await handleSearchRequest(makeRequest(), { TAVILY_API_KEY: "secret-test-key" }, options))
        .status,
      200,
    );

    const limited = await handleSearchRequest(
      makeRequest(),
      { TAVILY_API_KEY: "secret-test-key" },
      options,
    );
    const payload = await limited.json();

    assert.equal(limited.status, 429);
    assert.equal(payload.error, "Rate limit exceeded");
    assert.doesNotMatch(JSON.stringify(payload), /secret-test-key/);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("api responses include baseline security headers", async () => {
  const response = await handleSearchRequest(
    new Request("https://amalearn.test/api/search", {
      method: "POST",
      body: JSON.stringify({ query: "biology course" }),
    }),
    {},
  );

  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(response.headers.get("Permissions-Policy"), /camera=\(\)/);
  assert.match(response.headers.get("Content-Security-Policy"), /default-src 'self'/);
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
      {
        title: "Localhost result",
        url: "https://localhost/private",
        description: "Localhost and private network targets should not be shown as resources.",
      },
      {
        title: "Credential URL",
        url: "https://user:pass@example.edu/private",
        description: "URLs containing embedded credentials should not be shown to learners.",
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
