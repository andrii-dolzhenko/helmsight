import { describe, expect, it } from 'vitest'
import {
  GOVERNANCE_SCHEMA_VERSION,
  createEmptyGovernance,
  getStakeholderManagementStrategy,
  isCharterConfigured,
  normalizeGovernance,
} from './governance.js'

describe('project governance helpers', () => {
  it('creates an isolated empty governance structure', () => {
    const first = createEmptyGovernance()
    const second = createEmptyGovernance()

    first.stakeholders.push({ id: 'one' })
    first.charter.objectives.push('Ship')
    first.charter.deliverables.push('Pilot')

    expect(first.schemaVersion).toBe(GOVERNANCE_SCHEMA_VERSION)
    expect(second.stakeholders).toEqual([])
    expect(second.charter.objectives).toEqual([])
    expect(second.charter.deliverables).toEqual([])
  })

  it('normalizes expanded governance values and legacy communication choices', () => {
    const governance = normalizeGovernance({
      charter: {
        purpose: '  Modernize delivery  ',
        primaryObjective: ' Improve management visibility ',
        sponsor: ' Maya Chen ',
        projectManager: ' Alex Morgan ',
        objectives: [' Ship pilot ', '', 'Reduce risk'],
        deliverables: [' Governance pack '],
      },
      stakeholders: [
        {
          id: 's1',
          name: ' Maya ',
          role: ' Sponsor ',
          influence: 'high',
          interest: 'high',
          engagement: 'leading',
        },
      ],
      communications: [
        {
          id: 'c1',
          audience: ' Team ',
          topic: ' Weekly sync ',
          channel: 'Working session',
          frequency: 'Every week',
          deliverables: [' Agenda ', '', ' Minutes '],
          owner: ' Alex ',
        },
      ],
    })

    expect(governance.charter.purpose).toBe('Modernize delivery')
    expect(governance.charter.objectives).toEqual(['Ship pilot', 'Reduce risk'])
    expect(governance.charter.deliverables).toEqual(['Governance pack'])
    expect(governance.stakeholders[0].name).toBe('Maya')
    expect(governance.communications[0].channel).toBe('Working session')
    expect(governance.communications[0].frequency).toBe('Weekly')
    expect(governance.communications[0].deliverables).toEqual(['Agenda', 'Minutes'])
  })

  it('requires the core charter fields and lists for configured state', () => {
    expect(
      isCharterConfigured({
        purpose: 'Keep delivery controls visible.',
        primaryObjective: 'Deliver a controlled modernization.',
        sponsor: 'Maya Chen',
        projectManager: 'Alex Morgan',
        objectives: ['Ship pilot'],
        inScope: ['Delivery workspace'],
        deliverables: ['Modernized workspace'],
      }),
    ).toBe(true)

    expect(
      isCharterConfigured({
        purpose: 'Keep delivery controls visible.',
        primaryObjective: '',
        sponsor: 'Maya Chen',
        projectManager: 'Alex Morgan',
        objectives: ['Ship pilot'],
        inScope: ['Delivery workspace'],
        deliverables: ['Modernized workspace'],
      }),
    ).toBe(false)
  })

  it('derives stakeholder management strategy from influence and interest', () => {
    expect(getStakeholderManagementStrategy('high', 'high')).toBe('Manage closely')
    expect(getStakeholderManagementStrategy('high', 'low')).toBe('Keep satisfied')
    expect(getStakeholderManagementStrategy('medium', 'high')).toBe('Keep informed')
    expect(getStakeholderManagementStrategy('low', 'medium')).toBe('Monitor')
  })
})
