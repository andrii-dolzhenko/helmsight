import styles from './ProjectsWorkspaceBanner.module.css'

const DOTS = Array.from({ length: 96 }, (_, index) => ({
  id: index,
  // A traveling diagonal wave, quiet for most of each 30s cycle.
  delay: ((index % 12) * 0.13 + Math.floor(index / 12) * 0.17),
}))

export function ProjectsWorkspaceBanner({ onViewProjects }) {
  return (
    <section className={styles.banner} aria-label="Projects workspace">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>Portfolio workspace</span>
        <h2>Every project. One clear view.</h2>
        <p>Explore, organize, and manage delivery across your portfolio.</p>
        <button className={styles.action} type="button" onClick={onViewProjects} aria-controls="projects-portfolio">
          View projects <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.halo} />
        <div className={styles.dotMatrix}>
          {DOTS.map(({ id, delay }) => (
            <span key={id} className={styles.dot} style={{ '--wave-delay': `${delay}s` }} />
          ))}
        </div>
      </div>
    </section>
  )
}
