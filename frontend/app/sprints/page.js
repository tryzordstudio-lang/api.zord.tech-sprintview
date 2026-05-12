"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog, DataTable, MetricCard, PageIntro, StatusPill, Surface } from "@/components/ui";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/view-models";

const STORY_STATUSES = ["To Do", "In Progress", "Blocked", "Done"];
const MANUAL_SPRINT_DRAFT_KEY = "sprintview.manual-sprint-draft.v2";

function sprintTone(risk) {
  if (risk === "high") return "high";
  if (risk === "medium") return "medium";
  return "low";
}

function createStoryRow(overrides = {}) {
  return {
    id: overrides.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name || "",
    status: overrides.status || "To Do",
    assignee: overrides.assignee || "",
    storyPoints: overrides.storyPoints ?? "",
    blocked: Boolean(overrides.blocked)
  };
}

function createEmptyForm() {
  return {
    projectName: "",
    projectKey: "",
    sprintName: "",
    sprintNumber: "",
    goal: "",
    startDate: "",
    endDate: "",
    stories: []
  };
}

function normalizeStatus(value) {
  const raw = String(value || "").trim();
  const matched = STORY_STATUSES.find((status) => status.toLowerCase() === raw.toLowerCase());
  return matched || "To Do";
}

function normalizeUploadRows(rows = []) {
  return rows
    .map((row, index) => {
      const source = row || {};
      const getValue = (...keys) => {
        for (const key of keys) {
          const matchedKey = Object.keys(source).find((item) => item.toLowerCase().replace(/\s+/g, "") === key);
          if (matchedKey && source[matchedKey] !== undefined && source[matchedKey] !== null && source[matchedKey] !== "") {
            return source[matchedKey];
          }
        }
        return "";
      };

      const name = String(getValue("name", "story", "storyname", "summary", "title", "task") || "").trim();
      if (!name) {
        return null;
      }

      const pointsValue = getValue("storypoints", "points", "estimate");
      const numericPoints = Number(pointsValue);

      return createStoryRow({
        id: `upload-${index + 1}`,
        name,
        status: normalizeStatus(getValue("status", "state") || "To Do"),
        assignee: String(getValue("assignee", "owner", "assignedto") || "").trim(),
        storyPoints: Number.isFinite(numericPoints) && numericPoints >= 0 ? String(numericPoints) : "",
        blocked: /^(yes|true|blocked|1)$/i.test(String(getValue("blocked", "isblocked") || "").trim())
      });
    })
    .filter(Boolean);
}

function collectStoryDiagnostics(stories = []) {
  const counts = new Map();

  for (const story of stories) {
    const name = String(story.name || "").trim().toLowerCase();
    if (name) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  const rowErrors = {};
  let rowsWithIssues = 0;
  let duplicateCount = 0;
  let validStories = 0;

  for (const story of stories) {
    const errors = [];
    const name = String(story.name || "").trim();
    const normalizedName = name.toLowerCase();
    const pointsValue = String(story.storyPoints ?? "").trim();
    const status = String(story.status || "").trim();

    if (!name) {
      errors.push("Story name is required.");
    }

    if (status && !STORY_STATUSES.includes(status)) {
      errors.push("Select a valid status.");
    }

    if (pointsValue !== "") {
      const parsed = Number(pointsValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        errors.push("Points must be 0 or greater.");
      }
    }

    if (name && counts.get(normalizedName) > 1) {
      errors.push("Duplicate story name.");
      duplicateCount += 1;
    }

    if (errors.length) {
      rowErrors[story.id] = errors;
      rowsWithIssues += 1;
    } else if (name) {
      validStories += 1;
    }
  }

  return {
    rowErrors,
    rowsWithIssues,
    duplicateCount,
    validStories
  };
}

function buildRiskPreview(stories = []) {
  const validStories = stories.filter((story) => String(story.name || "").trim());
  const storyCount = validStories.length;
  const totalPoints = validStories.reduce((sum, story) => sum + (Number(story.storyPoints) || 0), 0);
  const blockedCount = validStories.filter((story) => story.blocked || story.status === "Blocked").length;
  const blockedRatio = storyCount ? blockedCount / storyCount : 0;

  let risk = "Low";
  if (blockedCount >= 2 || blockedRatio >= 0.25 || totalPoints >= 40) {
    risk = "High";
  } else if (blockedCount >= 1 || totalPoints >= 20 || storyCount >= 10) {
    risk = "Medium";
  }

  const rawHealth = 92 - blockedCount * 16 - Math.max(0, totalPoints - 30) * 0.55 - Math.max(0, storyCount - 8) * 1.5;
  const healthPrediction = storyCount ? Math.max(48, Math.min(96, Math.round(rawHealth))) : 0;

  let note = "Sprint scope looks balanced for AI analysis.";
  if (risk === "High") {
    note = "Blocked work or scope size suggests elevated delivery risk before analysis.";
  } else if (risk === "Medium") {
    note = "Scope is workable, but one or two signals may affect delivery posture.";
  }

  return {
    storyCount,
    totalPoints,
    blockedCount,
    risk,
    healthPrediction,
    note
  };
}

export default function SprintsPage() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [form, setForm] = useState(createEmptyForm);
  const fileInputRef = useRef(null);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const result = await apiGet("/sprints?limit=20&sortBy=createdAt&sortOrder=desc");
      setRows(result?.items || []);
      setPagination(result?.pagination || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load sprints.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MANUAL_SPRINT_DRAFT_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      setForm({
        ...createEmptyForm(),
        ...parsed,
        stories: Array.isArray(parsed.stories) ? parsed.stories.map((story) => createStoryRow(story)) : []
      });
      setDraftSavedAt("Restored from local draft");
    } catch (_error) {
      // Ignore invalid local drafts.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MANUAL_SPRINT_DRAFT_KEY, JSON.stringify(form));
      if (
        form.projectName ||
        form.projectKey ||
        form.sprintName ||
        form.sprintNumber ||
        form.goal ||
        form.startDate ||
        form.endDate ||
        form.stories.length
      ) {
        setDraftSavedAt(`Draft auto-saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      } else {
        setDraftSavedAt("");
      }
    } catch (_error) {
      // Ignore localStorage errors.
    }
  }, [form]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateStory(id, key, value) {
    setForm((current) => ({
      ...current,
      stories: current.stories.map((story) => {
        if (story.id !== id) {
          return story;
        }

        if (key === "status") {
          return {
            ...story,
            status: value,
            blocked: value === "Blocked" ? true : story.blocked
          };
        }

        return {
          ...story,
          [key]: value
        };
      })
    }));
  }

  function addStoryRow() {
    setForm((current) => ({
      ...current,
      stories: [...current.stories, createStoryRow()]
    }));
  }

  function removeStoryRow(id) {
    setForm((current) => ({
      ...current,
      stories: current.stories.filter((story) => story.id !== id)
    }));
  }

  async function importStoriesFromFile(file) {
    if (!file) {
      return;
    }

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsedRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const stories = normalizeUploadRows(parsedRows);

    if (!stories.length) {
      throw new Error("No valid story rows were found in the uploaded file.");
    }

    setForm((current) => ({
      ...current,
      stories
    }));
    setSuccess(`${stories.length} stories loaded from ${file.name}.`);
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError("");
      await importStoriesFromFile(file);
    } catch (uploadError) {
      setError(uploadError.message || "Unable to read the uploaded file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleStoryDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError("");
      await importStoriesFromFile(file);
    } catch (uploadError) {
      setError(uploadError.message || "Unable to read the uploaded file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreateSprint(event) {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const fieldErrors = [];
      if (!form.projectName.trim()) {
        fieldErrors.push("Project name is required.");
      }
      if (!form.sprintName.trim()) {
        fieldErrors.push("Sprint name is required.");
      }
      if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
        fieldErrors.push("End date must be after the start date.");
      }

      const diagnostics = collectStoryDiagnostics(form.stories);
      if (fieldErrors.length || diagnostics.rowsWithIssues || !diagnostics.validStories) {
        throw new Error(fieldErrors[0] || "Resolve story validation issues before analyzing the sprint.");
      }

      const stories = form.stories
        .filter((story) => String(story.name || "").trim())
        .map((story, index) => ({
          issueKey: `MAN-${index + 1}`,
          name: String(story.name || "").trim(),
          status: STORY_STATUSES.includes(story.status) ? story.status : "To Do",
          assignee: String(story.assignee || "").trim() || "Unassigned",
          storyPoints: Number(story.storyPoints) || 0,
          blocked: Boolean(story.blocked || story.status === "Blocked")
        }));

      const payload = {
        projectName: form.projectName.trim(),
        projectKey: form.projectKey.trim().toUpperCase() || undefined,
        name: form.sprintName.trim(),
        sprintNumber: form.sprintNumber ? Number(form.sprintNumber) : undefined,
        goal: form.goal.trim() || undefined,
        dateRange:
          form.startDate || form.endDate
            ? {
                start: form.startDate ? new Date(`${form.startDate}T00:00:00.000Z`).toISOString() : undefined,
                end: form.endDate ? new Date(`${form.endDate}T00:00:00.000Z`).toISOString() : undefined
              }
            : undefined,
        stories
      };

      await apiPost("/sprints/import", payload);
      setSuccess("Manual sprint created.");
      setCreateOpen(false);
      setForm(createEmptyForm());
      setSubmitAttempted(false);
      setDraftSavedAt("");
      window.localStorage.removeItem(MANUAL_SPRINT_DRAFT_KEY);
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to create sprint.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry(id) {
    await apiPost(`/sprints/${id}/retry-ai`, {});
    await load();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget?._id) {
      return;
    }

    try {
      setDeleteBusy(true);
      await apiDelete(`/sprints/${deleteTarget._id}/delete`);
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleteBusy(false);
    }
  }

  const sprintCount = pagination?.total || rows.length;
  const readyReports = rows.filter((row) => row.report?.status === "published").length;
  const processingCount = rows.filter((row) => row.sprint?.status === "processing").length;
  const storyDiagnostics = collectStoryDiagnostics(form.stories);
  const snapshot = buildRiskPreview(form.stories);
  const hasDateError = form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate);
  const canSubmit =
    !submitting &&
    form.projectName.trim() &&
    form.sprintName.trim() &&
    !hasDateError &&
    storyDiagnostics.validStories > 0 &&
    storyDiagnostics.rowsWithIssues === 0;

  const columns = [
    {
      key: "name",
      label: "Sprint",
      render: (row) => (
        <div className="table-primary">
          <strong>{row.sprint?.name || "Untitled sprint"}</strong>
          <span>{row.project?.name || "Unassigned project"}</span>
        </div>
      )
    },
    {
      key: "generatedAt",
      label: "Generated",
      render: (row) => formatDate(row.sprint?.createdAt)
    },
    {
      key: "health",
      label: "Health",
      render: (row) => <strong>{row.sprint?.healthScore || 0}</strong>
    },
    {
      key: "completion",
      label: "Completion",
      render: (row) => <span>{row.sprint?.metrics?.completionRate || 0}%</span>
    },
    {
      key: "risk",
      label: "Delivery Risk",
      render: (row) => <StatusPill tone={sprintTone(row.sprint?.deliveryRisk)}>{row.sprint?.deliveryRisk || "low"}</StatusPill>
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusPill tone={row.sprint?.status === "ready" ? "ready" : row.sprint?.status === "failed" ? "failed" : "processing"}>
          {row.sprint?.status || "processing"}
        </StatusPill>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="table-actions">
          <button className="table-action" onClick={() => handleRetry(row.sprint?._id)}>
            Retry AI
          </button>
          <button className="table-action" onClick={() => setDeleteTarget(row.sprint)}>
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <AppShell>
      <button
        className={`modal-scrim ${createOpen ? "is-visible" : ""}`}
        aria-label="Close create sprint dialog"
        onClick={() => setCreateOpen(false)}
      />

      <PageIntro
        eyebrow="Sprint Management"
        title="Sprints"
        description="Create a sprint manually or review imported sprint health, AI status, and report readiness."
        actions={
          <>
            <button className="button-secondary" onClick={load}>
              Refresh
            </button>
            <button className="button" onClick={() => setCreateOpen(true)}>
              Create New Sprint
            </button>
          </>
        }
      />

      {error ? <div className="auth-alert">{error}</div> : null}
      {success ? <div className="manual-sprint-success">{success}</div> : null}

      <section className="surface-grid three-up">
        <MetricCard label="Tracked Sprints" value={String(sprintCount)} unit="" detail="Imported into this workspace" />
        <MetricCard label="Ready Reports" value={String(readyReports)} unit="" detail="Published reports available" tone="healthy" />
        <MetricCard label="AI Processing" value={String(processingCount)} unit="" detail="Sprints waiting on AI completion" tone="warning" />
      </section>

      <Surface title="Sprint Registry" subtitle="Sortable, searchable, and scoped for enterprise operating review.">
        <DataTable columns={columns} rows={rows} />
      </Surface>

      <div className={`modal-wrap ${createOpen ? "is-open" : ""}`} aria-hidden={!createOpen}>
        <div className="manual-sprint-modal">
          <div className="manual-sprint-shell">
            <div className="manual-sprint-topbar">
              <button
                className="manual-sprint-back"
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setError("");
                }}
              >
                ← Back to Sprints
              </button>
              <button className="icon-button" type="button" aria-label="Close create sprint dialog" onClick={() => setCreateOpen(false)}>
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="manual-sprint-hero">
              <p className="eyebrow">Create Sprint</p>
              <h2>Create Sprint</h2>
              <p>Configure sprint details, import stories, and generate sprint intelligence.</p>
            </div>

            <form className="manual-sprint-form" onSubmit={handleCreateSprint}>
              <div className="manual-sprint-layout">
                <section className="manual-sprint-panel manual-sprint-config-panel">
                  <div className="manual-sprint-panel-header">
                    <div>
                      <h3>Sprint Details</h3>
                      <p>Project metadata, sprint timing, and objective framing for the analysis run.</p>
                    </div>
                  </div>

                  <div className="manual-sprint-section">
                    <span className="manual-sprint-section-label">Project Information</span>
                    <div className="manual-sprint-grid">
                      <div className="settings-field">
                        <label htmlFor="projectName">Project Name</label>
                        <input
                          id="projectName"
                          value={form.projectName}
                          onChange={(event) => updateField("projectName", event.target.value)}
                          placeholder="Platform Operations"
                        />
                        {submitAttempted && !form.projectName.trim() ? <small className="manual-sprint-error">Project name is required.</small> : null}
                      </div>
                      <div className="settings-field">
                        <label htmlFor="projectKey">Project Key</label>
                        <input
                          id="projectKey"
                          className="manual-sprint-key-input"
                          value={form.projectKey}
                          onChange={(event) => updateField("projectKey", event.target.value.toUpperCase())}
                          placeholder="PLAT"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="manual-sprint-section">
                    <span className="manual-sprint-section-label">Sprint Information</span>
                    <div className="manual-sprint-grid">
                      <div className="settings-field">
                        <label htmlFor="sprintName">Sprint Name</label>
                        <input
                          id="sprintName"
                          value={form.sprintName}
                          onChange={(event) => updateField("sprintName", event.target.value)}
                          placeholder="Sprint 24"
                        />
                        {submitAttempted && !form.sprintName.trim() ? <small className="manual-sprint-error">Sprint name is required.</small> : null}
                      </div>
                      <div className="settings-field">
                        <label htmlFor="sprintNumber">Sprint Number</label>
                        <input
                          id="sprintNumber"
                          type="number"
                          min="1"
                          value={form.sprintNumber}
                          onChange={(event) => updateField("sprintNumber", event.target.value)}
                          placeholder="24"
                        />
                      </div>
                    </div>

                    <div className="manual-sprint-grid">
                      <div className="settings-field">
                        <label htmlFor="startDate">Start Date</label>
                        <input
                          id="startDate"
                          type="date"
                          value={form.startDate}
                          onChange={(event) => updateField("startDate", event.target.value)}
                        />
                      </div>
                      <div className="settings-field">
                        <label htmlFor="endDate">End Date</label>
                        <input
                          id="endDate"
                          type="date"
                          value={form.endDate}
                          onChange={(event) => updateField("endDate", event.target.value)}
                        />
                      </div>
                    </div>
                    {hasDateError ? <small className="manual-sprint-error">End date must be after the start date.</small> : null}

                    <div className="settings-field settings-field-full">
                      <label htmlFor="goal">Sprint Goal</label>
                      <textarea
                        id="goal"
                        rows="5"
                        value={form.goal}
                        onChange={(event) => updateField("goal", event.target.value)}
                        placeholder="Stabilize release readiness and close API validation gaps."
                      />
                      <small className="manual-sprint-helper">Briefly describe the expected sprint outcome.</small>
                    </div>
                  </div>
                </section>

                <section className="manual-sprint-panel manual-sprint-stories-panel">
                  <div className="manual-sprint-panel-header">
                    <div>
                      <h3>Sprint Stories</h3>
                      <p>Add stories manually or import from CSV/Excel.</p>
                    </div>
                    <button className="button-secondary" type="button" onClick={addStoryRow}>
                      + Add Story
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    id="storiesFile"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="manual-sprint-file-input"
                  />

                  <button
                    className={`manual-sprint-dropzone ${dragActive ? "is-dragging" : ""}`}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                    }}
                    onDrop={handleStoryDrop}
                  >
                    <strong>Drag & drop CSV or Excel file</strong>
                    <span>or browse files</span>
                    <small>Supported: CSV, XLSX. Required columns: name, status, assignee, points, blocked{uploading ? " • Reading file..." : ""}</small>
                  </button>

                  <div className="manual-sprint-divider">
                    <span>OR</span>
                  </div>

                  {storyDiagnostics.rowsWithIssues ? (
                    <div className="manual-sprint-validation-banner">
                      <strong>Validation in progress</strong>
                      <span>
                        {storyDiagnostics.rowsWithIssues} rows need attention
                        {storyDiagnostics.duplicateCount ? ` • ${storyDiagnostics.duplicateCount} duplicate signals` : ""}
                      </span>
                    </div>
                  ) : null}

                  {form.stories.length ? (
                    <div className="manual-sprint-story-table">
                      <div className="manual-sprint-story-head">
                        <span>Story</span>
                        <span>Status</span>
                        <span>Assignee</span>
                        <span>Points</span>
                        <span>Blocked</span>
                        <span></span>
                      </div>

                      <div className="manual-sprint-story-body">
                        {form.stories.map((story) => (
                          <div key={story.id} className="manual-sprint-story-card">
                            <div className="manual-sprint-story-row">
                              <div className="manual-sprint-story-field manual-sprint-story-name">
                                <input
                                  value={story.name}
                                  onChange={(event) => updateStory(story.id, "name", event.target.value)}
                                  placeholder="Validate payment API"
                                />
                              </div>

                              <div className={`manual-sprint-story-field manual-sprint-status-field status-${String(story.status || "todo").toLowerCase().replace(/\s+/g, "-")}`}>
                                <select value={story.status} onChange={(event) => updateStory(story.id, "status", event.target.value)}>
                                  {STORY_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="manual-sprint-story-field">
                                <input
                                  value={story.assignee}
                                  onChange={(event) => updateStory(story.id, "assignee", event.target.value)}
                                  placeholder="Arun"
                                />
                              </div>

                              <div className="manual-sprint-story-field manual-sprint-story-points">
                                <input
                                  type="number"
                                  min="0"
                                  value={story.storyPoints}
                                  onChange={(event) => updateStory(story.id, "storyPoints", event.target.value)}
                                  placeholder="5"
                                />
                              </div>

                              <label className="manual-sprint-story-toggle">
                                <input
                                  type="checkbox"
                                  checked={story.blocked}
                                  onChange={(event) => updateStory(story.id, "blocked", event.target.checked)}
                                />
                                <span>{story.blocked ? "Yes" : "No"}</span>
                              </label>

                              <button className="manual-sprint-remove" type="button" onClick={() => removeStoryRow(story.id)}>
                                Remove
                              </button>
                            </div>

                            {storyDiagnostics.rowErrors[story.id]?.length ? (
                              <div className="manual-sprint-row-errors">
                                {storyDiagnostics.rowErrors[story.id].map((message) => (
                                  <span key={`${story.id}-${message}`}>{message}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="manual-sprint-empty">
                      <strong>No sprint stories yet</strong>
                      <p>Add stories manually or import a file to begin analysis.</p>
                      <button className="button-secondary" type="button" onClick={addStoryRow}>
                        + Add Story
                      </button>
                    </div>
                  )}

                  <div className="manual-sprint-snapshot-card">
                    <div className="manual-sprint-snapshot-header">
                      <div>
                        <h4>Sprint Snapshot</h4>
                        <p>Auto-detect sprint risk before creation.</p>
                      </div>
                      <span className={`manual-sprint-risk-pill risk-${snapshot.risk.toLowerCase()}`}>{snapshot.risk} Risk</span>
                    </div>

                    <div className="manual-sprint-snapshot-grid">
                      <div>
                        <span>Stories</span>
                        <strong>{snapshot.storyCount}</strong>
                      </div>
                      <div>
                        <span>Total Points</span>
                        <strong>{snapshot.totalPoints}</strong>
                      </div>
                      <div>
                        <span>Blocked</span>
                        <strong>{snapshot.blockedCount}</strong>
                      </div>
                      <div>
                        <span>Health Prediction</span>
                        <strong>{snapshot.healthPrediction ? `${snapshot.healthPrediction}%` : "—"}</strong>
                      </div>
                    </div>

                    <p className="manual-sprint-snapshot-note">{snapshot.note}</p>
                  </div>
                </section>
              </div>

              <div className="manual-sprint-footer">
                <div className="manual-sprint-footer-note">{draftSavedAt || "Draft auto-saved locally"}</div>
                <div className="manual-sprint-footer-actions">
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => {
                      setCreateOpen(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </button>
                  <button className="manual-sprint-submit" type="submit" disabled={!canSubmit}>
                    {submitting ? "Analyzing..." : "Analyze Sprint"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Sprint"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.name} and its related stories, insights, and reports? This action cannot be undone.`
            : ""
        }
        tone="danger"
        confirmLabel="Delete Sprint"
        busy={deleteBusy}
        onCancel={() => !deleteBusy && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </AppShell>
  );
}
