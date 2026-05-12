export function SidebarBrandLogo({ className = "", title = "Spring View" }) {
  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="10" width="288" height="288" rx="84" fill="#1236B0" fillOpacity="0.3" />
      <rect width="300" height="300" rx="88" fill="#2453E6" />
      <rect width="300" height="300" rx="88" fill="#5B6CF0" fillOpacity="0.16" />
      <path d="M52 80h196v37H70L52 80Z" fill="#FFFFFF" />
      <path d="M190 80h58V58h-32v22Z" fill="#FFFFFF" />
      <path d="M216 58h32v22h-32V58Z" fill="#DCE7FF" />
      <path d="M52 126h150l-18 37H52v-37Z" fill="#DCE7FF" />
      <path d="M158 126h44l-18 37h-44l18-37Z" fill="#9DBBFF" fillOpacity="0.78" />
      <path d="M52 172h196v37H52v-37Z" fill="#FFFFFF" fillOpacity="0.96" />
    </svg>
  );
}
