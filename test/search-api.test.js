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

test("api search sends preferred format terms to the realtime provider", async () => {
  let providerQuery = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    providerQuery = JSON.parse(init.body).query;
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const response = await handleSearchRequest(
      new Request("https://amalearn.test/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "python programming", format: "video" }),
      }),
      { TAVILY_API_KEY: "test-key" },
      { rateLimitStore: new Map() },
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.requestedFormat, "video");
    assert.match(providerQuery, /video lesson lecture tutorial YouTube/);
    assert.match(payload.searchedFor, /video lesson lecture tutorial YouTube/);
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

test("normalizes realtime search results according to video preference", () => {
  const resources = normalizeSearchResults(
    [
      {
        title: "Python loops video lesson",
        url: "https://www.youtube.com/watch?v=lesson",
        description: "A clear video lesson for learning Python loops with worked examples.",
      },
      {
        title: "Python loops blog post",
        url: "https://example.com/blog/python-loops",
        description: "A blog post article about Python loops and common beginner mistakes.",
      },
    ],
    "python loops",
    "test",
    "video",
  );

  assert.equal(resources.length, 1);
  assert.equal(resources[0].format, "video");
  assert.equal(resources[0].provider, "youtube.com");
});

test("video search rejects unrelated pages that only mention video", () => {
  const resources = normalizeSearchResults(
    [
      {
        title: "Brazil: Man Hospitalized After DIY Nose Job. YouTube Bans Rhinoplasty Tutorial.",
        url: "https://www.businessinsider.com/man-hospitalized-after-diy-nose-job-youtube-tutorial",
        description:
          "A report about a removed YouTube tutorial and a medical incident unrelated to learning MIT App Inventor.",
      },
      {
        title: "MIT App Inventor beginner video tutorial",
        url: "https://www.youtube.com/watch?v=appinventorlesson",
        description:
          "A beginner video lesson that teaches MIT App Inventor basics and app building concepts.",
      },
    ],
    "MIT App Inventor",
    "test",
    "video",
  );

  assert.equal(resources.length, 1);
  assert.equal(resources[0].provider, "youtube.com");
  assert.match(resources[0].title, /MIT App Inventor/);
});

test("realtime search rejects weak single-word topic matches", () => {
  const resources = normalizeSearchResults(
    [
      {
        title: "Best mobile app design news",
        url: "https://example.com/news/mobile-app-design",
        description: "A news item about mobile app design trends without the requested course material.",
      },
    ],
    "app inventor",
    "test",
    "reading",
  );

  assert.equal(resources.length, 0);
});

test("normalizes realtime search results according to download preference", () => {
  const resources = normalizeSearchResults(
    [
      {
        title: "Statistics workbook PDF",
        url: "https://example.edu/statistics-workbook.pdf",
        description: "A downloadable PDF workbook with statistics exercises for learners.",
      },
      {
        title: "Statistics news article",
        url: "https://example.edu/news/statistics-for-schools",
        description: "A news article about statistics education and classroom resources.",
      },
    ],
    "statistics workbook",
    "test",
    "download",
  );

  assert.equal(resources.length, 1);
  assert.equal(resources[0].format, "download");
  assert.equal(resources[0].downloadable, true);
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
