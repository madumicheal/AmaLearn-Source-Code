export const PLAN_STORAGE_KEY = "amalearn.learningPlan.v1";

export const emptyPlan = {
  version: 1,
  items: [],
};

const allowedOutcomes = new Set(["completed", "partial", "help"]);
const allowedDifficulties = new Set(["", "easy", "ok", "hard"]);

export function createEmptyPlan() {
  return { ...emptyPlan, items: [] };
}

export function addResourceToPlan(plan, resource, now = new Date().toISOString()) {
  const currentPlan = normalizePlan(plan);
  if (!resource?.id || currentPlan.items.some((item) => item.resource.id === resource.id)) {
    return currentPlan;
  }

  return {
    ...currentPlan,
    items: [
      ...currentPlan.items,
      {
        id: `plan-${resource.id}`,
        resource: snapshotResource(resource),
        status: "planned",
        addedAt: now,
        checkIns: [],
      },
    ],
  };
}

export function removeResourceFromPlan(plan, resourceId) {
  const currentPlan = normalizePlan(plan);
  return {
    ...currentPlan,
    items: currentPlan.items.filter((item) => item.resource.id !== resourceId),
  };
}

export function moveResourceInPlan(plan, resourceId, direction) {
  const currentPlan = normalizePlan(plan);
  const index = currentPlan.items.findIndex((item) => item.resource.id === resourceId);
  if (index < 0) {
    return currentPlan;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= currentPlan.items.length) {
    return currentPlan;
  }

  const items = [...currentPlan.items];
  const [item] = items.splice(index, 1);
  items.splice(targetIndex, 0, item);

  return {
    ...currentPlan,
    items,
  };
}

export function recordCheckIn(
  plan,
  resourceId,
  outcome,
  difficulty = "",
  now = new Date().toISOString(),
) {
  const currentPlan = normalizePlan(plan);
  if (!allowedOutcomes.has(outcome)) {
    return currentPlan;
  }

  const safeDifficulty = allowedDifficulties.has(difficulty) ? difficulty : "";

  return {
    ...currentPlan,
    items: currentPlan.items.map((item) => {
      if (item.resource.id !== resourceId) {
        return item;
      }

      return {
        ...item,
        status: outcome === "completed" ? "completed" : "in-progress",
        lastOutcome: outcome,
        lastDifficulty: safeDifficulty,
        lastCheckedInAt: now,
        checkIns: [
          ...item.checkIns,
          {
            outcome,
            difficulty: safeDifficulty,
            checkedInAt: now,
          },
        ],
      };
    }),
  };
}

export function getNextActivity(plan) {
  const currentPlan = normalizePlan(plan);
  return currentPlan.items.find((item) => item.status !== "completed") || null;
}

export function summarizeProgress(plan) {
  const currentPlan = normalizePlan(plan);
  const total = currentPlan.items.length;
  const completed = currentPlan.items.filter((item) => item.status === "completed").length;
  const inProgress = currentPlan.items.filter((item) => item.status === "in-progress").length;

  return {
    total,
    completed,
    inProgress,
    planned: total - completed - inProgress,
  };
}

export function suggestNextStep({ plan, resourceId, outcome, difficulty = "", recommendations = [], needs = {} }) {
  const currentPlan = normalizePlan(plan);
  const currentItem = currentPlan.items.find((item) => item.resource.id === resourceId) || null;
  const nextPlanned = currentPlan.items.find(
    (item) => item.resource.id !== resourceId && item.status !== "completed",
  );
  const candidateRecommendations = recommendations
    .map((recommendation) => recommendation.resource || recommendation)
    .filter(Boolean)
    .filter((resource) => resource.id !== resourceId);

  if (outcome === "completed") {
    const nextResource = nextPlanned?.resource || firstOutsidePlan(candidateRecommendations, currentPlan);
    if (nextResource) {
      return {
        type: "advance",
        resource: nextResource,
        message:
          difficulty === "hard"
            ? "You completed the session, but marked it hard. Move forward gently and keep the next activity manageable."
            : "Suggested because you completed the previous session and this is the next relevant activity.",
      };
    }

    return {
      type: "discover",
      resource: null,
      message: "You completed the plan. Search a related goal when you are ready for another step.",
    };
  }

  if (outcome === "partial") {
    const shorter = findShorterCandidate(candidateRecommendations, currentPlan, Number(needs.timeMinutes || 30));
    return {
      type: shorter ? "shorter" : "continue",
      resource: shorter || currentItem?.resource || null,
      message: shorter
        ? `Suggested because you made progress but may need a shorter activity that fits your ${needs.timeMinutes || 30}-minute study window.`
        : "Suggested because you made progress but may need more time with the same resource.",
    };
  }

  if (outcome === "help") {
    const support = findSupportCandidate(candidateRecommendations, currentPlan, currentItem?.resource);
    return {
      type: support ? "support" : "review",
      resource: support || currentItem?.resource || null,
      message: support
        ? "Suggested because you needed help, so AmaLearn looked for a simpler or alternative-format resource."
        : "Suggested because you needed help. Review the current resource slowly or search for a beginner-friendly alternative.",
    };
  }

  return {
    type: "none",
    resource: getNextActivity(currentPlan)?.resource || null,
    message: "Add resources to your plan and check in after a session to get a suggested next step.",
  };
}

export function restorePlan(rawValue) {
  if (!rawValue) {
    return createEmptyPlan();
  }

  try {
    return normalizePlan(JSON.parse(rawValue));
  } catch {
    return createEmptyPlan();
  }
}

export function serializePlan(plan) {
  return JSON.stringify(normalizePlan(plan));
}

function normalizePlan(plan) {
  if (!plan || !Array.isArray(plan.items)) {
    return createEmptyPlan();
  }

  return {
    version: 1,
    items: plan.items
      .filter((item) => item?.resource?.id && item?.resource?.title)
      .map((item) => ({
        id: item.id || `plan-${item.resource.id}`,
        resource: snapshotResource(item.resource),
        status: ["planned", "in-progress", "completed"].includes(item.status)
          ? item.status
          : "planned",
        addedAt: typeof item.addedAt === "string" ? item.addedAt : "",
        lastOutcome: allowedOutcomes.has(item.lastOutcome) ? item.lastOutcome : undefined,
        lastDifficulty: allowedDifficulties.has(item.lastDifficulty) ? item.lastDifficulty : "",
        lastCheckedInAt:
          typeof item.lastCheckedInAt === "string" ? item.lastCheckedInAt : undefined,
        checkIns: Array.isArray(item.checkIns)
          ? item.checkIns
              .filter((checkIn) => allowedOutcomes.has(checkIn?.outcome))
              .map((checkIn) => ({
                outcome: checkIn.outcome,
                difficulty: allowedDifficulties.has(checkIn.difficulty) ? checkIn.difficulty : "",
                checkedInAt:
                  typeof checkIn.checkedInAt === "string" ? checkIn.checkedInAt : "",
              }))
          : [],
      })),
  };
}

function snapshotResource(resource) {
  return {
    id: resource.id,
    title: resource.title,
    url: resource.url,
    provider: resource.provider,
    description: resource.description,
    topics: Array.isArray(resource.topics) ? resource.topics.slice(0, 8) : [],
    level: resource.level || "unknown",
    format: resource.format || "other",
    estimatedMinutes: Number.isInteger(resource.estimatedMinutes) ? resource.estimatedMinutes : null,
    durationLabel: resource.durationLabel || "Unknown",
    language: resource.language || "Unknown",
    lowData: validAvailability(resource.lowData),
    downloadable: validAvailability(resource.downloadable),
    accessibilityNotes: resource.accessibilityNotes || "Unknown",
    lastChecked: resource.lastChecked || "Unknown",
    sourceType: resource.sourceType || "curated",
    curationStatus: resource.curationStatus || "curated",
    verificationNotes: resource.verificationNotes || "",
  };
}

function validAvailability(value) {
  return [true, false, "unknown"].includes(value) ? value : "unknown";
}

function firstOutsidePlan(resources, plan) {
  const plannedIds = new Set(plan.items.map((item) => item.resource.id));
  return resources.find((resource) => !plannedIds.has(resource.id)) || null;
}

function findShorterCandidate(resources, plan, timeMinutes) {
  const plannedIds = new Set(plan.items.map((item) => item.resource.id));
  return (
    resources.find(
      (resource) =>
        !plannedIds.has(resource.id) &&
        Number.isInteger(resource.estimatedMinutes) &&
        resource.estimatedMinutes <= timeMinutes,
    ) || null
  );
}

function findSupportCandidate(resources, plan, currentResource) {
  const plannedIds = new Set(plan.items.map((item) => item.resource.id));
  return (
    resources.find((resource) => {
      if (plannedIds.has(resource.id)) {
        return false;
      }
      if (resource.level === "beginner" || resource.level === "all-levels") {
        return true;
      }
      return currentResource && resource.format !== currentResource.format;
    }) || null
  );
}
