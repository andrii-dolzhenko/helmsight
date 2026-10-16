import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks.js'
import { loadProjects } from '../../projects/model/projectsSlice.js'
import { loadRisks } from '../../risks/model/risksSlice.js'
import { loadMilestones } from '../../milestones/model/milestonesSlice.js'
import { loadManagementActions } from '../../managementActions/model/managementActionsSlice.js'
import { decisionLabService } from '../../decisionLab/api/decisionLabService.js'
import { deriveNotifications, unreadCount, visibleNotifications } from '../lib/notifications.js'
import { notificationService } from '../api/notificationService.js'

export function useHeaderNotifications(refreshKey = 0) {
  const dispatch = useAppDispatch()
  // AppLayout's isolated tests provide only profile/preferences reducers.
  const projects = useAppSelector((state) => state.projects)
  const risks = useAppSelector((state) => state.risks)
  const actions = useAppSelector((state) => state.managementActions)
  const milestones = useAppSelector((state) => state.milestones)
  const [now, setNow] = useState(() => new Date())
  const [records, setRecords] = useState(() => {
    try { return notificationService.getRecords() } catch { return {} }
  })
  const [dailySession, setDailySession] = useState(() => {
    try { return decisionLabService.getToday() } catch { return { phase: 'complete' } }
  })
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    setNow(new Date())
    try {
      setDailySession(decisionLabService.getToday())
      setError('')
    } catch (caught) {
      setDailySession({ phase: 'complete' }) // Never display a false reminder for unreadable progress.
      setError(caught.message)
    }
    try {
      setRecords(notificationService.getRecords())
    } catch (caught) {
      setError(caught.message)
    }
  }, [])

  useEffect(() => {
    // A modal close changes local persistence outside Redux; synchronize on the next microtask.
    let active = true
    queueMicrotask(() => { if (active) refresh() })
    return () => { active = false }
  }, [refresh, refreshKey])
  useEffect(() => {
    const handleFocus = () => refresh()
    const handleVisibility = () => { if (!document.hidden) refresh() }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh])

  useEffect(() => {
    const loaders = [
      [projects, loadProjects], [risks, loadRisks],
      [actions, loadManagementActions], [milestones, loadMilestones],
    ]
    for (const [source, load] of loaders) {
      if (source?.status === 'idle') dispatch(load())
    }
  }, [dispatch, projects, risks, actions, milestones])

  const ready = [projects, risks, actions, milestones]
    .every((source) => source?.status === 'succeeded')
  const loading = [projects, risks, actions, milestones]
    .some((source) => source && (source.status === 'loading' || source.status === 'idle'))
  const sourceError = [projects, risks, actions, milestones]
    .some((source) => source?.status === 'failed')

  const alerts = useMemo(() => deriveNotifications({
    projects: ready ? projects.items : [],
    risks: ready ? risks.items : [],
    actions: ready ? actions.items : [],
    milestones: ready ? milestones.items : [],
    dailySession, today: now,
  }), [projects, risks, actions, milestones, ready, dailySession, now])

  useEffect(() => {
    if (!ready || error) return
    let active = true
    queueMicrotask(() => {
      if (!active) return
      try { setRecords(notificationService.reconcile(alerts.map((item) => item.id), now)) }
      catch (caught) { setError(caught.message) }
    })
    return () => { active = false }
  }, [ready, alerts, now, error])

  const mutate = useCallback((callback) => {
    try { setRecords(callback()); setError('') }
    catch (caught) { setError(caught.message) }
  }, [])
  return {
    alerts: visibleNotifications(alerts, records),
    unread: unreadCount(alerts, records),
    records, loading, error: error || (sourceError ? 'Project notifications could not be loaded.' : ''),
    refresh,
    markRead: (ids) => mutate(() => notificationService.markRead(ids)),
    dismiss: (id) => mutate(() => notificationService.dismiss(id)),
  }
}
