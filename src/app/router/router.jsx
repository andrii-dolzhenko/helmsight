import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../../layouts/AppLayout/AppLayout.jsx'
import { ProjectLayout } from '../../layouts/ProjectLayout/ProjectLayout.jsx'
import { LandingPage } from '../../pages/LandingPage/LandingPage.jsx'
import { ProjectsPage } from '../../pages/ProjectsPage/ProjectsPage.jsx'
import { NewProjectPage } from '../../pages/NewProjectPage/NewProjectPage.jsx'
import { EditProjectPage } from '../../pages/EditProjectPage.jsx'
import { ProjectOverviewPage } from '../../pages/ProjectOverviewPage/ProjectOverviewPage.jsx'
import { GovernancePage } from '../../pages/GovernancePage/GovernancePage.jsx'
import { RisksPage } from '../../pages/RisksPage/RisksPage.jsx'
import { RiskEditorPage } from '../../pages/RiskEditorPage/RiskEditorPage.jsx'
import { RiskDetailPage } from '../../pages/RiskDetailPage/RiskDetailPage.jsx'
import { SuccessCriteriaPage } from '../../pages/SuccessCriteriaPage/SuccessCriteriaPage.jsx'
import { SuccessCriterionEditorPage } from '../../pages/SuccessCriterionEditorPage/SuccessCriterionEditorPage.jsx'
import { MilestonesPage } from '../../pages/MilestonesPage/MilestonesPage.jsx'
import { MilestoneEditorPage } from '../../pages/MilestoneEditorPage/MilestoneEditorPage.jsx'
import { MetricsPage } from '../../pages/MetricsPage/MetricsPage.jsx'
import { MetricsBaselineEditorPage } from '../../pages/MetricsBaselineEditorPage/MetricsBaselineEditorPage.jsx'
import { MetricsSnapshotEditorPage } from '../../pages/MetricsSnapshotEditorPage/MetricsSnapshotEditorPage.jsx'
import { ReportsPage } from '../../pages/ReportsPage/ReportsPage.jsx'
import { ReportDetailPage } from '../../pages/ReportsPage/ReportDetailPage.jsx'
import { ActionsPage } from '../../pages/ActionsPage/ActionsPage.jsx'
import { ActionEditorPage } from '../../pages/ActionEditorPage/ActionEditorPage.jsx'
import { MeetingsPage } from '../../pages/MeetingsPage/MeetingsPage.jsx'
import { MeetingNoteEditorPage } from '../../pages/MeetingsPage/MeetingNoteEditorPage.jsx'
import { MeetingNoteDetailPage } from '../../pages/MeetingsPage/MeetingNoteDetailPage.jsx'
import { NotFoundPage } from '../../pages/NotFoundPage/NotFoundPage.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: '/projects',
        element: <ProjectsPage />,
      },
      {
        path: '/projects/new',
        element: <NewProjectPage />,
      },
      {
        path: '/projects/:projectId/edit',
        element: <EditProjectPage />,
      },
      {
        path: '/projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: <ProjectOverviewPage /> },
          { path: 'governance', element: <GovernancePage /> },
          { path: 'success-criteria', element: <SuccessCriteriaPage /> },
          { path: 'success-criteria/new', element: <SuccessCriterionEditorPage /> },
          {
            path: 'success-criteria/:criterionId/edit',
            element: <SuccessCriterionEditorPage />,
          },
          { path: 'risks', element: <RisksPage /> },
          { path: 'risks/new', element: <RiskEditorPage /> },
          { path: 'risks/:riskId', element: <RiskDetailPage /> },
          { path: 'risks/:riskId/edit', element: <RiskEditorPage /> },
          { path: 'milestones', element: <MilestonesPage /> },
          { path: 'milestones/new', element: <MilestoneEditorPage /> },
          { path: 'milestones/:milestoneId/edit', element: <MilestoneEditorPage /> },
          { path: 'metrics', element: <MetricsPage /> },
          { path: 'metrics/baseline', element: <MetricsBaselineEditorPage /> },
          { path: 'metrics/snapshots/new', element: <MetricsSnapshotEditorPage /> },
          { path: 'metrics/snapshots/:snapshotId/edit', element: <MetricsSnapshotEditorPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'reports/new', element: <ReportDetailPage /> },
          { path: 'reports/:reportId', element: <ReportDetailPage /> },
          { path: 'actions', element: <ActionsPage /> },
          { path: 'actions/new', element: <ActionEditorPage /> },
          { path: 'actions/:actionId/edit', element: <ActionEditorPage /> },
          { path: 'meetings', element: <MeetingsPage /> },
          { path: 'meetings/new', element: <MeetingNoteEditorPage /> },
          { path: 'meetings/:meetingId', element: <MeetingNoteDetailPage /> },
          { path: 'meetings/:meetingId/edit', element: <MeetingNoteEditorPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
