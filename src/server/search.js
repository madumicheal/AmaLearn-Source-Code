const MAX_QUERY_LENGTH = 160;
const MAX_REQUEST_BODY_BYTES = 4096;
const MAX_RESULTS = 8;
const DEFAULT_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60_000,
};

const defaultRateLimitStore = new Map();

const providerDocs = {
  brave: "https://api-dashboard.search.brave.com/app/documentation/web-search",
  tavily: "https://help.tavily.com/articles/4840311948-tavily-search-api",
  google: "https://developers.google.com/custom-search/v1",
};

export async function handleSearchRequest(request, env = {}, options = {}) {
  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
        message: "Use POST /api/search with a JSON body.",
      },
      405,
      { Allow: "POST" },
    );
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonResponse(
        {
          error: "Request too large",
          message: `Keep realtime search requests under ${MAX_REQUEST_BODY_BYTES} bytes.`,
        },
        413,
      );
    }

    return jsonResponse(
      {
        error: "Invalid JSON",
        message: "Send a valid JSON body with a query field.",
      },
      400,
    );
  }

  const query = normalizeQuery(body.query || body.goal || "");
  if (query.length < 2) {
    return jsonResponse(
      {
        error: "Missing query",
        message: "Enter a subject, course, or learning goal to search.",
      },
      400,
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return jsonResponse(
      {
        error: "Query too long",
        message: `Keep realtime searches under ${MAX_QUERY_LENGTH} characters.`,
      },
      400,
    );
  }

  const limit = checkRateLimit(request, options);
  if (!limit.allowed) {
    return jsonResponse(
      {
        error: "Rate limit exceeded",
        message: "Too many realtime searches. Wait a moment before trying again.",
      },
      429,
      {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      },
    );
  }

  const provider = chooseProvider(env);
  if (!provider) {
    return jsonResponse(
      {
        error: "Search provider not configured",
        message:
          "Realtime search is wired through /api/search, but no server-side search provider key is configured yet.",
        setup: {
          recommendedProvider: "brave",
          requiredEnvironmentVariables: ["BRAVE_SEARCH_API_KEY"],
          alternatives: [
            {
              provider: "tavily",
              requiredEnvironmentVariables: ["TAVILY_API_KEY"],
            },
            {
              provider: "google",
              requiredEnvironmentVariables: ["GOOGLE_SEARCH_API_KEY", "GOOGLE_SEARCH_CX"],
            },
          ],
          docs: providerDocs,
        },
      },
      503,
    );
  }

  try {
    const rawResults = await provider.search(buildLearningQuery(query), env);
    const resources = normalizeSearchResults(rawResults, query, provider.name);

    return jsonResponse({
      source: "realtime",
      provider: provider.name,
      query,
      searchedFor: buildLearningQuery(query),
      count: resources.length,
      results: resources,
      notice:
        "Realtime results are not curated yet. AmaLearn marks unverifiable metadata as unknown until reviewed.",
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Search failed",
        message:
          error instanceof Error
            ? error.message
            : "The realtime search provider did not return usable results.",
      },
      502,
    );
  }
}

export function normalizeSearchResults(rawResults, originalQuery, providerName = "realtime") {
  const seen = new Set();
  const queryTopics = extractTopics(originalQuery);

  return rawResults
    .map((result, index) => normalizeSearchResult(result, index, queryTopics, providerName))
    .filter(Boolean)
    .filter((resource) => {
      const key = resource.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RESULTS);
}

function normalizeSearchResult(result, index, queryTopics, providerName) {
  const title = cleanText(result.title);
  const url = cleanText(result.url);
  const description = cleanText(result.description || result.snippet || result.content);

  if (!title || !isSafeResourceUrl(url) || description.length < 24) {
    return null;
  }

  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const topics = [...new Set([...queryTopics, ...extractTopics(`${title} ${description}`)])].slice(0, 8);

  return {
    id: `realtime-${providerName}-${index + 1}-${slugify(hostname)}-${slugify(title).slice(0, 32)}`,
    title,
    url,
    provider: hostname,
    description,
    topics: topics.length > 0 ? topics : ["realtime search"],
    level: "unknown",
    format: inferFormat(url, title, description),
    estimatedMinutes: null,
    durationLabel: "Unknown",
    language: "Unknown",
    lowData: "unknown",
    downloadable: inferDownloadable(url),
    accessibilityNotes: "Unknown",
    lastChecked: new Date().toISOString().slice(0, 10),
    sourceType: "realtime",
    curationStatus: "needs-review",
    verificationNotes: `Imported from ${providerName} realtime search. Metadata needs review before curation.`,
  };
}

function chooseProvider(env) {
  if (env.BRAVE_SEARCH_API_KEY) {
    return { name: "brave", search: searchBrave };
  }
  if (env.TAVILY_API_KEY) {
    return { name: "tavily", search: searchTavily };
  }
  if (env.GOOGLE_SEARCH_API_KEY && env.GOOGLE_SEARCH_CX) {
    return { name: "google", search: searchGoogle };
  }
  return null;
}

async function searchBrave(query, env) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(MAX_RESULTS));
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("country", "US");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search returned ${response.status}.`);
  }

  const data = await response.json();
  return (data.web?.results || []).map((item) => ({
    title: item.title,
    url: item.url,
    description: item.description,
  }));
}

async function searchTavily(query, env) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: MAX_RESULTS,
      search_depth: "basic",
      include_answer: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily returned ${response.status}.`);
  }

  const data = await response.json();
  return (data.results || []).map((item) => ({
    title: item.title,
    url: item.url,
    description: item.content,
  }));
}

async function searchGoogle(query, env) {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", env.GOOGLE_SEARCH_API_KEY);
  url.searchParams.set("cx", env.GOOGLE_SEARCH_CX);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(MAX_RESULTS));

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Google Custom Search returned ${response.status}.`);
  }

  const data = await response.json();
  return (data.items || []).map((item) => ({
    title: item.title,
    url: item.link,
    description: item.snippet,
  }));
}

function buildLearningQuery(query) {
  return `${query} course tutorial open educational resource learning resource`;
}

function normalizeQuery(value) {
  return cleanText(value).slice(0, MAX_QUERY_LENGTH + 1);
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_REQUEST_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  return JSON.parse(text);
}

class RequestBodyTooLargeError extends Error {}

function checkRateLimit(request, options = {}) {
  const rateLimit = {
    ...DEFAULT_RATE_LIMIT,
    ...(options.rateLimit || {}),
  };

  if (!rateLimit.maxRequests || rateLimit.maxRequests < 1) {
    return { allowed: true, retryAfterMs: 0 };
  }

  const store = options.rateLimitStore || defaultRateLimitStore;
  const now = options.now ? options.now() : Date.now();
  const key = rateLimitKeyFor(request);
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + rateLimit.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (current.count >= rateLimit.maxRequests) {
    return { allowed: false, retryAfterMs: Math.max(1000, current.resetAt - now) };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterMs: 0 };
}

function rateLimitKeyFor(request) {
  const forwardedFor = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim().toLowerCase();
  }
  return "anonymous";
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isSafeResourceUrl(value) {
  if (!isHttpUrl(value)) {
    return false;
  }

  const parsed = new URL(value);
  const hostname = parsed.hostname.toLowerCase();

  if (parsed.username || parsed.password) {
    return false;
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  ) {
    return false;
  }

  if (isPrivateIpv4(hostname)) {
    return false;
  }

  return hostname.includes(".");
}

function isPrivateIpv4(hostname) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }

  const octets = hostname.split(".").map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function inferFormat(url, title, description) {
  const value = `${url} ${title} ${description}`.toLowerCase();
  if (value.includes("youtube.com") || value.includes("video")) {
    return "video";
  }
  if (value.endsWith(".pdf") || value.includes("filetype:pdf")) {
    return "download";
  }
  if (value.includes("course") || value.includes("certification")) {
    return "course";
  }
  if (value.includes("interactive") || value.includes("exercise")) {
    return "interactive";
  }
  return "other";
}

function inferDownloadable(url) {
  return url.toLowerCase().endsWith(".pdf") ? true : "unknown";
}

function extractTopics(value) {
  return cleanText(value)
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((token) => token.length > 2)
    .filter((token) => !topicStopwords.has(token))
    .slice(0, 10);
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function securityHeaders() {
  return {
    "Content-Security-Policy":
      "default-src 'self'; connect-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...securityHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

const topicStopwords = new Set([
  "about",
  "after",
  "and",
  "are",
  "best",
  "course",
  "for",
  "from",
  "how",
  "learn",
  "learning",
  "lesson",
  "open",
  "resource",
  "resources",
  "the",
  "this",
  "tutorial",
  "with",
]);
