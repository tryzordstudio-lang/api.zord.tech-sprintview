export function LoadingLogo({ className = "", title = "Loading" }) {
  return (
    <div className={`brand-loading-mark ${className}`.trim()} role="img" aria-label={title}>
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="44" height="44" rx="14" fill="#2453E6" />
        <rect x="2" y="2" width="44" height="44" rx="14" fill="#5B6CF0" fillOpacity="0.16" />
        <path d="M13 14H35V19H20.2L13 14Z" fill="#FFFFFF" />
        <path d="M24.6 19H35L23.6 29H13.2L24.6 19Z" fill="#DCE7FF" />
        <path d="M13 29H35V34H13V29Z" fill="#FFFFFF" fillOpacity="0.96" />
        <path d="M31.4 14H35V17.6L17 34H12.6V30.7L31.4 14Z" fill="#9DBBFF" fillOpacity="0.78" />
      </svg>
    </div>
  );
}
