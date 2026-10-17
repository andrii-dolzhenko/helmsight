import styles from './AuthForm.module.css'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.19-2.09H12v3.97h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.41 13.99A6 6 0 0 1 6.1 12c0-.69.12-1.36.31-1.99V7.42H3.07A10 10 0 0 0 2 12c0 1.61.38 3.16 1.07 4.58l3.34-2.59Z"/>
      <path fill="#EA4335" d="M12 5.91c1.48 0 2.82.51 3.86 1.52l2.9-2.9A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.93 5.42l3.34 2.59C7.2 7.66 9.4 5.91 12 5.91Z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.1.69-.22.69-.49v-1.7c-2.81.61-3.4-1.2-3.4-1.2-.46-1.17-1.12-1.48-1.12-1.48-.92-.63.07-.61.07-.61 1.02.07 1.56 1.05 1.56 1.05.91 1.55 2.38 1.1 2.96.84.09-.66.36-1.1.65-1.35-2.24-.25-4.59-1.12-4.59-4.94 0-1.09.4-1.99 1.05-2.69-.11-.26-.46-1.27.1-2.65 0 0 .86-.27 2.75 1.03a9.54 9.54 0 0 1 5 0c1.9-1.3 2.75-1.03 2.75-1.03.56 1.38.21 2.39.1 2.65.66.7 1.05 1.6 1.05 2.69 0 3.83-2.36 4.69-4.61 4.94.36.31.69.92.69 1.86V21c0 .27.19.59.7.49A10 10 0 0 0 12 2Z"/>
    </svg>
  )
}

export function SocialAuthButtons({ onSelect }) {
  return (
    <div className={styles.socialArea}>
      <p className={styles.divider}><span>or continue with</span></p>
      <div className={styles.socialButtons}>
        <button type="button" onClick={() => onSelect('Google')}><GoogleIcon /> Continue with Google</button>
        <button type="button" onClick={() => onSelect('GitHub')}><GitHubIcon /> Continue with GitHub</button>
      </div>
    </div>
  )
}
