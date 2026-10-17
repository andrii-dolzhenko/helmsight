import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../../layouts/AppLayout/AppLayout.jsx'
import { ProjectLayout } from '../../layouts/ProjectLayout/ProjectLayout.jsx'
import { AuthLayout } from '../../layouts/AuthLayout/AuthLayout.jsx'
import { RouteLoadingFallback } from './RouteLoadingFallback.jsx'

// Import the matched page only when its route is visited.
const loadPage = (importPage, exportName) => async () => ({
  Component: (await importPage())[exportName],
})

export const router = createBrowserRouter([
  {
    path: '/',
    HydrateFallback: RouteLoadingFallback,
    lazy: loadPage(() => import('../../pages/LandingPage/LandingPage.jsx'), 'LandingPage'),
  },
  {
    element: <AuthLayout />,
    HydrateFallback: RouteLoadingFallback,
    children: [
      { path: '/sign-in', lazy: loadPage(() => import('../../pages/SignInPage/SignInPage.jsx'), 'SignInPage') },
      { path: '/sign-up', lazy: loadPage(() => import('../../pages/SignUpPage/SignUpPage.jsx'), 'SignUpPage') },
      { path: '/forgot-password', lazy: loadPage(() => import('../../pages/ForgotPasswordPage/ForgotPasswordPage.jsx'), 'ForgotPasswordPage') },
      { path: '/reset-password', lazy: loadPage(() => import('../../pages/ResetPasswordPage/ResetPasswordPage.jsx'), 'ResetPasswordPage') },
    ],
  },
  {
    element: <AppLayout />,
    HydrateFallback: RouteLoadingFallback,
    children: [
      {
        path: '/help',
        lazy: loadPage(() => import('../../pages/HelpPage/HelpPage.jsx'), 'HelpPage'),
      },
      {
        path: '/settings',
        lazy: loadPage(() => import('../../pages/SettingsPage/SettingsPage.jsx'), 'SettingsPage'),
      },
      {
        path: '/overview',
        lazy: loadPage(() => import('../../pages/GlobalOverviewPage/GlobalOverviewPage.jsx'), 'GlobalOverviewPage'),
      },
      {
        path: '/actions',
        lazy: loadPage(() => import('../../pages/GlobalActionsPage/GlobalActionsPage.jsx'), 'GlobalActionsPage'),
      },
      {
        path: '/risks',
        lazy: loadPage(() => import('../../pages/GlobalRisksPage/GlobalRisksPage.jsx'), 'GlobalRisksPage'),
      },
      {
        path: '/metrics',
        lazy: loadPage(() => import('../../pages/GlobalMetricsPage/GlobalMetricsPage.jsx'), 'GlobalMetricsPage'),
      },
      {
        path: '/reports',
        lazy: loadPage(() => import('../../pages/GlobalReportsPage/GlobalReportsPage.jsx'), 'GlobalReportsPage'),
      },
      {
        path: '/meetings',
        lazy: loadPage(() => import('../../pages/GlobalMeetingsPage/GlobalMeetingsPage.jsx'), 'GlobalMeetingsPage'),
      },
      {
        path: '/projects',
        lazy: loadPage(() => import('../../pages/ProjectsPage/ProjectsPage.jsx'), 'ProjectsPage'),
      },
      {
        path: '/projects/new',
        lazy: loadPage(() => import('../../pages/NewProjectPage/NewProjectPage.jsx'), 'NewProjectPage'),
      },
      {
        path: '/projects/:projectId/edit',
        lazy: loadPage(() => import('../../pages/EditProjectPage.jsx'), 'EditProjectPage'),
      },
      {
        path: '/projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, lazy: loadPage(() => import('../../pages/ProjectOverviewPage/ProjectOverviewPage.jsx'), 'ProjectOverviewPage') },
          { path: 'governance', lazy: loadPage(() => import('../../pages/GovernancePage/GovernancePage.jsx'), 'GovernancePage') },
          { path: 'success-criteria', lazy: loadPage(() => import('../../pages/SuccessCriteriaPage/SuccessCriteriaPage.jsx'), 'SuccessCriteriaPage') },
          { path: 'success-criteria/new', lazy: loadPage(() => import('../../pages/SuccessCriterionEditorPage/SuccessCriterionEditorPage.jsx'), 'SuccessCriterionEditorPage') },
          {
            path: 'success-criteria/:criterionId/edit',
            lazy: loadPage(() => import('../../pages/SuccessCriterionEditorPage/SuccessCriterionEditorPage.jsx'), 'SuccessCriterionEditorPage'),
          },
          { path: 'risks', lazy: loadPage(() => import('../../pages/RisksPage/RisksPage.jsx'), 'RisksPage') },
          { path: 'risks/new', lazy: loadPage(() => import('../../pages/RiskEditorPage/RiskEditorPage.jsx'), 'RiskEditorPage') },
          { path: 'risks/:riskId', lazy: loadPage(() => import('../../pages/RiskDetailPage/RiskDetailPage.jsx'), 'RiskDetailPage') },
          { path: 'risks/:riskId/edit', lazy: loadPage(() => import('../../pages/RiskEditorPage/RiskEditorPage.jsx'), 'RiskEditorPage') },
          { path: 'milestones', lazy: loadPage(() => import('../../pages/MilestonesPage/MilestonesPage.jsx'), 'MilestonesPage') },
          { path: 'milestones/new', lazy: loadPage(() => import('../../pages/MilestoneEditorPage/MilestoneEditorPage.jsx'), 'MilestoneEditorPage') },
          { path: 'milestones/:milestoneId/edit', lazy: loadPage(() => import('../../pages/MilestoneEditorPage/MilestoneEditorPage.jsx'), 'MilestoneEditorPage') },
          { path: 'metrics', lazy: loadPage(() => import('../../pages/MetricsPage/MetricsPage.jsx'), 'MetricsPage') },
          { path: 'metrics/baseline', lazy: loadPage(() => import('../../pages/MetricsBaselineEditorPage/MetricsBaselineEditorPage.jsx'), 'MetricsBaselineEditorPage') },
          { path: 'metrics/snapshots/new', lazy: loadPage(() => import('../../pages/MetricsSnapshotEditorPage/MetricsSnapshotEditorPage.jsx'), 'MetricsSnapshotEditorPage') },
          { path: 'metrics/snapshots/:snapshotId/edit', lazy: loadPage(() => import('../../pages/MetricsSnapshotEditorPage/MetricsSnapshotEditorPage.jsx'), 'MetricsSnapshotEditorPage') },
          { path: 'reports', lazy: loadPage(() => import('../../pages/ReportsPage/ReportsPage.jsx'), 'ReportsPage') },
          { path: 'reports/new', lazy: loadPage(() => import('../../pages/ReportsPage/ReportDetailPage.jsx'), 'ReportDetailPage') },
          { path: 'reports/:reportId', lazy: loadPage(() => import('../../pages/ReportsPage/ReportDetailPage.jsx'), 'ReportDetailPage') },
          { path: 'actions', lazy: loadPage(() => import('../../pages/ActionsPage/ActionsPage.jsx'), 'ActionsPage') },
          { path: 'actions/new', lazy: loadPage(() => import('../../pages/ActionEditorPage/ActionEditorPage.jsx'), 'ActionEditorPage') },
          { path: 'actions/:actionId/edit', lazy: loadPage(() => import('../../pages/ActionEditorPage/ActionEditorPage.jsx'), 'ActionEditorPage') },
          { path: 'meetings', lazy: loadPage(() => import('../../pages/MeetingsPage/MeetingsPage.jsx'), 'MeetingsPage') },
          { path: 'meetings/new', lazy: loadPage(() => import('../../pages/MeetingsPage/MeetingNoteEditorPage.jsx'), 'MeetingNoteEditorPage') },
          { path: 'meetings/:meetingId', lazy: loadPage(() => import('../../pages/MeetingsPage/MeetingNoteDetailPage.jsx'), 'MeetingNoteDetailPage') },
          { path: 'meetings/:meetingId/edit', lazy: loadPage(() => import('../../pages/MeetingsPage/MeetingNoteEditorPage.jsx'), 'MeetingNoteEditorPage') },
          { path: 'lessons', lazy: loadPage(() => import('../../pages/LessonsLearnedPage/LessonsLearnedPage.jsx'), 'LessonsLearnedPage') },
          { path: 'lessons/new', lazy: loadPage(() => import('../../pages/LessonsLearnedPage/LessonEditorPage.jsx'), 'LessonEditorPage') },
          { path: 'lessons/:lessonId', lazy: loadPage(() => import('../../pages/LessonsLearnedPage/LessonDetailPage.jsx'), 'LessonDetailPage') },
          { path: 'lessons/:lessonId/edit', lazy: loadPage(() => import('../../pages/LessonsLearnedPage/LessonEditorPage.jsx'), 'LessonEditorPage') },
        ],
      },
    ],
  },
  {
    path: '*',
    HydrateFallback: RouteLoadingFallback,
    lazy: loadPage(() => import('../../pages/NotFoundPage/NotFoundPage.jsx'), 'NotFoundPage'),
  },
], {
  basename: import.meta.env.BASE_URL,
})

// Keep the first-paint canvas in sync during SPA navigation, not just reloads.
router.subscribe(({ location }) => {
  const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '')
  const pathname = location.pathname
  const routePath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ? pathname.slice(basePath.length) || '/'
    : pathname
  const route = routePath.replace(/\/+$/, '') || '/'
  const isPublic = ['/', '/sign-in', '/sign-up', '/forgot-password', '/reset-password'].includes(route)
  const root = document.documentElement

  if (isPublic) root.dataset.publicPage = 'true'
  else delete root.dataset.publicPage

  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    isPublic ? '#02090d' : root.dataset.theme === 'dark' ? '#111512' : '#f5f1e8',
  )
})
