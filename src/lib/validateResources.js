const allowedLevels = new Set(["beginner", "intermediate", "advanced", "all-levels", "unknown"]);
const allowedFormats = new Set(["video", "reading", "interactive", "course", "download", "other"]);

export function validateResources(resources) {
  const issues = [];
  const ids = new Set();

  if (!Array.isArray(resources)) {
    return ["Catalogue must be an array."];
  }

  resources.forEach((resource, index) => {
    const label = resource?.id || `record ${index + 1}`;
    const requiredTextFields = ["id", "title", "url", "provider", "description", "durationLabel"];

    requiredTextFields.forEach((field) => {
      if (typeof resource?.[field] !== "string" || resource[field].trim() === "") {
        issues.push(`${label}: missing ${field}.`);
      }
    });

    if (resource?.id) {
      if (ids.has(resource.id)) {
        issues.push(`${label}: duplicate id.`);
      }
      ids.add(resource.id);
    }

    if (!isValidHttpUrl(resource?.url)) {
      issues.push(`${label}: url must be http or https.`);
    }

    if (!Array.isArray(resource?.topics) || resource.topics.length === 0) {
      issues.push(`${label}: at least one topic is required.`);
    }

    if (!allowedLevels.has(resource?.level)) {
      issues.push(`${label}: invalid level.`);
    }

    if (!allowedFormats.has(resource?.format)) {
      issues.push(`${label}: invalid format.`);
    }

    if (
      resource?.estimatedMinutes !== null &&
      (!Number.isInteger(resource?.estimatedMinutes) || resource.estimatedMinutes < 1)
    ) {
      issues.push(`${label}: estimatedMinutes must be a positive integer or null.`);
    }

    ["lowData", "downloadable"].forEach((field) => {
      if (![true, false, "unknown"].includes(resource?.[field])) {
        issues.push(`${label}: ${field} must be true, false, or unknown.`);
      }
    });
  });

  return issues;
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
