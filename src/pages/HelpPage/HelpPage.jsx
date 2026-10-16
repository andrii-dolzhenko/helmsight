import { Link } from 'react-router'
import { HELP_FAQS, HELP_TOPICS } from './helpContent.js'
import styles from './HelpPage.module.css'
import { HelpHeroAnimation } from './HelpHeroAnimation.jsx'

function TopicIcon({ name }) {
  const shared = {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
    strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
  }

  switch (name) {
    case 'compass':
      return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="m15 9-2 4-4 2 2-4 4-2Z" /></svg>
    case 'folders':
      return <svg {...shared}><path d="M3 7V5a2 2 0 0 1 2-2h5l2 2h6a2 2 0 0 1 2 2v2" /><path d="M3 10h18l-2 10H5L3 10Z" /></svg>
    case 'chart':
      return <svg {...shared}><path d="M3 21h18M6 17v-5h3v5m3 0V6h3v11m3 0V9h3v8" /></svg>
    case 'archive':
      return <svg {...shared}><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" /></svg>
    case 'bell':
      return <svg {...shared}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>
    default:
      return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.6 2.6 0 0 1 5 .7c0 1.8-2.5 2.3-2.5 4.2M12 17.5h.01" /></svg>
  }
}

function FaqChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function HelpPage() {
  return (
    <div className={styles.root}>
      <header className={styles.hero} aria-labelledby="help-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>WORKSPACE GUIDE</span>
          <h1 id="help-title">Help Center</h1>
          <p>Find your way around HelmSight, understand project performance and get more from your workspace.</p>
          <a className={styles.heroLink} href="#help-topics">Explore guides <span aria-hidden="true">↗</span></a>
        </div>
        <HelpHeroAnimation />
      </header>

      <section className={styles.topicsSection} id="help-topics" aria-labelledby="browse-guides-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>FIND AN ANSWER</span>
            <h2 id="browse-guides-title">Explore by topic</h2>
          </div>
          <span className={styles.smallMeta}>Practical guides</span>
        </div>
        <div className={styles.topicGrid}>
          {HELP_TOPICS.map((topic) => (
            <a className={styles.topicCard} key={topic.id} href={`#${topic.id}`}>
              <span className={styles.topicIcon}><TopicIcon name={topic.icon} /></span>
              <strong>{topic.title}</strong>
              <span className={styles.topicSummary}>{topic.summary}</span>
              <span className={styles.topicAction}>Read guide <span aria-hidden="true">→</span></span>
            </a>
          ))}
          <a className={styles.topicCard} href="#frequently-asked-questions">
            <span className={styles.topicIcon}><TopicIcon name="help" /></span>
            <strong>Frequently Asked Questions</strong>
            <span className={styles.topicSummary}>Quick answers to common workspace questions.</span>
            <span className={styles.topicAction}>See answers <span aria-hidden="true">→</span></span>
          </a>
        </div>
      </section>

      <div className={styles.guideSections}>
        {HELP_TOPICS.map((topic, index) => (
          <section className={styles.guideSection} id={topic.id} key={topic.id} aria-labelledby={`${topic.id}-title`}>
            <div className={styles.guideHeading}>
              <span className={styles.topicIcon}><TopicIcon name={topic.icon} /></span>
              <div>
                <span className={styles.eyebrow}>GUIDE {String(index + 1).padStart(2, '0')}</span>
                <h2 id={`${topic.id}-title`}>{topic.title}</h2>
                <p>{topic.intro}</p>
              </div>
            </div>
            <div className={styles.guideGrid}>
              {topic.guides.map((guide) => (
                <article className={styles.guideCard} key={guide.title}>
                  <h3>{guide.title}</h3>
                  {guide.description ? <p>{guide.description}</p> : null}
                  <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                  <Link className={styles.inlineLink} to={guide.link.to}>
                    {guide.link.label} <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className={styles.faqSection} id="frequently-asked-questions" aria-labelledby="faq-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>GOOD TO KNOW</span>
            <h2 id="faq-title">Frequently Asked Questions</h2>
          </div>
        </div>
        <div className={styles.faqList}>
          {HELP_FAQS.map((item) => (
            <details className={styles.faqItem} key={item.question}>
              <summary>{item.question}<span className={styles.faqChevron} aria-hidden="true"><FaqChevron /></span></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <aside className={styles.dataNotice} aria-labelledby="data-notice-title">
        <span className={styles.noticeIcon}><TopicIcon name="archive" /></span>
        <div>
          <h2 id="data-notice-title">A note about your workspace data</h2>
          <p>Your information stays in the browser where you work. It is not automatically synchronized to other devices, and clearing browser data can remove it. Take care before deleting records or clearing site data.</p>
        </div>
      </aside>
    </div>
  )
}
