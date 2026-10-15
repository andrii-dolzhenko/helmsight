import { useCallback, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  clearProjectMutationState,
  saveProjectGovernance,
  selectProjectMutationError,
  selectProjectMutationStatus,
} from '../../features/projects/model/projectsSlice.js'
import {
  getGovernanceEngagementLabel,
  getGovernanceLevelLabel,
  getStakeholderManagementStrategy,
  isCharterConfigured,
  normalizeGovernance,
} from '../../features/projects/lib/governance.js'
import {
  CharterForm,
  CommunicationForm,
  StakeholderForm,
} from '../../features/projects/ui/GovernanceForms.jsx'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { StatusToast } from '../../shared/ui/StatusToast/StatusToast.jsx'
import styles from './GovernancePage.module.css'

const SECTION_IDS = Object.freeze({
  charter: 'governance-charter',
  stakeholders: 'governance-stakeholders',
  communications: 'governance-communications',
})

function formatTimestamp(value) {
  if (!value) return 'Not saved yet'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function SectionIcon({ type }) {
  if (type === 'stakeholders') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.6-3.2 2.5-5 5.5-5s4.9 1.8 5.5 5" />
        <circle cx="17" cy="9" r="2.2" />
        <path d="M15.6 14.5c2.8-.4 4.5 1.1 4.9 4.5" />
      </svg>
    )
  }

  if (type === 'communications') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10.5v3l10 4V6.5l-10 4Z" />
        <path d="M14 9h3.5l2 2v2l-2 2H14" />
        <path d="m6 14.3 1 4.2h3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h9l3 3V20H6z" />
      <path d="M15 3.5V7h3" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  )
}

export function TextList({ items, emptyText = 'Not defined yet.', columned = false }) {
  if (!items?.length) return <p className={styles.emptyValue}>{emptyText}</p>

  return (
    <ul className={`${styles.valueList} ${columned ? styles.columnedValueList : ''}`}>
      {items.map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}
    </ul>
  )
}

function CharterField({ label, children, wide = false, full = false }) {
  const className = [
    styles.charterField,
    wide ? styles.charterFieldWide : '',
    full ? styles.charterFieldFull : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function ScrollTabs() {
  const scrollTo = (id) => {
    const section = document.getElementById(id)
    if (!section) return

    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    ) || 16
    const stickyHeaderOffset = 4.5 * rootFontSize
    const contentGap = 1.1 * rootFontSize
    const targetTop = section.getBoundingClientRect().top + window.scrollY - stickyHeaderOffset - contentGap
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    window.scrollTo({
      top: Math.max(0, targetTop),
      left: 0,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <nav className={styles.sectionTabs} aria-label="Governance sections">
      <button type="button" onClick={() => scrollTo(SECTION_IDS.charter)}>Project Charter</button>
      <button type="button" onClick={() => scrollTo(SECTION_IDS.stakeholders)}>Stakeholder Register</button>
      <button type="button" onClick={() => scrollTo(SECTION_IDS.communications)}>Communication Plan</button>
    </nav>
  )
}

function CompactDetail({ children }) {
  return children ? <span className={styles.compactDetail}>{children}</span> : null
}

export function GovernancePage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const mutationStatus = useAppSelector(selectProjectMutationStatus)
  const mutationError = useAppSelector(selectProjectMutationError)
  const [editor, setEditor] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [notification, setNotification] = useState(null)
  const governance = useMemo(() => normalizeGovernance(project.governance), [project.governance])
  const archived = Boolean(project.archivedAt)
  const saving = mutationStatus === 'loading'
  const charterReady = isCharterConfigured(governance.charter)
  const dismissNotification = useCallback(() => setNotification(null), [])

  const showSuccess = (message) => {
    setNotification({ id: globalThis.crypto.randomUUID(), message })
  }

  const openEditor = (nextEditor) => {
    dispatch(clearProjectMutationState())
    setEditor(nextEditor)
  }

  const saveGovernance = async (nextGovernance, successMessage) => {
    try {
      await dispatch(saveProjectGovernance({ projectId: project.id, governance: nextGovernance })).unwrap()
      setEditor(null)
      showSuccess(successMessage)
      return true
    } catch {
      return false
    }
  }

  const handleCharterSave = (values) => {
    const timestamp = new Date().toISOString()
    return saveGovernance(
      {
        ...governance,
        charter: {
          ...governance.charter,
          ...values,
          version: Math.max(1, governance.charter.version + 1),
          updatedAt: timestamp,
        },
      },
      'Project Charter saved',
    )
  }

  const handleStakeholderSave = (values) => {
    const timestamp = new Date().toISOString()
    const stakeholder = editor?.id
      ? governance.stakeholders.find((item) => item.id === editor.id)
      : null
    const nextStakeholder = stakeholder
      ? { ...stakeholder, ...values, updatedAt: timestamp }
      : {
          id: globalThis.crypto.randomUUID(),
          ...values,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
    const nextStakeholders = stakeholder
      ? governance.stakeholders.map((item) => item.id === stakeholder.id ? nextStakeholder : item)
      : [...governance.stakeholders, nextStakeholder]

    return saveGovernance(
      { ...governance, stakeholders: nextStakeholders },
      stakeholder ? 'Stakeholder updated' : 'Stakeholder added',
    )
  }

  const handleCommunicationSave = (values) => {
    const timestamp = new Date().toISOString()
    const communication = editor?.id
      ? governance.communications.find((item) => item.id === editor.id)
      : null
    const nextCommunication = communication
      ? { ...communication, ...values, updatedAt: timestamp }
      : {
          id: globalThis.crypto.randomUUID(),
          ...values,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
    const nextCommunications = communication
      ? governance.communications.map((item) => item.id === communication.id ? nextCommunication : item)
      : [...governance.communications, nextCommunication]

    return saveGovernance(
      { ...governance, communications: nextCommunications },
      communication ? 'Communication updated' : 'Communication added',
    )
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return

    const nextGovernance = pendingDelete.type === 'stakeholder'
      ? {
          ...governance,
          stakeholders: governance.stakeholders.filter((item) => item.id !== pendingDelete.id),
        }
      : {
          ...governance,
          communications: governance.communications.filter((item) => item.id !== pendingDelete.id),
        }

    const successMessage = pendingDelete.type === 'stakeholder'
      ? 'Stakeholder deleted'
      : 'Communication deleted'
    const saved = await saveGovernance(nextGovernance, successMessage)
    if (saved) setPendingDelete(null)
  }

  const activeStakeholder = editor?.type === 'stakeholder'
    ? governance.stakeholders.find((item) => item.id === editor.id)
    : null
  const activeCommunication = editor?.type === 'communication'
    ? governance.communications.find((item) => item.id === editor.id)
    : null

  return (
    <section className={styles.root}>
      <StatusToast
        key={notification?.id}
        message={notification?.message}
        onDismiss={dismissNotification}
      />

      <header className={styles.header} data-ui-page-header>
        <span className={styles.eyebrow}>Project foundation</span>
        <div className={styles.titleRow} data-ui-page-title-row>
          <h2>Governance</h2>
          <ScrollTabs />
        </div>
        <p>Keep the charter, stakeholder map, and communication cadence explicit throughout delivery.</p>
      </header>

      {archived ? (
        <div className={styles.archiveBanner}>
          <strong>Archived project</strong>
          <span>Governance records remain available for review. Restore the project to change them.</span>
        </div>
      ) : null}

      <div className={styles.headerMeta} aria-label="Governance summary">
        <span>{charterReady ? 'Charter ready' : 'Charter needs setup'}</span>
        <span>{governance.stakeholders.length} stakeholders</span>
        <span>{governance.communications.length} communications</span>
      </div>

      <section className={styles.sectionCard} id={SECTION_IDS.charter}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <span className={styles.sectionIcon}><SectionIcon type="charter" /></span>
            <div>
              <span className={styles.sectionEyebrow}>Foundation</span>
              <div data-ui-section-title-row>
                <h3>Project Charter</h3>
                {!archived && !editor ? (
                  <button className={styles.secondaryAction} data-ui-button="secondary" type="button" onClick={() => openEditor({ type: 'charter' })}>
                    {charterReady ? 'Edit charter' : 'Set up charter'}
                  </button>
                ) : null}
              </div>
              <p>Define why the project exists, what it covers, and the boundaries that guide delivery.</p>
            </div>
          </div>
        </div>

        {editor?.type === 'charter' ? (
          <CharterForm
            charter={governance.charter}
            saving={saving}
            onCancel={() => setEditor(null)}
            onSave={handleCharterSave}
          />
        ) : (
          <>
            <dl className={styles.charterGrid}>
              <CharterField label="Project purpose / business need" wide>
                {governance.charter.purpose || <span className={styles.emptyValue}>Not defined yet.</span>}
              </CharterField>
              <CharterField label="Primary objective / expected outcome">
                {governance.charter.primaryObjective || <span className={styles.emptyValue}>Not defined yet.</span>}
              </CharterField>
              <CharterField label="Project sponsor">
                {governance.charter.sponsor || <span className={styles.emptyValue}>Not defined yet.</span>}
              </CharterField>
              <CharterField label="Project manager / owner">
                {governance.charter.projectManager || <span className={styles.emptyValue}>Not defined yet.</span>}
              </CharterField>
              <CharterField label="Objectives"><TextList items={governance.charter.objectives} /></CharterField>
              <CharterField label="In scope"><TextList items={governance.charter.inScope} /></CharterField>
              <CharterField label="Key deliverables"><TextList items={governance.charter.deliverables} /></CharterField>
              <CharterField label="Out of scope"><TextList items={governance.charter.outOfScope} /></CharterField>
              <CharterField label="Expected benefits"><TextList items={governance.charter.benefits} /></CharterField>
              <CharterField label="Key constraints"><TextList items={governance.charter.constraints} /></CharterField>
              <CharterField label="Key assumptions"><TextList items={governance.charter.assumptions} /></CharterField>
              <CharterField label="Acceptance / approval criteria" full>
                <TextList items={governance.charter.acceptanceCriteria} columned />
              </CharterField>
            </dl>

            <div className={styles.documentMeta}>
              <span>Version {governance.charter.version || 0}</span>
              <span>Updated {formatTimestamp(governance.charter.updatedAt)}</span>
              <span>Owner {governance.charter.projectManager || 'Not assigned'}</span>
            </div>
          </>
        )}
      </section>

      <section className={styles.sectionCard} id={SECTION_IDS.stakeholders}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <span className={styles.sectionIcon}><SectionIcon type="stakeholders" /></span>
            <div>
              <span className={styles.sectionEyebrow}>People & influence</span>
              <div data-ui-section-title-row>
                <h3>Stakeholder Register</h3>
                {!archived && !editor ? (
                  <button className={styles.primaryAction} data-ui-button="primary" type="button" onClick={() => openEditor({ type: 'stakeholder', id: null })}>
                    Add stakeholder
                  </button>
                ) : null}
              </div>
              <p>Track responsibility, expectations, influence, interest, and the engagement posture the project needs.</p>
            </div>
          </div>
        </div>

        {editor?.type === 'stakeholder' ? (
          <StakeholderForm
            stakeholder={activeStakeholder}
            saving={saving}
            onCancel={() => setEditor(null)}
            onSave={handleStakeholderSave}
          />
        ) : null}

        {governance.stakeholders.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>No stakeholders registered yet.</strong>
            <span>Add the sponsor, decision-makers, delivery partners, and groups that influence outcomes.</span>
          </div>
        ) : (
          <div className={styles.register}>
            <div className={`${styles.registerHeader} ${styles.stakeholderGrid}`} aria-hidden="true">
              <span>Stakeholder</span><span>Role / organization</span><span>Influence</span><span>Interest</span><span>Engagement</span><span>Strategy</span><span>Communication notes</span><span>Actions</span>
            </div>
            {governance.stakeholders.map((stakeholder) => {
              const strategy = getStakeholderManagementStrategy(stakeholder.influence, stakeholder.interest)
              return (
                <article className={`${styles.registerRow} ${styles.stakeholderGrid}`} key={stakeholder.id}>
                  <div className={styles.identityCell} data-label="Stakeholder">
                    <strong>{stakeholder.name}</strong>
                    <CompactDetail>{[stakeholder.email, stakeholder.timeZone].filter(Boolean).join(' · ')}</CompactDetail>
                  </div>
                  <div className={styles.identityCell} data-label="Role / organization">
                    <span className={styles.primaryCellText}>{stakeholder.role || '—'}</span>
                    <CompactDetail>{stakeholder.organization}</CompactDetail>
                  </div>
                  <div data-label="Influence"><span className={`${styles.badge} ${styles[stakeholder.influence] ?? ''}`}>{getGovernanceLevelLabel(stakeholder.influence)}</span></div>
                  <div data-label="Interest"><span className={`${styles.badge} ${styles[stakeholder.interest] ?? ''}`}>{getGovernanceLevelLabel(stakeholder.interest)}</span></div>
                  <div data-label="Engagement"><span className={`${styles.badge} ${styles[stakeholder.engagement] ?? ''}`}>{getGovernanceEngagementLabel(stakeholder.engagement)}</span></div>
                  <div data-label="Strategy"><span className={styles.strategyBadge}>{strategy}</span></div>
                  <div className={styles.notesCell} data-label="Communication notes" title={stakeholder.communicationNotes || stakeholder.expectations || stakeholder.responsibility}>
                    {stakeholder.communicationNotes || stakeholder.expectations || stakeholder.responsibility || '—'}
                  </div>
                  {!archived ? (
                    <div className={styles.rowActions} data-label="Actions">
                      <button data-ui-button="secondary" data-ui-size="sm" type="button" disabled={Boolean(editor)} onClick={() => openEditor({ type: 'stakeholder', id: stakeholder.id })}>Edit</button>
                      <button className={styles.deleteAction} data-ui-button="danger" data-ui-size="sm" type="button" disabled={Boolean(editor)} onClick={() => setPendingDelete({ type: 'stakeholder', id: stakeholder.id, label: stakeholder.name })}>Delete</button>
                    </div>
                  ) : <span className={styles.readOnlyLabel}>Read only</span>}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className={styles.sectionCard} id={SECTION_IDS.communications}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <span className={styles.sectionIcon}><SectionIcon type="communications" /></span>
            <div>
              <span className={styles.sectionEyebrow}>Operating cadence</span>
              <div data-ui-section-title-row>
                <h3>Communication Plan</h3>
                {!archived && !editor ? (
                  <button className={styles.primaryAction} data-ui-button="primary" type="button" onClick={() => openEditor({ type: 'communication', id: null })}>
                    Add communication
                  </button>
                ) : null}
              </div>
              <p>Define audience, message, artifacts, channel, frequency, timing, and accountable owner.</p>
            </div>
          </div>
        </div>

        {editor?.type === 'communication' ? (
          <CommunicationForm
            communication={activeCommunication}
            saving={saving}
            onCancel={() => setEditor(null)}
            onSave={handleCommunicationSave}
          />
        ) : null}

        {governance.communications.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>No communication cadence yet.</strong>
            <span>Add the recurring updates and forums needed to keep stakeholders aligned.</span>
          </div>
        ) : (
          <div className={styles.register}>
            <div className={`${styles.registerHeader} ${styles.communicationGrid}`} aria-hidden="true">
              <span>Audience</span><span>Communication / topic</span><span>Channel</span><span>Frequency</span><span>Owner</span><span>Purpose / deliverable</span><span>Actions</span>
            </div>
            {governance.communications.map((communication) => (
              <article className={`${styles.registerRow} ${styles.communicationGrid}`} key={communication.id}>
                <div className={styles.communicationIdentity} data-label="Audience"><strong>{communication.audience}</strong></div>
                <div className={styles.identityCell} data-label="Communication / topic">
                  <span className={styles.primaryCellText}>{communication.topic}</span>
                  <CompactDetail>{communication.timingTrigger}</CompactDetail>
                </div>
                <div data-label="Channel">{communication.channel}</div>
                <div data-label="Frequency"><span className={styles.frequencyBadge}>{communication.frequency}</span></div>
                <div data-label="Owner">{communication.owner}</div>
                <div className={styles.notesCell} data-label="Purpose / deliverable" title={[communication.purpose, ...(communication.deliverables ?? [])].filter(Boolean).join(' · ')}>
                  {communication.purpose || communication.deliverables?.join(', ') || '—'}
                  {communication.purpose && communication.deliverables?.length ? (
                    <CompactDetail>{communication.deliverables.join(', ')}</CompactDetail>
                  ) : null}
                </div>
                {!archived ? (
                  <div className={styles.rowActions} data-label="Actions">
                    <button data-ui-button="secondary" data-ui-size="sm" type="button" disabled={Boolean(editor)} onClick={() => openEditor({ type: 'communication', id: communication.id })}>Edit</button>
                    <button className={styles.deleteAction} data-ui-button="danger" data-ui-size="sm" type="button" disabled={Boolean(editor)} onClick={() => setPendingDelete({ type: 'communication', id: communication.id, label: communication.topic })}>Delete</button>
                  </div>
                ) : <span className={styles.readOnlyLabel}>Read only</span>}
              </article>
            ))}
          </div>
        )}
      </section>

      {mutationError ? <div className={styles.mutationError} role="alert">{mutationError}</div> : null}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        eyebrow="Governance record"
        title={`Delete ${pendingDelete?.label ?? 'record'}?`}
        message="This record will be removed from the local project governance data."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </section>
  )
}
