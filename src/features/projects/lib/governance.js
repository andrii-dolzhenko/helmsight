export const GOVERNANCE_SCHEMA_VERSION = 2

export const GOVERNANCE_LEVEL_OPTIONS = Object.freeze([
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
])

export const GOVERNANCE_ENGAGEMENT_OPTIONS = Object.freeze([
  { value: 'unaware', label: 'Unaware' },
  { value: 'resistant', label: 'Resistant' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'supportive', label: 'Supportive' },
  { value: 'leading', label: 'Leading' },
])

export const COMMUNICATION_CHANNEL_OPTIONS = Object.freeze([
  'Meeting',
  'Video call',
  'Email',
  'Chat / Teams',
  'Status report',
  'Presentation',
  'Workshop',
  'Survey',
  'Dashboard / portal',
  'Phone call',
  'Other',
])

export const COMMUNICATION_FREQUENCY_OPTIONS = Object.freeze([
  'Once',
  'Daily',
  'Weekly',
  'Bi-weekly',
  'Monthly',
  'Quarterly',
  'At milestone',
  'End of phase',
  'As needed',
  'On incident',
  'On demand',
])

const LEVEL_VALUES = GOVERNANCE_LEVEL_OPTIONS.map((option) => option.value)
const ENGAGEMENT_VALUES = GOVERNANCE_ENGAGEMENT_OPTIONS.map((option) => option.value)

const EMPTY_CHARTER = Object.freeze({
  purpose: '',
  primaryObjective: '',
  sponsor: '',
  projectManager: '',
  objectives: [],
  inScope: [],
  outOfScope: [],
  deliverables: [],
  benefits: [],
  constraints: [],
  assumptions: [],
  acceptanceCriteria: [],
  version: 0,
  updatedAt: null,
})

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeString(item)).filter(Boolean)
}

function normalizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function normalizeCommunicationChannel(value) {
  const source = normalizeString(value)
  return source || 'Meeting'
}

function normalizeFrequency(value) {
  const source = normalizeString(value)
  if (COMMUNICATION_FREQUENCY_OPTIONS.includes(source)) return source
  if (/bi[- ]?weekly/i.test(source)) return 'Bi-weekly'
  if (/weekly/i.test(source)) return 'Weekly'
  if (/daily|every day/i.test(source)) return 'Daily'
  if (/monthly|once per month/i.test(source)) return 'Monthly'
  if (/quarter/i.test(source)) return 'Quarterly'
  if (/milestone/i.test(source)) return 'At milestone'
  if (/end of.*phase/i.test(source)) return 'End of phase'
  if (/incident|immediate/i.test(source)) return 'On incident'
  if (/on demand/i.test(source)) return 'On demand'
  if (/as needed/i.test(source)) return 'As needed'
  if (/once/i.test(source)) return 'Once'

  return 'Weekly'
}

function normalizeStakeholder(item) {
  return {
    ...item,
    id: item?.id ?? normalizeString(item?.name),
    name: normalizeString(item?.name),
    role: normalizeString(item?.role),
    organization: normalizeString(item?.organization),
    email: normalizeString(item?.email),
    timeZone: normalizeString(item?.timeZone),
    responsibility: normalizeString(item?.responsibility),
    expectations: normalizeString(item?.expectations),
    influence: normalizeChoice(item?.influence, LEVEL_VALUES, 'medium'),
    interest: normalizeChoice(item?.interest, LEVEL_VALUES, 'medium'),
    engagement: normalizeChoice(item?.engagement, ENGAGEMENT_VALUES, 'neutral'),
    communicationNotes: normalizeString(item?.communicationNotes),
  }
}

function normalizeCommunication(item) {
  return {
    ...item,
    id: item?.id ?? normalizeString(item?.topic),
    audience: normalizeString(item?.audience),
    topic: normalizeString(item?.topic),
    purpose: normalizeString(item?.purpose),
    deliverables: normalizeStringList(item?.deliverables),
    channel: normalizeCommunicationChannel(item?.channel),
    frequency: normalizeFrequency(item?.frequency),
    timingTrigger: normalizeString(item?.timingTrigger),
    owner: normalizeString(item?.owner),
  }
}

export function createEmptyGovernance() {
  return {
    schemaVersion: GOVERNANCE_SCHEMA_VERSION,
    charter: {
      ...EMPTY_CHARTER,
      objectives: [],
      inScope: [],
      outOfScope: [],
      deliverables: [],
      benefits: [],
      constraints: [],
      assumptions: [],
      acceptanceCriteria: [],
    },
    stakeholders: [],
    communications: [],
    updatedAt: null,
  }
}

export function normalizeGovernance(value) {
  const source = value && typeof value === 'object' ? value : {}
  const charter = source.charter && typeof source.charter === 'object' ? source.charter : {}

  return {
    schemaVersion: GOVERNANCE_SCHEMA_VERSION,
    charter: {
      ...EMPTY_CHARTER,
      ...charter,
      purpose: normalizeString(charter.purpose),
      primaryObjective: normalizeString(charter.primaryObjective),
      sponsor: normalizeString(charter.sponsor),
      projectManager: normalizeString(charter.projectManager),
      objectives: normalizeStringList(charter.objectives),
      inScope: normalizeStringList(charter.inScope),
      outOfScope: normalizeStringList(charter.outOfScope),
      deliverables: normalizeStringList(charter.deliverables),
      benefits: normalizeStringList(charter.benefits),
      constraints: normalizeStringList(charter.constraints),
      assumptions: normalizeStringList(charter.assumptions),
      acceptanceCriteria: normalizeStringList(charter.acceptanceCriteria),
      version: Number.isFinite(Number(charter.version)) ? Number(charter.version) : 0,
      updatedAt: charter.updatedAt ?? null,
    },
    stakeholders: Array.isArray(source.stakeholders)
      ? source.stakeholders.map(normalizeStakeholder)
      : [],
    communications: Array.isArray(source.communications)
      ? source.communications.map(normalizeCommunication)
      : [],
    updatedAt: source.updatedAt ?? null,
  }
}

export function isCharterConfigured(charter) {
  return Boolean(
    charter?.purpose?.trim() &&
      charter?.primaryObjective?.trim() &&
      charter?.sponsor?.trim() &&
      charter?.projectManager?.trim() &&
      charter?.objectives?.length &&
      charter?.inScope?.length &&
      charter?.deliverables?.length,
  )
}

export function getGovernanceLevelLabel(value) {
  return GOVERNANCE_LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function getGovernanceEngagementLabel(value) {
  return GOVERNANCE_ENGAGEMENT_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function getStakeholderManagementStrategy(influence, interest) {
  if (influence === 'high' && interest === 'high') return 'Manage closely'
  if (influence === 'high') return 'Keep satisfied'
  if (interest === 'high') return 'Keep informed'
  return 'Monitor'
}
