export function BrandLogo({ className = "", title = "Zord SprintView" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="44" height="44" rx="14" fill="#2453E6" />
      <rect x="2" y="2" width="44" height="44" rx="14" fill="#5B6CF0" fillOpacity="0.16" />
      <path d="M13 14h22v5H20.2L13 14Z" fill="#FFFFFF" />
      <path d="M24.6 19H35l-11.4 10H13.2L24.6 19Z" fill="#DCE7FF" />
      <path d="M13 29h22v5H13v-5Z" fill="#FFFFFF" fillOpacity="0.96" />
      <path d="M31.4 14H35v3.6L17 34h-4.4v-3.3L31.4 14Z" fill="#9DBBFF" fillOpacity="0.78" />
    </svg>
  );
}
