const stageDefinitions = [
  {
    id: "foundation",
    label: "Foundation",
    description: "Start with the clearest explanation or reference.",
  },
  {
    id: "practice",
    label: "Practice",
    description: "Reinforce the idea with an exercise or interactive resource.",
  },
  {
    id: "apply",
    label: "Apply",
    description: "Build or solve something small enough to finish.",
  },
  {
    id: "review",
    label: "Review",
    description: "Check progress and adapt the next step.",
  },
];

const stopwords = new Set([
  "learn",
  "learning",
  "course",
  "resource",
  "resources",
  "basic",
  "basics",
  "intro",
  "introduction",
  "study",
  "project",
  "help",
]);

export function findProjectIdeas(projects, needs = {}, recommendations = [], limit = 3) {
  const tokens = tokenize(needs.goal);
  const recommendationTopics = recommendations.flatMap((recommendation) => recommendation.resource?.topics || []);
  const topicTokens = [...tokens, ...recommendationTopics.map((topic) => normalize(topic))].filter(Boolean);

  return projects
    .map((project) => ({
      project,
      score: scoreProject(project, topicTokens, needs),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.project.estimatedMinutes - right.project.estimatedMinutes;
    })
    .slice(0, limit)
    .map((match) => ({
      ...match,
      reason: buildProjectReason(match.project, needs),
    }));
}

export function createLearningRoadmap({ recommendations = [], projects = [], plan, needs = {} }) {
  const foundation = chooseFoundation(recommendations);
  const practice = choosePractice(recommendations, foundation?.resource.id);
  const apply = projects[0]?.project || null;
  const review = chooseReview(plan, recommendations);

  return stageDefinitions.map((stage) => {
    if (stage.id === "foundation") {
      return {
        ...stage,
        item: foundation?.resource || null,
        itemType: "resource",
        note: foundation
          ? "Chosen as a strong starting point from the current recommendations."
          : "Search for a topic to choose a foundation resource.",
      };
    }

    if (stage.id === "practice") {
      return {
        ...stage,
        item: practice?.resource || null,
        itemType: "resource",
        note: practice
          ? "Chosen to give you practice after the foundation step."
          : "Add or discover another resource to create a practice step.",
      };
    }

    if (stage.id === "apply") {
      return {
        ...stage,
        item: apply,
        itemType: "project",
        note: apply
          ? "Suggested as a small project tied to your topic."
          : "No matching practice project is available yet.",
      };
    }

    return {
      ...stage,
      item: review,
      itemType: review ? "resource" : "check-in",
      note: review
        ? "Use check-ins after this activity to adapt the next step."
        : "Check in after a planned session to decide whether to continue, get help, or move forward.",
    };
  });
}

function chooseFoundation(recommendations) {
  return (
    recommendations.find((recommendation) =>
      ["reading", "course"].includes(recommendation.resource.format),
    ) ||
    recommendations[0] ||
    null
  );
}

function choosePractice(recommendations, excludedId) {
  return (
    recommendations.find(
      (recommendation) =>
        recommendation.resource.id !== excludedId &&
        ["interactive", "video", "download"].includes(recommendation.resource.format),
    ) ||
    recommendations.find((recommendation) => recommendation.resource.id !== excludedId) ||
    null
  );
}

function chooseReview(plan, recommendations) {
  const nextPlanned = plan?.items?.find((item) => item.status !== "completed");
  if (nextPlanned) {
    return nextPlanned.resource;
  }

  return recommendations[2]?.resource || null;
}

function scoreProject(project, topicTokens, needs) {
  const searchable = [
    project.title,
    project.description,
    project.deliverable,
    ...(project.topics || []),
  ]
    .join(" ")
    .toLowerCase();
  let score = topicTokens.filter((token) => searchable.includes(token)).length * 8;

  if (project.level === needs.level || project.level === "beginner") {
    score += 4;
  }

  if (project.estimatedMinutes <= Number(needs.timeMinutes || 30)) {
    score += 4;
  } else if (project.estimatedMinutes <= Number(needs.timeMinutes || 30) * 2) {
    score += 2;
  }

  return score;
}

function buildProjectReason(project, needs) {
  if (project.estimatedMinutes <= Number(needs.timeMinutes || 30)) {
    return `Fits your ${needs.timeMinutes || 30}-minute study window and gives you something concrete to finish.`;
  }
  return "Suggested because it applies the topic in a concrete, small project.";
}

function tokenize(value) {
  return normalize(value)
    .split(/[^a-z0-9+]+/)
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}
