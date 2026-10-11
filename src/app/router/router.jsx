import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../../layouts/AppLayout/AppLayout.jsx'
import { ProjectLayout } from '../../layouts/ProjectLayout/ProjectLayout.jsx'
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
    element: <AppLayout />,
    HydrateFallback: RouteLoadingFallback,
    children: [
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
