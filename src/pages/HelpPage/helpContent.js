// Product-facing guidance checked against existing HelmSight routes and domain workflows.
// Keep this copy synchronized with actual UI changes; never expose implementation details in Help.
export const HELP_TOPICS = [
  {
    id: 'getting-started',
    icon: 'compass',
    title: 'Getting Started',
    summary: 'Find your way around projects and your portfolio.',
    intro: 'A quick route from your portfolio to the work that matters.',
    guides: [
      {
        title: 'Create and open a project',
        steps: [
          'Open Projects from the main navigation and choose New project.',
          'Enter your project details and save. Select a project to open its workspace.',
          'Use the project tabs to move between its milestones, risks, actions, metrics, reports and meeting notes.',
        ],
        link: { label: 'Browse projects', to: '/projects' },
      },
      {
        title: 'Find information across projects',
        steps: [
          'Use Overview to review portfolio signals that need attention.',
          'Use the global Actions, Risks, Metrics, Reports and Meetings pages to compare and find records across projects.',
          'Choose an Open action to see a record in the project it belongs to, or use Search portfolio in the header.',
        ],
        link: { label: 'Open Overview', to: '/overview' },
      },
    ],
  },
  {
    id: 'managing-projects',
    icon: 'folders',
    title: 'Managing Projects',
    summary: 'Keep plans, risks, actions, meetings and reports connected.',
    intro: 'Each project has its own workspace for maintaining day-to-day records.',
    guides: [
      {
        title: 'Track delivery and decisions',
        steps: [
          'Open a project to manage its milestones, risks and management actions.',
          'Record discussions, decisions and follow-ups under Meeting Notes.',
          'Use Weekly Status Reports to prepare, finalize and revisit progress updates; use Lessons Learned to capture reusable knowledge.',
        ],
        link: { label: 'Explore projects', to: '/projects' },
      },
      {
        title: 'Review records across the portfolio',
        steps: [
          'Use Global Actions or Global Risks to locate items requiring attention.',
          'Use Global Meetings to find meeting notes from different projects, including archived notes when selected.',
          'Use Global Reports to find existing reports. Editing and lifecycle changes stay inside the relevant project.',
        ],
        link: { label: 'Open Global Meetings', to: '/meetings' },
      },
    ],
  },
  {
    id: 'metrics-performance',
    icon: 'chart',
    title: 'Metrics & Performance',
    summary: 'Understand earned value and performance indicators.',
    intro: 'Use project metrics to compare planned progress with completed work and actual effort or cost.',
    guides: [
      {
        title: 'Read earned value (EVM) measures',
        description: 'PV (Planned Value) is the work planned by the selected date. EV (Earned Value) is the value of work completed. AC (Actual Cost) is the recorded actual effort or cost when the measurement model supports it.',
        steps: [
          'SPI = EV ÷ PV. Values below 1.00 indicate less earned progress than planned, when the ratio is available.',
          'CPI = EV ÷ AC. Values below 1.00 indicate that earned work is lower than actual input, when the ratio is available.',
          'The performance labels are Healthy (1.00 or above), Watch (0.95 to below 1.00), and Needs attention (below 0.95).',
        ],
        link: { label: 'Review Global Metrics', to: '/metrics' },
      },
      {
        title: 'Understand unavailable indicators',
        description: 'A valid baseline and reporting snapshot are needed for meaningful project performance. Missing or inapplicable ratios are shown as unavailable rather than as zero.',
        steps: [
          'Open the project Metrics workspace to review the baseline and snapshots.',
          'For Story points, HelmSight does not calculate CPI or actual cost indicators.',
          'Compare SPI and CPI only when meaningful; raw EVM values from different measurement bases are not added into a single portfolio total.',
        ],
        link: { label: 'View performance register', to: '/metrics' },
      },
    ],
  },
  {
    id: 'working-with-data',
    icon: 'archive',
    title: 'Working with Data',
    summary: 'Understand saving, archiving, restoring and deleting.',
    intro: 'Know what happens to your records before you change their status.',
    guides: [
      {
        title: 'Archive, restore or remove a project',
        steps: [
          'Archive a project when you no longer need it in active day-to-day views.',
          'Find it in the Archived view of Projects and restore it if work resumes.',
          'Permanent deletion is available only for archived projects and requires exact-name confirmation. It removes that project and its associated records from this browser and cannot be undone here.',
        ],
        link: { label: 'Open Projects', to: '/projects' },
      },
      {
        title: 'Keep meeting notes and reports organized',
        steps: [
          'Meeting Notes have their own Current and Archived views; this is separate from whether the project itself is archived.',
          'An archived meeting note is read-only until it is restored in an active project.',
          'Weekly Status Reports also have their own draft/final and archive/restore lifecycle.',
        ],
        link: { label: 'Find meeting notes', to: '/meetings' },
      },
    ],
  },
  {
    id: 'notifications-decision-lab',
    icon: 'bell',
    title: 'Notifications & Decision Lab',
    summary: 'Respond to alerts and practice project decisions.',
    intro: 'Keep important conditions visible without losing sight of your work.',
    guides: [
      {
        title: 'Manage alerts',
        steps: [
          'Open the bell in the header to see alerts for critical active risks, overdue unfinished actions or milestones, and an available daily Decision Lab session.',
          'Switch between All and Unread. Mark all as read clears the unread indication without deleting the underlying issue.',
          'Dismiss hides an alert; resolving the source issue removes its active alert. Open an alert to navigate to its source.',
        ],
        link: { label: 'Review portfolio risks', to: '/risks' },
      },
      {
        title: 'Use Decision Lab',
        steps: [
          'Open Decision Lab from the lower navigation card or from its daily notification.',
          'Review three practical project-management scenarios and read the explanation after each answer.',
          'You can leave and resume a session later on the same day. The nine scenarios rotate in a repeating three-day cycle.',
        ],
        link: { label: 'Return to Overview', to: '/overview' },
      },
    ],
  },
]

export const HELP_FAQS = [
  {
    question: 'Where is my workspace information saved?',
    answer: 'Your workspace information is saved in the browser where you use HelmSight. It does not automatically appear on other devices or in a different browser. Clearing browser data can permanently erase this information.',
  },
  {
    question: 'Can I recover a permanently deleted project?',
    answer: 'Permanent deletion cannot be undone in the current workspace. Archive a project instead if you may need to return to it later.',
  },
  {
    question: 'Why is a project missing from a portfolio register?',
    answer: 'Most portfolio registers show active projects by default. Check the project filters and enable Include archived projects where available to see archived records.',
  },
  {
    question: 'Why do some EVM values show a dash or Not available?',
    answer: 'The project may not have the baseline, reporting snapshot or valid inputs needed to calculate that indicator. CPI is also not available for Story points. Review the project Metrics workspace for its source data.',
  },
  {
    question: 'What is the difference between Read and Dismiss?',
    answer: 'Reading an alert removes it from your unread count but keeps it in All. Dismissing an alert hides it. Both are separate from resolving the underlying risk, action or milestone.',
  },
  {
    question: 'Can I use the same account across devices?',
    answer: 'Workspace data is not yet linked to a signed-in account or synchronized between devices. Do not rely on another browser or device as a copy of your work.',
  },
]
