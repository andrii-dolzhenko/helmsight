// Curated, versioned P2 learning content. Keep IDs stable so saved answers survive edits.
export const DECISION_SCENARIOS = Object.freeze([
  {
    id: 'vendor-delay', category: 'Risk & delivery', title: 'A critical vendor misses a milestone',
    context: 'A key integration partner reports a three-week delay. The release depends on their delivery, and the sponsor expects the original date.',
    question: 'What is your best first response?', recommendedId: 'assess',
    options: [
      { id: 'assess', text: 'Assess impact and recovery options, then agree a revised plan', detail: 'Validate the critical path, alternatives, and commitments before communicating a recommendation.', feedback: 'Recommended: evidence-based replanning combines mitigation with transparent stakeholder communication.' },
      { id: 'wait', text: 'Keep the current plan until the next status meeting', detail: 'Avoid changing expectations before the vendor confirms the delay.', feedback: 'Waiting protects short-term optics but leaves dependencies and stakeholders unprepared.' },
      { id: 'cut', text: 'Remove scope immediately to preserve the release date', detail: 'Defer features before quantifying their value or integration dependencies.', feedback: 'Scope reduction may be useful, but first assess impact and obtain the appropriate change approval.' },
      { id: 'escalate', text: 'Escalate without offering a recovery plan', detail: 'Ask leadership to take ownership of the vendor issue.', feedback: 'Escalation may be needed, but decision-makers benefit from options, analysis and your recommendation.' },
    ],
  },
  {
    id: 'scope-request', category: 'Change control', title: 'A sponsor asks for an urgent feature',
    context: 'Two weeks before release, a sponsor wants a new feature that was not in the agreed scope. The team is already at capacity.',
    question: 'What should you do?', recommendedId: 'evaluate',
    options: [
      { id: 'evaluate', text: 'Assess trade-offs and use the agreed change process', detail: 'Estimate schedule, cost, risk and value before committing.', feedback: 'Recommended: a transparent impact assessment lets the sponsor make an informed trade-off.' },
      { id: 'agree', text: 'Promise delivery to maintain sponsor confidence', detail: 'Commit first and work out resources afterward.', feedback: 'Unfunded commitments undermine delivery credibility and can destabilize the release.' },
      { id: 'reject', text: 'Decline the request without discussion', detail: 'Protect the baseline regardless of potential business value.', feedback: 'The request may be valuable; explain constraints and assess realistic options instead of dismissing it.' },
      { id: 'overtime', text: 'Require the team to work overtime', detail: 'Absorb the scope without updating the plan.', feedback: 'Unplanned overtime hides capacity costs and increases quality and sustainability risks.' },
    ],
  },
  {
    id: 'silent-stakeholder', category: 'Stakeholders', title: 'A key stakeholder has gone silent',
    context: 'An approval is blocking a critical milestone. The assigned stakeholder has not responded to several routine messages.',
    question: 'How would you unblock the decision?', recommendedId: 'engage',
    options: [
      { id: 'engage', text: 'Contact them directly, clarify the decision and set an escalation path', detail: 'Explain the impact, propose a deadline and use agreed governance if necessary.', feedback: 'Recommended: targeted engagement plus a documented escalation path protects both the relationship and schedule.' },
      { id: 'assume', text: 'Treat silence as approval', detail: 'Proceed so the milestone is not delayed.', feedback: 'Silence is rarely a valid approval for a material decision; this creates governance risk.' },
      { id: 'broadcast', text: 'Send the same reminder to everyone each day', detail: 'Increase visibility without adjusting the request.', feedback: 'Mass reminders create noise without clarifying responsibility or enabling a decision.' },
      { id: 'stop', text: 'Pause all project work until they respond', detail: 'Stop unrelated tasks to emphasize urgency.', feedback: 'Protect the blocked dependency, but unrelated work may continue while escalation is managed.' },
    ],
  },
  {
    id: 'budget-pressure', category: 'Cost management', title: 'The forecast exceeds the budget',
    context: 'Mid-project, the cost forecast exceeds the approved budget by 12%, with several change requests still pending.',
    question: 'What is the most defensible next step?', recommendedId: 'forecast',
    options: [
      { id: 'forecast', text: 'Validate the forecast, identify drivers and present options', detail: 'Separate committed costs from estimates, assess scope alternatives and escalate for approval.', feedback: 'Recommended: an evidence-based forecast and documented options support sound cost decisions.' },
      { id: 'hide', text: 'Wait for next month in case the variance improves', detail: 'Avoid alarming leadership until costs are certain.', feedback: 'Deferring material cost signals removes the sponsor’s ability to intervene early.' },
      { id: 'cut-quality', text: 'Reduce testing first to save money', detail: 'Protect the delivery date by lowering quality effort.', feedback: 'Unassessed cuts to quality may increase defects and total cost of ownership.' },
      { id: 'approve-all', text: 'Approve every pending change request', detail: 'Keep stakeholders satisfied and address funding later.', feedback: 'Adding unapproved costs worsens the problem; each change needs an impact decision.' },
    ],
  },
  {
    id: 'quality-incident', category: 'Quality', title: 'A defect appears before launch',
    context: 'The release candidate fails a critical workflow used by most customers. The launch date is tomorrow.',
    question: 'How should you respond?', recommendedId: 'triage',
    options: [
      { id: 'triage', text: 'Assess severity, fix or defer release with a documented decision', detail: 'Bring engineering, QA and the business owner together; verify the available options.', feedback: 'Recommended: a risk-based go/no-go decision avoids exposing customers to an unassessed critical defect.' },
      { id: 'ship', text: 'Release on schedule and patch later', detail: 'Meet the public date despite the broken critical workflow.', feedback: 'Shipping a known critical failure can harm users and trust; explicit risk acceptance is essential.' },
      { id: 'blame', text: 'Ask QA who caused the issue', detail: 'Focus on individual accountability before triage.', feedback: 'Root-cause review has value later, but urgent impact and containment come first.' },
      { id: 'cancel', text: 'Cancel the entire product initiative', detail: 'Treat one severe issue as proof the initiative cannot succeed.', feedback: 'A release delay or scoped mitigation is often more proportionate than cancelling the initiative.' },
    ],
  },
  {
    id: 'resource-conflict', category: 'Resource planning', title: 'Two workstreams need the same expert',
    context: 'A specialist is essential to two simultaneous critical-path tasks. Both workstream leads insist their deadline is non-negotiable.',
    question: 'What is the best way to resolve the conflict?', recommendedId: 'prioritize',
    options: [
      { id: 'prioritize', text: 'Compare dependencies and jointly reprioritize with owners', detail: 'Map impact, explore alternatives and get one transparent resource decision.', feedback: 'Recommended: shared prioritization makes the constraint explicit and preserves project-wide outcomes.' },
      { id: 'split', text: 'Assign the expert 50/50 without discussing dependencies', detail: 'Appear fair to both workstreams.', feedback: 'Equal time splits can increase context switching and delay both critical tasks.' },
      { id: 'choose', text: 'Give the expert to the loudest stakeholder', detail: 'Resolve the dispute quickly based on pressure.', feedback: 'Escalation volume is not a defensible prioritization criterion.' },
      { id: 'overtime', text: 'Expect the specialist to work nights indefinitely', detail: 'Preserve both original dates through extra effort.', feedback: 'Sustained overtime is risky and does not remove the fundamental capacity conflict.' },
    ],
  },
  {
    id: 'risk-signal', category: 'Risk management', title: 'An emerging risk has no owner',
    context: 'A dependency risk now has high probability and impact, but nobody has been assigned to prepare or monitor a response.',
    question: 'How do you improve control?', recommendedId: 'assign',
    options: [
      { id: 'assign', text: 'Assign an accountable owner and agree triggers and response actions', detail: 'Record exposure, mitigation, deadlines and regular review.', feedback: 'Recommended: explicit ownership, response and triggers turn an observation into a manageable risk.' },
      { id: 'watch', text: 'Continue observing informally', detail: 'Avoid introducing process overhead until the risk occurs.', feedback: 'An unowned high-exposure risk is likely to be overlooked at the worst time.' },
      { id: 'close', text: 'Close the risk to simplify reporting', detail: 'Remove an issue the team cannot immediately solve.', feedback: 'Closing a live exposure obscures rather than reduces it.' },
      { id: 'transfer', text: 'Send a generic warning to every team', detail: 'Assume someone will take responsibility.', feedback: 'Broad visibility is not a substitute for a named owner and response plan.' },
    ],
  },
  {
    id: 'missed-estimate', category: 'Delivery', title: 'A milestone estimate is no longer credible',
    context: 'Your team discovers integration work was under-estimated. The original milestone is unlikely, despite strong pressure to keep it green.',
    question: 'How should you report the milestone?', recommendedId: 'reforecast',
    options: [
      { id: 'reforecast', text: 'Reforecast with evidence and communicate mitigation options', detail: 'Separate known variance from uncertainty, identify recovery paths and update the plan through governance.', feedback: 'Recommended: credible forecasts and options help stakeholders make timely decisions.' },
      { id: 'green', text: 'Leave the status green until the due date passes', detail: 'Avoid reporting bad news before the deadline.', feedback: 'Late disclosure prevents proactive decisions and reduces trust in status reporting.' },
      { id: 'pressure', text: 'Increase pressure without checking assumptions', detail: 'Assume effort alone will close the estimation gap.', feedback: 'More pressure cannot replace analysis of dependencies and realistic capacity.' },
      { id: 'rename', text: 'Rename the milestone so it appears completed', detail: 'Change the reporting definition instead of the plan.', feedback: 'Redefining delivery criteria without approval conceals performance rather than improving it.' },
    ],
  },
  {
    id: 'communication-gap', category: 'Communication', title: 'Teams interpret a decision differently',
    context: 'Engineering and operations are working from different assumptions about a release handover agreed in a meeting.',
    question: 'What would you do next?', recommendedId: 'align',
    options: [
      { id: 'align', text: 'Clarify the decision, owner and acceptance criteria in one shared record', detail: 'Confirm understanding with both groups and update the handover plan.', feedback: 'Recommended: a single explicit decision record reduces ambiguity and repeated coordination costs.' },
      { id: 'meeting', text: 'Schedule another meeting without preparing a decision', detail: 'Hope the discussion alone settles the interpretation.', feedback: 'A meeting may help, but it must produce a clear recorded decision and owners.' },
      { id: 'delegate', text: 'Let each team interpret the agreement independently', detail: 'Avoid central coordination to preserve autonomy.', feedback: 'Conflicting definitions of done can create avoidable handover failures.' },
      { id: 'ignore', text: 'Wait until handover to identify the gap', detail: 'Defer clarification to avoid short-term disruption.', feedback: 'Resolving ambiguity early is usually less costly than discovering it at release.' },
    ],
  },
])
