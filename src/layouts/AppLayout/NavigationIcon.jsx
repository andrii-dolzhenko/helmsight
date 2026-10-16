/** Decorative line icons for global navigation, using HelmSight's current theme color. */
export function NavigationIcon({ name }) {
  const shared = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  }

  switch (name) {
    case 'overview':
      return <svg {...shared}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></svg>
    case 'projects':
      return <svg {...shared}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></svg>
    case 'actions':
      return <svg {...shared}><path d="m4 16 11-11a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /><path d="m13.5 6.5 4 4" /></svg>
    case 'risks':
      return <svg {...shared}><path d="M10.3 4.4 2.2 18.6A1.6 1.6 0 0 0 3.6 21h16.8a1.6 1.6 0 0 0 1.4-2.4L13.7 4.4a2 2 0 0 0-3.4 0Z" /><path d="M12 9v5m0 3h.01" /></svg>
    case 'metrics':
      return <svg {...shared}><path d="M3 21h18M5 18v-6h3v6m3 0V6h3v12m3 0v-9h3v9" /></svg>
    case 'reports':
      return <svg {...shared}><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" /><path d="M15 2v6h5M8 13h8M8 17h6" /></svg>
    case 'help':
      return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="M9.3 9a2.8 2.8 0 0 1 5.4.9c0 1.8-2.7 2.3-2.7 4.3M12 17.5h.01" /></svg>
    default:
      return null
  }
}
