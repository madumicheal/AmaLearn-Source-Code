const TOPIC_WEIGHT = 46;
const LEVEL_WEIGHT = 20;
const FORMAT_WEIGHT = 24;
const TIME_WEIGHT = 10;
const CONNECTIVITY_WEIGHT = 10;

const topicAliases = {
  "web development": ["html", "css", "javascript", "frontend", "front-end", "web"],
  frontend: ["front-end", "html", "css", "javascript", "react", "web development"],
  backend: ["back-end", "api", "apis", "node", "databases", "server"],
  "full stack": ["full-stack", "frontend", "backend", "javascript", "web development"],
  "full-stack": ["full stack", "frontend", "backend", "javascript", "web development"],
  coding: ["programming", "javascript", "python", "computer science", "code"],
  programming: ["coding", "javascript", "python", "computer science", "code"],
  developer: ["programming", "coding", "software", "web development"],
  maths: ["math", "mathematics", "algebra", "statistics"],
  math: ["maths", "mathematics", "algebra", "statistics"],
  data: ["statistics", "machine learning", "python", "analytics", "sql", "pandas"],
  analyst: ["analytics", "data", "statistics", "sql", "visualization"],
  ai: ["artificial intelligence", "machine learning", "ml"],
  ml: ["machine learning", "ai", "artificial intelligence"],
  api: ["apis", "backend", "node", "server"],
  apis: ["api", "backend", "node", "server"],
  cloud: ["azure", "devops", "infrastructure"],
  devops: ["cloud", "github", "git", "infrastructure"],
  cybersecurity: ["information security", "networking", "online safety", "security"],
  security: ["cybersecurity", "information security", "online safety"],
  github: ["git", "version control", "collaboration"],
  git: ["github", "version control"],
  react: ["frontend", "javascript", "components"],
  offline: ["low-data", "download", "offline learning"],
};

const topicStopwords = new Set([
  "learn",
  "learning",
  "basic",
  "basics",
  "intro",
  "introduction",
  "course",
  "lesson",
  "lessons",
  "resource",
  "resources",
  "study",
]);

export function findRecommendations(catalogue, needs, limit = 6) {
  if (!Array.isArray(catalogue) || catalogue.length === 0) {
    return [];
  }

  const normalizedNeeds = normalizeNeeds(needs);

  const scored = catalogue
    .map((resource) => scoreResource(resource, normalizedNeeds))
    .filter((recommendation) => recommendation.score > 0 && recommendation.topicMatched);

  const formatScoped =
    normalizedNeeds.format === "any"
      ? scored
      : scored.filter((recommendation) =>
          matchesPreferredFormat(recommendation.resource, normalizedNeeds.format),
        );

  return formatScoped
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.resource.title.localeCompare(right.resource.title);
    })
    .slice(0, limit);
}

export function scoreResource(resource, needs) {
  const reasons = [];
  let score = 0;

  const topicScore = scoreTopic(resource, needs.goal);
  score += topicScore * TOPIC_WEIGHT;
  if (topicScore >= 0.8) {
    reasons.push({
      factor: "topic",
      message: `Strong topic fit: tagged with ${resource.topics.slice(0, 3).join(", ")}.`,
    });
  } else if (topicScore > 0) {
    reasons.push({
      factor: "topic",
      message: "Partial topic fit based on related catalogue tags.",
    });
  }

  const levelScore = scoreLevel(resource.level, needs.level);
  score += levelScore * LEVEL_WEIGHT;
  if (levelScore === 1) {
    reasons.push({
      factor: "level",
      message: `Level matches your ${needs.level} preference.`,
    });
  } else if (levelScore >= 0.65) {
    reasons.push({
      factor: "level",
      message: "Level is broad enough to be a reasonable fit.",
    });
  } else if (levelScore > 0) {
    reasons.push({
      factor: "level",
      message: "Level is not exact, so it is ranked lower.",
    });
  }

  const formatScore = scoreFormat(resource, needs.format);
  score += formatScore * FORMAT_WEIGHT;
  if (needs.format === "any") {
    reasons.push({
      factor: "format",
      message: `Format is ${resource.format}; any format was accepted.`,
    });
  } else if (formatScore === 1) {
    reasons.push({
      factor: "format",
      message: `Format matches your ${needs.format} preference.`,
    });
  } else if (formatScore > 0) {
    reasons.push({
      factor: "format",
      message: "Format is related, but not an exact preference match.",
    });
  }

  const timeScore = scoreTime(resource.estimatedMinutes, needs.timeMinutes);
  score += timeScore * TIME_WEIGHT;
  if (timeScore === 1 && resource.estimatedMinutes) {
    reasons.push({
      factor: "time",
      message: `Estimated time fits within ${needs.timeMinutes} minutes.`,
    });
  } else if (timeScore > 0 && resource.estimatedMinutes) {
    reasons.push({
      factor: "time",
      message: "Estimated time is longer than your session, so it is ranked lower.",
    });
  } else {
    reasons.push({
      factor: "time",
      message: "Duration is unknown, so time fit is not assumed.",
    });
  }

  const connectivityScore = scoreConnectivity(resource, needs.connectivity);
  score += connectivityScore * CONNECTIVITY_WEIGHT;
  if (needs.connectivity === "low-data") {
    if (resource.downloadable === true) {
      reasons.push({
        factor: "connectivity",
        message: "Downloadable access is verified in the catalogue.",
      });
    } else if (resource.lowData === true) {
      reasons.push({
        factor: "connectivity",
        message: "Low-data suitability is verified in the catalogue.",
      });
    } else {
      reasons.push({
        factor: "connectivity",
        message: "Low-data suitability is unknown, so this is ranked below verified options.",
      });
    }
  } else {
    reasons.push({
      factor: "connectivity",
      message: "Standard internet was selected, so connectivity is not restrictive.",
    });
  }

  return {
    resource,
    score: Math.round(score),
    topicMatched: topicScore > 0,
    reasons: reasons.slice(0, 5),
  };
}

export function createStudyPath(recommendations, maxSteps = 3) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return [];
  }

  const labels = ["Start here", "Practice next", "Deepen with"];

  return recommendations.slice(0, maxSteps).map((recommendation, index) => ({
    label: labels[index] || `Step ${index + 1}`,
    resource: recommendation.resource,
    reason: buildStudyPathReason(recommendation, index),
  }));
}

function normalizeNeeds(needs = {}) {
  return {
    goal: normalizeText(needs.goal || ""),
    level: needs.level || "beginner",
    timeMinutes: Number(needs.timeMinutes || 30),
    format: needs.format || "any",
    connectivity: needs.connectivity || "standard",
  };
}

function buildStudyPathReason(recommendation, index) {
  const topicReason = recommendation.reasons.find((reason) => reason.factor === "topic");
  const formatReason = recommendation.reasons.find((reason) => reason.factor === "format");

  if (index === 0 && topicReason) {
    return "Use this first because it is the strongest match for the requested topic.";
  }

  if (formatReason) {
    return formatReason.message;
  }

  return "Included because it is one of the highest-ranked catalogue matches.";
}

function scoreTopic(resource, goal) {
  if (!goal) {
    return 0.2;
  }

  const goalTokens = expandTokens(tokenize(goal));
  const searchable = [
    resource.title,
    resource.description,
    resource.provider,
    ...(resource.topics || []),
  ]
    .join(" ")
    .toLowerCase();

  const hits = goalTokens.filter((token) => searchable.includes(token));
  if (hits.length === 0) {
    return 0;
  }

  return Math.min(1, hits.length / Math.min(goalTokens.length, 3));
}

function scoreLevel(resourceLevel, requestedLevel) {
  if (resourceLevel === requestedLevel || resourceLevel === "all-levels") {
    return 1;
  }
  if (resourceLevel === "unknown") {
    return 0.35;
  }

  const order = ["beginner", "intermediate", "advanced"];
  const distance = Math.abs(order.indexOf(resourceLevel) - order.indexOf(requestedLevel));
  if (distance === 1) {
    return 0.5;
  }
  return 0.2;
}

function scoreFormat(resource, requestedFormat) {
  const resourceFormat = resource?.format;
  if (requestedFormat === "any" || resourceFormat === requestedFormat) {
    return 1;
  }
  if (requestedFormat === "download" && resource?.downloadable === true) {
    return 0.75;
  }
  return 0;
}

function matchesPreferredFormat(resource, requestedFormat) {
  if (requestedFormat === "any") {
    return true;
  }
  if (requestedFormat === "download") {
    return resource.format === "download" || resource.downloadable === true;
  }
  return resource.format === requestedFormat;
}

function scoreTime(estimatedMinutes, availableMinutes) {
  if (!estimatedMinutes) {
    return 0;
  }
  if (estimatedMinutes <= availableMinutes) {
    return 1;
  }
  if (estimatedMinutes <= availableMinutes * 2) {
    return 0.55;
  }
  if (estimatedMinutes <= availableMinutes * 4) {
    return 0.25;
  }
  return 0;
}

function scoreConnectivity(resource, connectivity) {
  if (connectivity !== "low-data") {
    return 1;
  }
  if (resource.lowData === true || resource.downloadable === true) {
    return 1;
  }
  if (resource.format === "reading" || resource.format === "download") {
    return 0.45;
  }
  if (resource.lowData === "unknown" || resource.downloadable === "unknown") {
    return 0.15;
  }
  return 0;
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9+]+/)
    .filter((token) => token.length > 1 && !topicStopwords.has(token));
}

function expandTokens(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const aliases = topicAliases[token] || [];
    aliases.forEach((alias) => expanded.add(alias));
  }
  return [...expanded];
}

function normalizeText(value) {
  return String(value).trim().toLowerCase();
}
