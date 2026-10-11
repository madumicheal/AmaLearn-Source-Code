import test from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { PLAN_STORAGE_KEY } from "../src/lib/learningPlan.js";

const originalFetch = globalThis.fetch;

async function renderApp(options = {}) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost/",
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Event = dom.window.Event;
  globalThis.FormData = dom.window.FormData;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  if (Object.hasOwn(options, "storedPlan")) {
    dom.window.localStorage.setItem(PLAN_STORAGE_KEY, options.storedPlan);
  }

  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const { App } = await server.ssrLoadModule("/src/App.jsx");
  const root = createRoot(document.getElementById("root"));

  await act(async () => {
    root.render(React.createElement(App));
  });

  return { dom, root, server };
}

async function cleanup({ dom, root, server }) {
  await act(async () => {
    root.unmount();
  });
  await server.close();
  dom.window.close();
  globalThis.fetch = originalFetch;
}

test("learner can submit needs and see recommendations with a study path", async () => {
  const rendered = await renderApp();

  try {
    const goal = document.querySelector("#goal");
    const form = document.querySelector("form");

    goal.value = "learn Python basics";

    await act(async () => {
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    });

    assert.match(document.querySelector("#results-title").textContent, /learn Python basics/);
    assert.ok(document.querySelectorAll(".resource-card").length > 0);
    assert.equal(document.querySelector(".study-path h3").textContent, "A grounded sequence from your top matches");
    assert.ok(document.body.textContent.includes("Why this matches"));
  } finally {
    await cleanup(rendered);
  }
});

test("empty goal submission shows validation without recommendations", async () => {
  const rendered = await renderApp();

  try {
    const form = document.querySelector("form");

    await act(async () => {
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    });

    assert.equal(document.querySelector(".field-error").textContent, "Enter a topic or learning goal.");
    assert.equal(document.querySelectorAll(".resource-card").length, 0);
  } finally {
    await cleanup(rendered);
  }
});

test("realtime search reports provider setup status", async () => {
  const rendered = await renderApp();

  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          message:
            "Realtime search is wired through /api/search, but no server-side search provider key is configured yet.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );

    const goal = document.querySelector("#goal");
    const form = document.querySelector("form");

    goal.value = "astronomy telescope";

    await act(async () => {
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    });

    await act(async () => {
      document.querySelector(".realtime-panel button").click();
    });

    assert.match(document.querySelector(".realtime-error").textContent, /provider key is configured/);
  } finally {
    await cleanup(rendered);
  }
});

test("learner can add a recommendation to a plan and record a check-in", async () => {
  const rendered = await renderApp();

  try {
    const goal = document.querySelector("#goal");
    const form = document.querySelector("form");

    goal.value = "learn Python basics";

    await act(async () => {
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    });

    await act(async () => {
      document.querySelector(".resource-card .add-plan-button").click();
    });

    assert.match(document.querySelector(".companion-panel").textContent, /Next activity/);
    assert.match(document.querySelector(".companion-panel").textContent, /Python/);

    await act(async () => {
      [...document.querySelectorAll(".plan-actions button")]
        .find((button) => button.textContent === "Completed")
        .click();
    });

    assert.match(document.querySelector(".adaptive-suggestion").textContent, /completed/);
    assert.ok(window.localStorage.getItem(PLAN_STORAGE_KEY).includes("python"));
  } finally {
    await cleanup(rendered);
  }
});

test("malformed saved progress falls back to an empty learning plan", async () => {
  const rendered = await renderApp({ storedPlan: "{not-json" });

  try {
    assert.match(document.querySelector(".companion-panel").textContent, /No learning plan yet/);
  } finally {
    await cleanup(rendered);
  }
});
