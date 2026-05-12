export function JiraLogo({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="jiraLogoGradient" x1="96" y1="96" x2="416" y2="416" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4C9AFF" />
          <stop offset="1" stopColor="#0052CC" />
        </linearGradient>
      </defs>
      <path
        d="M284 64h131.3a20 20 0 0 1 20 20v131.3c0 67.1-54.4 121.5-121.5 121.5H182.5a20 20 0 0 1-20-20V185.5C162.5 118.4 216.9 64 284 64Z"
        fill="url(#jiraLogoGradient)"
      />
      <path
        d="M178.4 196.4h131.3a20 20 0 0 1 20 20v131.3c0 67.1-54.4 121.5-121.5 121.5H76.9a20 20 0 0 1-20-20V317.9c0-67.1 54.4-121.5 121.5-121.5Z"
        fill="url(#jiraLogoGradient)"
      />
      <path
        d="M71.4 328.8h131.3a20 20 0 0 1 20 20v131.3a20 20 0 0 1-20 20h-58.2C77.4 500.1 23 445.7 23 378.6V348.8a20 20 0 0 1 20-20Z"
        fill="url(#jiraLogoGradient)"
      />
    </svg>
  );
}

export function Icon({ name, className = "" }) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="4" y="4" width="7.5" height="6.5" rx="1.6" fill="currentColor" stroke="none" />
          <rect x="12.5" y="4" width="7.5" height="10" rx="1.6" fill="currentColor" stroke="none" />
          <rect x="4" y="11.5" width="7.5" height="8.5" rx="1.6" fill="currentColor" stroke="none" />
          <rect x="12.5" y="15" width="7.5" height="5" rx="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "sprints":
      return (
        <svg {...props}>
          <circle cx="6.5" cy="7" r="2" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="9.5" cy="18" r="2" fill="currentColor" stroke="none" />
          <path d="M8.2 8.1 15.8 10.9" />
          <path d="M15.9 13.5 11.1 16.5" />
        </svg>
      );
    case "reports":
      return (
        <svg {...props}>
          <path d="M7.5 3.5h6.5l4 4V19a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z" />
          <path d="M14 3.5V8h4.5" />
          <path d="M9.5 11.5h5" />
          <path d="M9.5 15h5" />
          <path d="M9.5 18.5h3.5" />
        </svg>
      );
    case "insights":
      return (
        <svg {...props}>
          <path d="M12 4.5a5.5 5.5 0 0 0-3.8 9.5c.6.6 1 1.4 1 2.2V17h5.6v-.8c0-.8.4-1.6 1-2.2A5.5 5.5 0 0 0 12 4.5z" />
          <path d="M9.5 20h5" />
          <path d="M10 17h4" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...props}>
          <path d="M4.5 19.5h15" />
          <path d="M7.5 19.5V12" />
          <path d="M12 19.5V8.5" />
          <path d="M16.5 19.5V5.5" />
          <path d="M6 10.5 10 7l3 2 5-4" />
        </svg>
      );
    case "integrations":
      return (
        <svg {...props}>
          <path d="M9 8.5h-2a3.5 3.5 0 0 0 0 7h2" />
          <path d="M15 8.5h2a3.5 3.5 0 0 1 0 7h-2" />
          <path d="M9 12h6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4.5v2" />
          <path d="M12 17.5v2" />
          <path d="M4.5 12h2" />
          <path d="M17.5 12h2" />
          <path d="M6.8 6.8l1.4 1.4" />
          <path d="M15.8 15.8l1.4 1.4" />
          <path d="M17.2 6.8l-1.4 1.4" />
          <path d="M8.2 15.8l-1.4 1.4" />
        </svg>
      );
    case "support":
      return (
        <svg {...props}>
          <path d="M6.5 11a5.5 5.5 0 0 1 11 0v3.5a2 2 0 0 1-2 2H14" />
          <path d="M6.5 15.5h-1a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5h1" />
          <path d="M17.5 15.5h1a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5h-1" />
          <path d="M10 16.5h4" />
        </svg>
      );
    case "logout":
      return (
        <svg {...props}>
          <path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10" />
          <path d="M14 8.5 19 12l-5 3.5" />
          <path d="M19 12H9" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M6 17h12" />
          <path d="M8 17V11a4 4 0 118 0v6" />
          <path d="M10 20a2 2 0 004 0" />
        </svg>
      );
    case "sun":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5" />
          <path d="M12 19.5V22" />
          <path d="M4.9 4.9l1.7 1.7" />
          <path d="M17.4 17.4l1.7 1.7" />
          <path d="M2 12h2.5" />
          <path d="M19.5 12H22" />
          <path d="M4.9 19.1l1.7-1.7" />
          <path d="M17.4 6.6l1.7-1.7" />
        </svg>
      );
    case "moon":
      return (
        <svg {...props}>
          <path d="M18 14.5A6.5 6.5 0 119.5 6a5.5 5.5 0 108.5 8.5z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...props}>
          <path d="m7 10 5 5 5-5" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
