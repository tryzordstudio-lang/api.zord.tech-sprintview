"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { LoadingLogo } from "@/components/loading-logo";
import { SidebarBrandLogo } from "@/components/sidebar-brand-logo";
import { apiGet, apiPost } from "@/lib/api";
import { buildNotifications } from "@/lib/view-models";

const navItems = [
  { href: "/app", label: "Dashboard", icon: "dashboard", section: "Overview" },
  { href: "/sprints", label: "Sprints", icon: "sprints", section: "Delivery" },
  { href: "/reports", label: "Reports", icon: "reports", section: "Delivery" },
  { href: "/insights", label: "Insights", icon: "insights", section: "Intelligence" },
  { href: "/analytics", label: "Analytics", icon: "analytics", section: "Intelligence" },
  { href: "/integrations", label: "Integrations", icon: "integrations", section: "Administration" }
];

const bottomNavItem = { href: "/settings", label: "Settings", icon: "settings", section: "Administration" };

function truncateText(value, maxLength) {
  const normalized = String(value || "").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function AppShell({ children, requireAuth = true, publicHeader = null, bare = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchShellRef = useRef(null);
  const notificationPanelRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [session, setSession] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const currentItem =
    [...navItems, bottomNavItem].find((item) => item.href === pathname) ||
    [...navItems, bottomNavItem].find((item) => pathname.startsWith(item.href)) ||
    navItems[0];
  const navSections = ["Overview", "Delivery", "Intelligence", "Administration"].map((section) => ({
    section,
    items: navItems.filter((item) => item.section === section)
  }));

  useEffect(() => {
    setSidebarOpen(false);
    setNotificationsOpen(false);
    setSearchFocused(false);
    setSearchQuery("");
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (searchShellRef.current && !searchShellRef.current.contains(event.target)) {
        setSearchFocused(false);
      }

      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target)) {
        const trigger = event.target.closest?.(".topbar-notification-button");
        if (!trigger) {
          setNotificationsOpen(false);
        }
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSearchFocused(false);
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!requireAuth) {
      setSessionResolved(true);
      return undefined;
    }

    let active = true;

    async function loadSession() {
      try {
        const result = await apiGet("/users/me");
        if (!active) return;
        setSession(result);
      } catch (error) {
        if (!active) return;
        setSession(null);
        if (error?.status === 401) {
          router.replace("/signin");
        }
      } finally {
        if (active) {
          setSessionResolved(true);
        }
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, [requireAuth, router]);

  useEffect(() => {
    if (!requireAuth || !session?.user?.workspaceId) {
      setNotifications([]);
      return undefined;
    }

    let active = true;

    async function loadNotifications() {
      try {
        const [sprintData, reportData] = await Promise.all([
          apiGet("/sprints?limit=6&sortBy=createdAt&sortOrder=desc"),
          apiGet("/report?limit=6&sortBy=updatedAt&sortOrder=desc")
        ]);

        const latestSprintId = sprintData?.items?.[0]?.sprint?._id;
        const latestSprintDetail = latestSprintId ? await apiGet(`/sprints/${latestSprintId}`) : null;

        if (!active) {
          return;
        }

        setNotifications(
          buildNotifications({
            latestSprint: latestSprintDetail?.sprint,
            reports: reportData?.items || []
          })
        );
      } catch (_error) {
        if (!active) {
          return;
        }

        setNotifications([]);
      }
    }

    loadNotifications();

    return () => {
      active = false;
    };
  }, [requireAuth, session?.user?.workspaceId]);

  useEffect(() => {
    if (!requireAuth || !session?.user?.workspaceId) {
      setSearchResults([]);
      return undefined;
    }

    let active = true;

    async function loadSearchResults() {
      try {
        const [sprintData, reportData] = await Promise.all([
          apiGet("/sprints?limit=8&sortBy=updatedAt&sortOrder=desc"),
          apiGet("/report?limit=8&sortBy=updatedAt&sortOrder=desc")
        ]);

        if (!active) {
          return;
        }

        const navMatches = [...navItems, bottomNavItem].map((item) => ({
          id: `nav-${item.href}`,
          label: item.label,
          meta: item.section,
          href: item.href,
          kind: "Navigation"
        }));
        const sprintMatches = (sprintData?.items || []).map((entry, index) => ({
          id: `sprint-${entry.sprint?._id || index}`,
          label: entry.sprint?.name || "Sprint",
          meta: entry.project?.name || "Sprint",
          href: entry.report?._id ? `/reports/${entry.report._id}` : "/sprints",
          kind: entry.report?._id ? "Sprint Report" : "Sprint"
        }));
        const reportMatches = (reportData?.items || []).map((entry, index) => ({
          id: `report-${entry.report?._id || index}`,
          label: entry.sprint?.name || "Report",
          meta: entry.project?.name || "Report",
          href: entry.report?._id ? `/reports/${entry.report._id}` : "/reports",
          kind: "Report"
        }));

        setSearchResults([...navMatches, ...sprintMatches, ...reportMatches]);
      } catch (_error) {
        if (active) {
          setSearchResults(
            navItems.map((item) => ({
              id: `nav-${item.href}`,
              label: item.label,
              meta: item.section,
              href: item.href,
              kind: "Navigation"
            }))
          );
        }
      }
    }

    loadSearchResults();

    return () => {
      active = false;
    };
  }, [requireAuth, session?.user?.workspaceId]);

  if (requireAuth && !sessionResolved) {
    return (
      <main className="simple-loading-screen">
        <div className="brand-loading-stage">
          <LoadingLogo />
        </div>
      </main>
    );
  }

  if (requireAuth && !session) {
    return null;
  }

  async function handleLogout() {
    try {
      await apiPost("/auth/logout", {});
    } catch (_error) {
      // Keep the redirect behavior deterministic even if the session is already invalid.
    }

    router.push("/signin");
    router.refresh();
  }

  const userName = session?.user?.name || "Account";
  const userDetail = session?.user?.email || "Workspace user";
  const workspaceName = session?.workspace?.name || "Workspace";
  const userNameLabel = truncateText(userName, 18);
  const workspaceLabel = truncateText(workspaceName, 18);
  const hasNotifications = notifications.length > 0;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleSearchResults = normalizedSearchQuery
    ? searchResults
        .filter((item) => `${item.label} ${item.meta} ${item.kind}`.toLowerCase().includes(normalizedSearchQuery))
        .slice(0, 6)
    : searchResults.slice(0, 6);
  const avatarText = workspaceName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SV";

  function handleSearchSubmit(event) {
    event.preventDefault();
    const target = visibleSearchResults[0];
    if (!target?.href) {
      return;
    }

    router.push(target.href);
    setSearchFocused(false);
  }

  if (bare) {
    return (
      <div className="app-shell bare-shell">
        <main className="page-content bare-page-content">{children}</main>
      </div>
    );
  }

  if (publicHeader) {
    return (
      <div className="app-shell public-shell">
        <div className="app-main public-app-main">
          <header className="topbar public-topbar">
            <div className="topbar-inner public-topbar-inner">
              <Link href="/" className="public-topbar-brand" aria-label="SprintView home">
                <SidebarBrandLogo className="public-topbar-brand-mark" />
                <span className="public-topbar-brand-copy">
                  <strong>SprintView</strong>
                  <span>Shared Sprint Report</span>
                </span>
              </Link>

              <div className="public-topbar-copy">
                <span className="public-topbar-kicker">{publicHeader.kicker || "Published report"}</span>
                <strong>{publicHeader.title || "Sprint report"}</strong>
                {publicHeader.meta ? <span>{publicHeader.meta}</span> : null}
              </div>

              <div className="public-topbar-actions">
                {publicHeader.secondaryHref ? (
                  <Link href={publicHeader.secondaryHref} className="button-secondary">
                    {publicHeader.secondaryLabel || "Open Workspace"}
                  </Link>
                ) : null}
                {publicHeader.primaryHref ? (
                  <a
                    href={publicHeader.primaryHref}
                    target={publicHeader.primaryExternal ? "_blank" : undefined}
                    rel={publicHeader.primaryExternal ? "noreferrer" : undefined}
                    className="button"
                  >
                    {publicHeader.primaryLabel || "Download PDF"}
                  </a>
                ) : null}
              </div>
            </div>
          </header>

          <main className="page-content public-page-content">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <button
        className={`sidebar-scrim ${sidebarOpen ? "is-visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      <button
        className={`notification-scrim ${notificationsOpen ? "is-visible" : ""}`}
        aria-label="Close notifications"
        onClick={() => setNotificationsOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <SidebarBrandLogo className="sidebar-brand-mark" />
          <div className="sidebar-brand-copy">
            <h1>Spring View</h1>
            <p>By Zord</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navSections.map((group) => (
            <div key={group.section} className="sidebar-nav-group">
              <p className="sidebar-section-title">{group.section}</p>
              <div className="sidebar-nav-list">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-link ${active ? "is-active" : ""}`}
                    >
                      <span className="sidebar-link-icon-wrap">
                        <Icon name={item.icon} className="sidebar-link-icon" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-group">
            <p className="sidebar-section-title">Workspace</p>
            <Link
              href={bottomNavItem.href}
              className={`sidebar-link sidebar-link-bottom ${pathname === bottomNavItem.href ? "is-active" : ""}`}
            >
              <span className="sidebar-link-icon-wrap">
                <Icon name={bottomNavItem.icon} className="sidebar-link-icon" />
              </span>
              <span>{bottomNavItem.label}</span>
            </Link>
          </div>
          <div className="sidebar-footer-group sidebar-footer-utilities">
            <button className="sidebar-link sidebar-link-bottom sidebar-link-button" type="button" onClick={handleLogout}>
              <span className="sidebar-link-icon-wrap">
                <Icon name="logout" className="sidebar-link-icon" />
              </span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <button
                className="icon-button mobile-only"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen(true)}
              >
                <Icon name="menu" className="icon" />
              </button>
              <div className="topbar-context">
                <div className="topbar-title-row">
                  <h2>{currentItem.label}</h2>
                  <span className="topbar-status">Workspace Active</span>
                </div>
              </div>
            </div>

            <div className="topbar-center">
              <form ref={searchShellRef} className="search-shell" onSubmit={handleSearchSubmit}>
                <label className="search-field" aria-label="Search reports and sprints">
                  <Icon name="search" className="icon" />
                  <input
                    type="search"
                    placeholder="Search reports, sprints, teams..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setSearchFocused(false);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </label>
                {searchFocused ? (
                  <div className="search-dropdown" role="listbox" aria-label="Search results">
                    {visibleSearchResults.length ? (
                      visibleSearchResults.map((item) => (
                        <button
                          key={item.id}
                          className="search-result"
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            router.push(item.href);
                            setSearchFocused(false);
                          }}
                        >
                          <strong>{item.label}</strong>
                          <span>{item.kind} • {item.meta}</span>
                        </button>
                      ))
                    ) : (
                      <div className="search-empty">No matching results.</div>
                    )}
                  </div>
                ) : null}
              </form>
            </div>
            <div className="topbar-actions">
              <button
                className={`icon-button topbar-notification-button ${hasNotifications ? "is-alert" : ""}`}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                aria-controls="notification-panel"
                type="button"
                onClick={() => setNotificationsOpen(true)}
              >
                <Icon name="bell" className="icon" />
                {hasNotifications ? <span className="notification-dot" /> : null}
              </button>
              <button
                className="profile-chip"
                type="button"
                aria-label="Active workspace account"
                title={`${workspaceName} • ${userName} • ${userDetail}`}
              >
                <span className="profile-avatar-shell">
                  <span className="profile-avatar">{avatarText}</span>
                  <span className="profile-status-dot" />
                </span>
                <span className="profile-copy">
                  <strong title={workspaceName}>{workspaceLabel}</strong>
                  <span className="profile-subline" title={`${userName} • ${userDetail}`}>{userNameLabel}</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      <aside
        ref={notificationPanelRef}
        id="notification-panel"
        className={`notification-panel ${notificationsOpen ? "is-open" : ""}`}
        aria-hidden={!notificationsOpen}
      >
        <div className="notification-panel-header">
          <div>
            <p className="eyebrow">Notifications</p>
            <h3>Recent Activity</h3>
          </div>
          <button
            className="icon-button"
            aria-label="Close notifications"
            type="button"
            onClick={() => setNotificationsOpen(false)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="notification-panel-body">
          {hasNotifications ? (
            notifications.map((item, index) => (
              <article key={`${item}-${index}`} className="notification-item">
                <span className="notification-item-dot" />
                <div className="notification-item-content">
                  <div>
                    <strong>Platform update</strong>
                    <p>{item}</p>
                  </div>
                  <button
                    className="notification-item-close"
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => setNotifications((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="notification-empty">
              <strong>All caught up</strong>
              <p>There are no new notifications right now.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
