import { useId } from 'react'

export function BrainIcon({ className = '' }) {
  const gradientId = useId()
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="14" y1="18" x2="85" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#27E6E4" />
          <stop offset="0.53" stopColor="#19A8F2" />
          <stop offset="1" stopColor="#165CFA" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M46 23c-1-10-16-13-23-5-3 3-4 7-3 11-11 2-16 14-10 23-5 10 3 19 13 20-1 11 13 16 21 8l2-5V23Z" />
        <path d="M50 23c1-10 16-13 23-5 3 3 4 7 3 11 11 2 16 14 10 23 5 10-3 19-13 20 1 11-13 16-21 8l-2-5V23Z" />
        <path d="M26 33c8 0 12 5 12 11v30M23 60l13-7M70 33c-8 0-12 5-12 11v30M73 60l-13-7" strokeWidth="3" />
        <circle cx="27" cy="33" r="4" fill="#062B31" strokeWidth="3" />
        <circle cx="23" cy="60" r="4" fill="#062B31" strokeWidth="3" />
        <circle cx="69" cy="33" r="4" fill="#062B31" strokeWidth="3" />
        <circle cx="73" cy="60" r="4" fill="#062B31" strokeWidth="3" />
      </g>
    </svg>
  )
}
