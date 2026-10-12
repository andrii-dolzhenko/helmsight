import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import {
  GOVERNANCE_SCHEMA_VERSION,
  createEmptyGovernance,
  normalizeGovernance,
} from '../lib/governance.js'

const PROJECTS_STORAGE_KEY = 'projects'

const DEMO_GOVERNANCE = Object.freeze({
  schemaVersion: GOVERNANCE_SCHEMA_VERSION,
  charter: {
    purpose:
      'Modernize the customer delivery platform while preserving executive visibility, delivery controls, and operational continuity.',
    primaryObjective:
      'Deliver a controlled modernization that improves delivery visibility and operating efficiency without interrupting current customer service.',
    sponsor: 'Maya Chen',
    projectManager: 'Alex Morgan',
    objectives: [
      'Release the modernized delivery experience in controlled phases.',
      'Keep delivery health, risks, milestones, and performance visible to leadership.',
      'Reduce operational friction without disrupting current customer delivery.',
    ],
    inScope: [
      'Customer delivery platform modernization',
      'Design system rollout',
      'Data migration pilot',
      'Executive reporting and delivery controls',
    ],
    outOfScope: [
      'Full replacement of upstream enterprise systems',
      'Native mobile application delivery',
      'Non-core integrations without an approved delivery dependency',
    ],
    deliverables: [
      'Modernized customer delivery workspace',
      'Reusable design system and migrated priority workflows',
      'Data migration pilot with reconciliation evidence',
      'Executive delivery reporting and governance controls',
    ],
    benefits: [
      'Faster management visibility into delivery health and exceptions.',
      'Lower reporting friction through one project-control workspace.',
      'More consistent evidence for executive and compliance reviews.',
    ],
    constraints: [
      'Current customer delivery must remain available during rollout.',
      'Specialist capacity is limited during migration windows.',
      'Regulatory evidence must be available before controlled releases.',
    ],
    assumptions: [
      'Required platform access remains available to the delivery team.',
      'Key stakeholders can attend the agreed governance cadence.',
      'External integration partners meet reviewed dependency dates.',
    ],
    acceptanceCriteria: [
      'Priority modernization scope is released without critical service interruption.',
      'Migration pilot evidence is reviewed and accepted by delivery and compliance owners.',
      'Executive reporting exposes current risks, milestones, outcomes, and EVM indicators.',
    ],
    version: 1,
    updatedAt: '2026-10-06T12:00:00.000Z',
  },
  stakeholders: [
    {
      id: 'demo-stakeholder-sponsor',
      name: 'Maya Chen',
      role: 'Executive sponsor',
      organization: 'Northstar Telecom',
      email: 'maya.chen@example.com',
      timeZone: 'America/New_York',
      responsibility: 'Executive sponsorship, funding alignment, and escalation decisions.',
      expectations: 'Clear visibility into outcomes, delivery health, material risks, and decisions.',
      influence: 'high',
      interest: 'high',
      engagement: 'leading',
      communicationNotes: 'Owns executive sponsorship and escalation decisions.',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-10-06T12:00:00.000Z',
    },
    {
      id: 'demo-stakeholder-pm',
      name: 'Alex Morgan',
      role: 'Project / Delivery Manager',
      organization: 'Northstar Telecom',
      email: 'alex.morgan@example.com',
      timeZone: 'Europe/London',
      responsibility: 'Coordinates delivery controls, governance cadence, reporting, and cross-team decisions.',
      expectations: 'Timely decisions, visible dependencies, and accountable follow-up across workstreams.',
      influence: 'high',
      interest: 'high',
      engagement: 'leading',
      communicationNotes: 'Coordinates delivery controls, reporting, and cross-team decisions.',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-10-06T12:00:00.000Z',
    },
    {
      id: 'demo-stakeholder-regulatory',
      name: 'Jordan Lee',
      role: 'Compliance lead',
      organization: 'Northstar Telecom',
      email: 'jordan.lee@example.com',
      timeZone: 'Europe/Berlin',
      responsibility: 'Reviews evidence readiness, regulatory controls, and release conditions.',
      expectations: 'Required evidence is complete and available before controlled releases.',
      influence: 'medium',
      interest: 'high',
      engagement: 'supportive',
      communicationNotes: 'Reviews evidence readiness and regulatory timeline changes.',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-10-06T12:00:00.000Z',
    },
  ],
  communications: [
    {
      id: 'demo-communication-executive',
      audience: 'Executive sponsor',
      topic: 'Project health and management attention',
      purpose: 'Keep leadership aligned on outcomes, delivery performance, risks, and decisions.',
      deliverables: ['Weekly status report', 'Decision and escalation summary'],
      channel: 'Status report',
      frequency: 'Weekly',
      timingTrigger: 'Friday 15:00',
      owner: 'Alex Morgan',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-10-06T12:00:00.000Z',
    },
    {
      id: 'demo-communication-team',
      audience: 'Delivery workstream leads',
      topic: 'Milestones, dependencies, risks, and actions',
      purpose: 'Confirm execution priorities and remove delivery blockers before escalation.',
      deliverables: ['Agenda', 'Action follow-up'],
      channel: 'Meeting',
      frequency: 'Weekly',
      timingTrigger: 'Tuesday 10:00',
      owner: 'Alex Morgan',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-10-06T12:00:00.000Z',
    },
    {
      id: 'demo-communication-compliance',
      audience: 'Compliance and operations',
      topic: 'Evidence readiness and rollout controls',
      purpose: 'Validate evidence ownership, readiness dates, and operational constraints.',
      deliverables: ['Evidence readiness review', 'Follow-up actions'],
      channel: 'Meeting',
      frequency: 'Bi-weekly',
      timingTrigger: 'Before each controlled rollout',
      owner: 'Jordan Lee',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-10-06T12:00:00.000Z',
    },
  ],
  updatedAt: '2026-10-06T12:00:00.000Z',
})

const DEMO_PROJECT = Object.freeze({
  id: 'demo-project',
  name: 'Atlas Modernization',
  description:
    'Modernize the customer delivery platform while keeping executive reporting and delivery controls visible.',
  clientContext: 'Northstar Telecom',
  startDate: '2026-08-04',
  targetEndDate: '2027-02-27',
  status: 'active',
  archivedAt: null,
  createdAt: '2026-08-04T09:00:00.000Z',
  updatedAt: '2026-10-06T12:00:00.000Z',
  governance: DEMO_GOVERNANCE,
})

export class ProjectsServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'ProjectsServiceError'
  }
}

function cloneGovernance(governance) {
  const normalized = normalizeGovernance(governance)
  return {
    ...normalized,
    charter: {
      ...normalized.charter,
      objectives: [...normalized.charter.objectives],
      inScope: [...normalized.charter.inScope],
      outOfScope: [...normalized.charter.outOfScope],
      constraints: [...normalized.charter.constraints],
      deliverables: [...normalized.charter.deliverables],
      benefits: [...normalized.charter.benefits],
      assumptions: [...normalized.charter.assumptions],
      acceptanceCriteria: [...normalized.charter.acceptanceCriteria],
    },
    stakeholders: normalized.stakeholders.map((item) => ({ ...item })),
    communications: normalized.communications.map((item) => ({
      ...item,
      deliverables: [...item.deliverables],
    })),
  }
}

function cloneDemoProjects() {
  return [
    {
      ...DEMO_PROJECT,
      governance: cloneGovernance(DEMO_GOVERNANCE),
    },
  ]
}

function migrateDemoGovernance(governance) {
  const source = governance && typeof governance === 'object' ? governance : {}
  if (Number(source.schemaVersion ?? 1) >= GOVERNANCE_SCHEMA_VERSION) {
    return cloneGovernance(source)
  }

  const stakeholderDefaults = new Map(
    DEMO_GOVERNANCE.stakeholders.map((item) => [item.id, item]),
  )
  const communicationDefaults = new Map(
    DEMO_GOVERNANCE.communications.map((item) => [item.id, item]),
  )

  return cloneGovernance({
    ...DEMO_GOVERNANCE,
    ...source,
    schemaVersion: GOVERNANCE_SCHEMA_VERSION,
    charter: {
      ...DEMO_GOVERNANCE.charter,
      ...(source.charter ?? {}),
    },
    stakeholders: Array.isArray(source.stakeholders)
      ? source.stakeholders.map((item) => ({ ...stakeholderDefaults.get(item.id), ...item }))
      : DEMO_GOVERNANCE.stakeholders,
    communications: Array.isArray(source.communications)
      ? source.communications.map((item) => ({ ...communicationDefaults.get(item.id), ...item }))
      : DEMO_GOVERNANCE.communications,
  })
}

function hydrateProject(project) {
  if (project.id === DEMO_PROJECT.id) {
    return { ...project, governance: migrateDemoGovernance(project.governance) }
  }

  if (project.governance) {
    return { ...project, governance: cloneGovernance(project.governance) }
  }

  return { ...project, governance: createEmptyGovernance() }
}

function hydrateProjects(projects) {
  return projects.map(hydrateProject)
}

function readProjects() {
  const storedProjects = storageAdapter.read(PROJECTS_STORAGE_KEY)

  if (storedProjects === null) {
    const demoWasDeleted =
      storageAdapter.read('deletedDemoProject:demo-project') === true

    const initialProjects = demoWasDeleted ? [] : cloneDemoProjects()
    storageAdapter.write(PROJECTS_STORAGE_KEY, initialProjects)
    return initialProjects
  }

  if (!Array.isArray(storedProjects)) {
    throw new ProjectsServiceError('Saved project data is invalid. Reset local data and try again.')
  }

  const projects = hydrateProjects(storedProjects)

  if (
    storedProjects.some(
      (project) =>
        !project.governance ||
        Number(project.governance.schemaVersion ?? 1) < GOVERNANCE_SCHEMA_VERSION,
    )
  ) {
    storageAdapter.write(PROJECTS_STORAGE_KEY, projects)
  }

  return projects
}

function writeProjects(projects) {
  storageAdapter.write(PROJECTS_STORAGE_KEY, projects)
  return projects
}

function normalizeProjectInput(input) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    clientContext: input.clientContext.trim(),
    startDate: input.startDate,
    targetEndDate: input.targetEndDate,
    status: input.status,
  }
}

function findProjectIndex(projects, projectId) {
  return projects.findIndex((project) => project.id === projectId)
}

function ensureProject(projects, projectId) {
  const projectIndex = findProjectIndex(projects, projectId)

  if (projectIndex === -1) {
    throw new ProjectsServiceError('Project not found.')
  }

  return projectIndex
}

function ensureProjectEditable(project) {
  if (project.archivedAt) {
    throw new ProjectsServiceError('Archived projects are read-only. Restore the project to edit governance.')
  }
}

export const projectsService = {
  getSnapshot() {
    const storedProjects = storageAdapter.read(PROJECTS_STORAGE_KEY)

    if (storedProjects === null) {
      return null
    }

    if (!Array.isArray(storedProjects)) {
      throw new ProjectsServiceError('Saved project data is invalid. Reset local data and try again.')
    }

    return hydrateProjects(storedProjects)
  },

  async list() {
    return readProjects()
  },

  async getById(projectId) {
    return readProjects().find((project) => project.id === projectId) ?? null
  },

  async create(input) {
    const projects = readProjects()
    const timestamp = new Date().toISOString()
    const project = {
      id: globalThis.crypto.randomUUID(),
      ...normalizeProjectInput(input),
      governance: createEmptyGovernance(),
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    writeProjects([project, ...projects])
    return project
  },

  async update(projectId, input) {
    const projects = readProjects()
    const projectIndex = ensureProject(projects, projectId)
    const updatedProject = {
      ...projects[projectIndex],
      ...normalizeProjectInput(input),
      updatedAt: new Date().toISOString(),
    }

    const nextProjects = [...projects]
    nextProjects[projectIndex] = updatedProject
    writeProjects(nextProjects)

    return updatedProject
  },

  async updateGovernance(projectId, input) {
    const projects = readProjects()
    const projectIndex = ensureProject(projects, projectId)
    const project = projects[projectIndex]
    ensureProjectEditable(project)
    const timestamp = new Date().toISOString()
    const governance = {
      ...cloneGovernance(input),
      updatedAt: timestamp,
    }
    const updatedProject = {
      ...project,
      governance,
      updatedAt: timestamp,
    }

    const nextProjects = [...projects]
    nextProjects[projectIndex] = updatedProject
    writeProjects(nextProjects)

    return updatedProject
  },

  async archive(projectId) {
    const projects = readProjects()
    const projectIndex = ensureProject(projects, projectId)
    const timestamp = new Date().toISOString()
    const archivedProject = {
      ...projects[projectIndex],
      archivedAt: timestamp,
      updatedAt: timestamp,
    }

    const nextProjects = [...projects]
    nextProjects[projectIndex] = archivedProject
    writeProjects(nextProjects)

    return archivedProject
  },

  async restore(projectId) {
    const projects = readProjects()
    const projectIndex = ensureProject(projects, projectId)
    const restoredProject = {
      ...projects[projectIndex],
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    }

    const nextProjects = [...projects]
    nextProjects[projectIndex] = restoredProject
    writeProjects(nextProjects)

    return restoredProject
  },
}
