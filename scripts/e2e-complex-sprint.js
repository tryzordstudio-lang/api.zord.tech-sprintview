const puppeteer = require("puppeteer-core");
const mongoose = require("mongoose");
const { Report } = require("../src/models/report.model");
const { Sprint } = require("../src/models/sprint.model");

const CHROME_PATH = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:4000/api/v1";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sprintview";

function parseSetCookieHeader(header) {
  const parts = String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return null;
  }

  const [nameValue, ...attributes] = parts;
  const separatorIndex = nameValue.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const cookie = {
    name: nameValue.slice(0, separatorIndex),
    value: nameValue.slice(separatorIndex + 1)
  };

  for (const attribute of attributes) {
    const [rawKey, ...rawValue] = attribute.split("=");
    const key = rawKey.toLowerCase();
    const value = rawValue.join("=");

    if (key === "path") {
      cookie.path = value || "/";
    } else if (key === "domain") {
      cookie.domain = value;
    } else if (key === "expires") {
      const expires = Date.parse(value);
      if (!Number.isNaN(expires)) {
        cookie.expires = Math.floor(expires / 1000);
      }
    } else if (key === "httponly") {
      cookie.httpOnly = true;
    } else if (key === "secure") {
      cookie.secure = true;
    } else if (key === "samesite") {
      const normalized = value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "Lax";
      cookie.sameSite = normalized;
    }
  }

  return cookie;
}

async function login(page) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: "demo@sprintview.local",
      password: "Demo@12345"
    })
  });

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  const setCookieHeaders = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  const cookies = setCookieHeaders.map(parseSetCookieHeader).filter(Boolean);
  if (!cookies.length) {
    throw new Error("Login response did not include authentication cookies.");
  }

  await page.setCookie(
    ...cookies.map((cookie) => ({
      ...cookie,
      url: FRONTEND_URL
    }))
  );

  await page.goto(`${FRONTEND_URL}/app`, {
    waitUntil: "networkidle2",
    timeout: 120000
  });
}

async function fetchReportMeta() {
  const sprint = await Sprint.findOne({ name: /Enterprise Reporting Rollout/i }).sort({ updatedAt: -1 }).lean();
  if (!sprint) {
    return null;
  }

  const report = await Report.findOne({ sprintId: sprint._id }).lean();
  if (!report) {
    return null;
  }

  return {
    reportId: report._id.toString(),
    slug: report.sharing?.publicSlug || "",
    sprintName: sprint.name || "",
    widgetCount: report.preferences?.widgetLayout?.length || 0,
    status: sprint.status || ""
  };
}

async function verifyStudioLayout(page, reportId) {
  await page.goto(`${FRONTEND_URL}/reports/${reportId}/layout?mode=edit&theme=enterprise&preset=executive&tab=setup`, {
    waitUntil: "networkidle2",
    timeout: 120000
  });

  await page.waitForSelector(".report-widget-card", { timeout: 120000 });
  await page.waitForSelector(".report-builder-sidebar", { timeout: 120000 });

  const metrics = await page.evaluate(() => {
    const shell = document.querySelector(".report-builder-shell");
    const sidebar = document.querySelector(".report-builder-sidebar");
    const canvas = document.querySelector(".report-builder-canvas");
    const widgets = document.querySelectorAll(".report-widget-card");
    const firstCard = widgets[0];
    const lastCard = widgets[widgets.length - 1];

    const shellRect = shell?.getBoundingClientRect();
    const sidebarRect = sidebar?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    const firstRect = firstCard?.getBoundingClientRect();
    const lastRect = lastCard?.getBoundingClientRect();

    return {
      widgetCount: widgets.length,
      shellWidth: shellRect ? Math.round(shellRect.width) : null,
      sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : null,
      canvasWidth: canvasRect ? Math.round(canvasRect.width) : null,
      firstTop: firstRect ? Math.round(firstRect.top) : null,
      lastBottom: lastRect ? Math.round(lastRect.bottom) : null
    };
  });

  if (metrics.widgetCount < 8) {
    throw new Error(`Expected at least 8 widgets in the complex report, got ${metrics.widgetCount}`);
  }

  if (!(metrics.sidebarWidth > 260 && metrics.canvasWidth > 700)) {
    throw new Error(`Unexpected layout widths: ${JSON.stringify(metrics)}`);
  }

  await page.screenshot({
    path: "/tmp/complex-report-studio.png",
    fullPage: true
  });

  return metrics;
}

async function verifySharedReport(page, slug) {
  await page.goto(`${FRONTEND_URL}/shared/${slug}`, {
    waitUntil: "networkidle2",
    timeout: 120000
  });

  await page.waitForSelector(".public-report-workflow-grid", { timeout: 120000 });
  await page.waitForSelector(".public-report-comment-list", { timeout: 120000 });

  const metrics = await page.evaluate(() => {
    const workflowCards = [...document.querySelectorAll(".public-report-workflow-card")];
    const comments = [...document.querySelectorAll(".public-report-comment-card")];
    const hero = document.querySelector(".public-report-hero");
    const workflow = document.querySelector(".public-report-workflow-grid");

    return {
      workflowCount: workflowCards.length,
      commentCount: comments.length,
      heroWidth: hero ? Math.round(hero.getBoundingClientRect().width) : null,
      workflowWidth: workflow ? Math.round(workflow.getBoundingClientRect().width) : null,
      firstWorkflowText: workflowCards[0]?.textContent || ""
    };
  });

  if (metrics.workflowCount !== 4) {
    throw new Error(`Workflow surface should have 4 steps, got ${metrics.workflowCount}`);
  }

  if (metrics.commentCount < 2) {
    throw new Error(`Expected seeded comments to render, got ${metrics.commentCount}`);
  }

  if (!(metrics.heroWidth > 1000 && metrics.workflowWidth > 1000)) {
    throw new Error(`Unexpected shared report layout widths: ${JSON.stringify(metrics)}`);
  }

  await page.click('input[placeholder="Anonymous"]');
  await page.type('input[placeholder="Anonymous"]', "QA Automation");
  await page.type(
    'textarea[placeholder="Add stakeholder notes, feedback, or follow-up items."]',
    "E2E check: workflow and alignment look correct."
  );
  await page.click('.public-report-comment-form button[type="submit"]');

  await page.waitForFunction(
    () => [...document.querySelectorAll(".public-report-comment-card")].some((card) =>
      card.textContent.includes("E2E check: workflow and alignment look correct.")
    ),
    { timeout: 120000 }
  );

  await page.screenshot({
    path: "/tmp/complex-shared-report.png",
    fullPage: true
  });

  return metrics;
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_PATH,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1720, height: 2200, deviceScaleFactor: 1 });

    await login(page);

    const meta = await fetchReportMeta();
    if (!meta?.reportId || !meta?.slug) {
      throw new Error("Unable to resolve the seeded complex report metadata.");
    }

    const studioMetrics = await verifyStudioLayout(page, meta.reportId);
    const sharedMetrics = await verifySharedReport(page, meta.slug);

    console.log(
      JSON.stringify(
        {
          reportId: meta.reportId,
          sprintName: meta.sprintName,
          reportStatus: meta.status,
          studioMetrics,
          sharedMetrics
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
