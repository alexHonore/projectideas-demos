'use strict';

// Classic script extension: local, deterministic workflows that remain usable from file://.
const WORKFLOW_TODAY = '2026-10-23';
const WORKFLOW_DEFAULTS = {
  workflowVersion: 1,
  worklog: [],
  milestoneReviews: {},
  plans: [
    {
      id: 'lead-elise', type: 'lead', title: 'Give Élise a thoughtful first step',
      subtitle: 'Seller enquiry · Cap-Rouge', clientId: '', status: 'Review', revision: 1,
      source: 'Fictional website enquiry · October 23, 9:12 AM',
      excerpt: 'Bonjour, nous pensons vendre notre maison à Cap-Rouge au printemps. Une valeur autour de 630 000 $ nous semble réaliste. Pourrions-nous discuter des prochaines étapes?',
      payload: { name: 'Élise Bergeron', email: 'elise.bergeron@example.com', area: 'Cap-Rouge, Québec', budget: 630000, language: 'French', consent: 'Needs review', evidence: '', note: 'Planning a spring sale. Wants an initial conversation before preparing the property.', task: true, taskTitle: 'Qualify Élise’s selling timeline', date: '2026-10-24', message: false, body: 'Bonjour Élise, merci pour votre message. Je vous propose un appel de découverte pour discuter de votre projet à Cap-Rouge. Quel moment vous conviendrait? — Alex' }, outcomes: {}
    },
    {
      id: 'move-sarah', type: 'reschedule', title: 'Find Sarah a time that works',
      subtitle: 'Showing · Availability conflict to resolve', clientId: 'sarah', eventId: 'e1', status: 'Review', revision: 1,
      source: 'Fictional client reply · October 23, 11:05 AM',
      excerpt: 'Could we move our showing later? I can get there around 3:45, or sometime after 4:30. Thank you!',
      payload: { date: '2026-10-23', time: '15:45', duration: 45, reason: 'Client requested a later showing.', message: true, body: 'Hi Sarah, I have updated our showing in my demo agenda. Please review the appointment details below. — Alex' }, outcomes: {}
    },
    {
      id: 'inspection-marc', type: 'inspection', title: 'Keep the inspection follow-through moving',
      subtitle: 'Marc Tremblay · Two reviewed next steps', clientId: 'marc', status: 'Review', revision: 1,
      source: 'Fictional inspection recap · October 23, 10:18 AM',
      excerpt: 'Marc asked Alex to review the inspection findings with him and confirm the next conversation. The financing date still needs a separate broker review.',
      payload: { task: true, taskTitle: 'Discuss the inspection findings with Marc', date: '2026-10-24', message: true, body: 'Bonjour Marc, le rapport est prêt pour notre revue ensemble. Je vous propose un échange pour noter vos questions et convenir des prochaines étapes. — Alex', simulateFailure: true }, outcomes: {}
    }
  ]
};

function eventStamp(event) {
  return event ? JSON.stringify([event.id, event.date, event.time, event.duration, event.location, event.client]) : 'missing';
}

function migrateWorkflows() {
  for (const [key, value] of Object.entries(WORKFLOW_DEFAULTS)) {
    if (state[key] === undefined) state[key] = structuredClone(value);
  }
  for (const plan of state.plans) {
    if (plan.type === 'reschedule' && !plan.baseline) plan.baseline = eventStamp(state.events.find(e => e.id === plan.eventId));
  }
  for (const id of state.checklist) {
    state.milestoneReviews[id] ??= { owner: 'Alex Rivera', due: '2026-10-23', evidence: 'Review retained from your existing demo workspace.', history: [] };
  }
  save();
}
Object.assign(DEFAULT_STATE, structuredClone(WORKFLOW_DEFAULTS));
migrateWorkflows();
ui.planFilter = 'Review';
extraNavigation.unshift(['plans', 'bolt', 'Action center']);

function validWorkflowDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function durationMinutes(value) { return Number.parseInt(value, 10) || 45; }
function timeMinutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return NaN;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
function appointmentConflicts(date, time, duration, excludeId = '') {
  const start = timeMinutes(time), finish = start + Number(duration);
  return state.events.filter(event => event.id !== excludeId && event.date === date && start < timeMinutes(event.time) + durationMinutes(event.duration) && finish > timeMinutes(event.time));
}
function availableTimes(date, duration, excludeId) {
  const result = [];
  for (let minutes = 9 * 60; minutes + Number(duration) <= 18 * 60; minutes += 30) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    if (!appointmentConflicts(date, time, duration, excludeId).length) result.push(time);
  }
  return result;
}
function planById(id) { return state.plans.find(plan => plan.id === id); }
function planStatusClass(plan) { return plan.status === 'Completed' ? 'green' : plan.status === 'Partial' ? 'amber' : plan.status === 'Review' ? 'purple' : ''; }
function workflowLog(clientId, title, body, planId = '') {
  state.worklog.unshift({ id: 'log-' + Date.now() + '-' + state.worklog.length, clientId, title, body, planId, at: new Date().toISOString() });
}
function planStepLabels(plan) {
  return plan.type === 'lead' ? { client: 'Reviewed client memory', task: 'Discovery commitment', message: 'Welcome message' } : plan.type === 'reschedule' ? { appointment: 'Showing time', message: 'Client update' } : { task: 'Inspection commitment', message: 'Client follow-up' };
}
function resultFor(plan, key, status, note) { plan.outcomes[key] = { status, note }; }
function workflowMessage(plan, clientId, recipient, body) {
  const id = 'message-' + plan.id;
  if (!state.messages.some(message => message.id === id)) {
    state.messages.push({ id, client: clientId, recipient, body, status: 'Simulated send', date: new Date().toISOString(), planId: plan.id });
  }
  resultFor(plan, 'message', 'done', 'Approved words saved locally. No message delivered.');
}
function workflowTask(plan, client, title, date) {
  const id = 'task-' + plan.id;
  if (!state.tasks.some(task => task.id === id)) state.tasks.push({ id, title, client, date, done: false, planId: plan.id });
  resultFor(plan, 'task', 'done', `${title} · Alex Rivera · ${date}`);
}

function validatePlan(plan, payload, approval = false) {
  if (!plan) return 'This action could not be found.';
  if (plan.status !== 'Review') return 'This action is no longer awaiting review.';
  if (plan.type === 'lead') {
    if (!payload.name || payload.name.trim().length < 2) return 'Add the client’s full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email || '')) return 'Enter a valid email address for the client record.';
    if (allClients().some(client => client.email.toLowerCase() === payload.email.trim().toLowerCase() && client.id !== plan.clientId)) return 'That email already belongs to a client. Review that record before adding another.';
    if (!payload.area?.trim()) return 'Add the area the client is interested in.';
    if (!Number.isFinite(Number(payload.budget)) || Number(payload.budget) < 100000 || Number(payload.budget) > 10000000) return 'Enter an asking-price expectation from $100,000 to $10,000,000.';
    if (!['Needs review', 'Email permitted', 'Opted out'].includes(payload.consent)) return 'Choose a communication permission status.';
    if (payload.consent === 'Email permitted' && !payload.evidence?.trim()) return 'Add the source of the permission you reviewed.';
    if (payload.message && payload.consent !== 'Email permitted') return 'Review email permission, or exclude the welcome message.';
  }
  if (payload.task && (!payload.taskTitle?.trim() || !validWorkflowDate(payload.date) || payload.date < WORKFLOW_TODAY)) return 'Give the commitment a title and a due date on or after October 23.';
  if (payload.message && !payload.body?.trim()) return 'Write the message, or exclude that step.';
  if (plan.type === 'inspection' && !payload.task && !payload.message) return 'Keep at least one next step in the plan.';
  if (plan.type === 'reschedule') {
    if (!validWorkflowDate(payload.date) || payload.date < WORKFLOW_TODAY || !Number.isFinite(timeMinutes(payload.time))) return 'Choose a valid appointment date and time on or after October 23.';
    if (![15, 30, 45, 60, 90].includes(Number(payload.duration)) || timeMinutes(payload.time) + Number(payload.duration) > 1440) return 'Choose a duration that ends on the same day.';
    if (!payload.reason?.trim()) return 'Add a short reason for the schedule change.';
    const event = state.events.find(item => item.id === plan.eventId);
    if (!event) return 'The original appointment was removed. Decline this proposal and create a new appointment.';
    if (approval && eventStamp(event) !== plan.baseline) return 'The appointment changed after this proposal was prepared. Review the current appointment before approving.';
    const conflicts = appointmentConflicts(payload.date, payload.time, payload.duration, plan.eventId);
    if (approval && conflicts.length) return `This time overlaps ${conflicts[0].title}. Choose an available alternative.`;
  }
  if (payload.message && plan.type !== 'lead' && getClient(plan.clientId).consent !== 'Email permitted') return 'Email permission changed. Exclude the message before continuing.';
  return '';
}
function savePlanDraft(id, payload) {
  const plan = planById(id), error = validatePlan(plan, payload);
  if (error) return { ok: false, error };
  plan.payload = structuredClone(payload);
  plan.revision += 1;
  save();
  return { ok: true };
}
function finishPlan(plan) {
  plan.status = Object.values(plan.outcomes).some(result => result.status === 'failed') ? 'Partial' : 'Completed';
  const receipt = Object.entries(plan.outcomes).map(([key, value]) => [planStepLabels(plan)[key] + ' · ' + ({done:'Completed',failed:'Needs retry',skipped:'Excluded'}[value.status] || value.status), value.note]);
  const activityId = 'activity-' + plan.id;
  state.activity = state.activity.filter(item => item.id !== activityId);
  state.activity.unshift({ id: activityId, title: plan.title, description: plan.status === 'Partial' ? 'One step needs attention · Completed work preserved' : 'Reviewed workflow saved · No external changes', status: plan.status === 'Partial' ? 'Review' : 'Completed', time: 'Just now', icon: 'bolt', receipt, planId: plan.id });
  workflowLog(plan.clientId, plan.status === 'Partial' ? 'Action needs a retry' : 'Action completed in demo', plan.title, plan.id);
  save();
}
function approvePlan(id) {
  const plan = planById(id);
  if (!plan || plan.status !== 'Review') return { ok: false, error: 'This action has already been reviewed.' };
  const payload = plan.payload, error = validatePlan(plan, payload, true);
  if (error) return { ok: false, error };
  plan.approvedPayload = structuredClone(payload);
  plan.approvedRecipient = plan.type === 'lead' ? payload.email.trim() : getClient(plan.clientId).email;
  plan.approvedRevision = plan.revision;
  plan.approvedAt = new Date().toISOString();
  if (plan.type === 'lead') {
    plan.clientId = 'client-' + plan.id;
    state.customClients.push({ id: plan.clientId, name: payload.name.trim(), initials: payload.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase(), color: 'blue', role: 'Seller', area: payload.area.trim(), budget: Number(payload.budget), status: 'New lead', language: payload.language, email: payload.email.trim(), note: payload.note.trim(), source: 'Broker-reviewed website enquiry · Oct 23', consent: payload.consent, consentEvidence: payload.evidence.trim(), last: 'Reviewed just now' });
    resultFor(plan, 'client', 'done', 'Client and permission status reviewed from the fictional enquiry.');
    if (payload.task) workflowTask(plan, payload.name.trim(), payload.taskTitle.trim(), payload.date);
    else resultFor(plan, 'task', 'skipped', 'Excluded during review. No commitment created.');
    if (payload.message) workflowMessage(plan, plan.clientId, payload.email.trim(), payload.body.trim());
    else resultFor(plan, 'message', 'skipped', 'Excluded during review. No message saved.');
  } else if (plan.type === 'reschedule') {
    const event = state.events.find(item => item.id === plan.eventId);
    plan.previousAppointment = structuredClone(event);
    Object.assign(event, { date: payload.date, time: payload.time, duration: payload.duration + ' min', note: payload.reason.trim() });
    resultFor(plan, 'appointment', 'done', `${payload.date} · ${formatTime(payload.time)} Eastern · ${payload.duration} min`);
    if (payload.message) workflowMessage(plan, plan.clientId, getClient(plan.clientId).email, payload.body.trim() + `\n\nShowing: ${payload.date}, ${formatTime(payload.time)} Eastern · ${payload.duration} min\n${event.location}`);
    else resultFor(plan, 'message', 'skipped', 'Excluded during review. No message saved.');
    ui.selectedDay = payload.date;
  } else {
    if (payload.task) workflowTask(plan, getClient(plan.clientId).name, payload.taskTitle.trim(), payload.date);
    else resultFor(plan, 'task', 'skipped', 'Excluded during review. No commitment created.');
    if (!payload.message) resultFor(plan, 'message', 'skipped', 'Excluded during review. No message saved.');
    else if (payload.simulateFailure) resultFor(plan, 'message', 'failed', 'Simulated connection timeout before acceptance. No message was saved. Retry only this step.');
    else workflowMessage(plan, plan.clientId, getClient(plan.clientId).email, payload.body.trim());
  }
  finishPlan(plan);
  return { ok: true, status: plan.status };
}
function retryPlan(id) {
  const plan = planById(id);
  if (!plan || plan.status !== 'Partial' || plan.outcomes.message?.status !== 'failed') return { ok: false, error: 'There is no failed message to retry.' };
  const client = getClient(plan.clientId);
  if (client.consent !== 'Email permitted') return { ok: false, error: 'Email permission changed. Cancel the remaining step and review the client.' };
  if (plan.approvedRecipient && client.email !== plan.approvedRecipient) return { ok: false, error: 'The recipient changed after approval. Cancel the remaining step and review the client.' };
  workflowMessage(plan, plan.clientId, client.email, plan.approvedPayload.body.trim());
  plan.retryCount = (plan.retryCount || 0) + 1;
  finishPlan(plan);
  return { ok: true };
}
function cancelRemainingPlan(id) {
  const plan = planById(id);
  if (!plan || plan.status !== 'Partial') return false;
  for (const result of Object.values(plan.outcomes)) if (result.status === 'failed') Object.assign(result, { status: 'skipped', note: 'Remaining step cancelled by Alex. Completed steps preserved.' });
  finishPlan(plan);
  return true;
}

function plansPage() {
  const filter = ui.planFilter || 'Review';
  const shown = state.plans.filter(plan => filter === 'All' || (filter === 'Deferred' ? ['Snoozed', 'Declined'].includes(plan.status) : filter === 'Review' ? ['Review', 'Partial'].includes(plan.status) : plan.status === filter));
  const count = state.plans.filter(plan => ['Review', 'Partial'].includes(plan.status)).length;
  return `<section class="section-page" id="action-center">${pageHeader('A clear next step.', 'Review the details. Keep control of the outcome.')}<div class="workflow-summary"><span class="list-icon">${icon('bolt')}</span><div><strong>${count} action${count === 1 ? '' : 's'} need your attention</strong><p class="small muted">Three connected demo scenarios · October 23</p></div></div><div class="tabs" role="tablist" aria-label="Action status">${['Review','Completed','Deferred','All'].map(label => `<button role="tab" aria-selected="${filter === label}" class="tab ${filter === label ? 'active' : ''}" data-action="plan-filter" data-value="${label}">${label === 'Review' ? 'Needs review' : label}</button>`).join('')}</div><div class="plan-list">${shown.map(plan => `<article class="card plan-card" id="plan-card-${plan.id}"><div class="between">${badge(plan.status === 'Partial' ? 'Partially completed' : plan.status === 'Review' ? 'Needs review' : plan.status, planStatusClass(plan))}<span class="tiny muted">${Object.keys(planStepLabels(plan)).length} steps</span></div><h2>${esc(plan.title)}</h2><p class="small">${esc(plan.subtitle)}</p>${plan.status === 'Snoozed' ? `<p class="workflow-hint">Set aside until ${esc(plan.snoozedUntil)} in the fixed demo timeline.</p>` : ''}${plan.status === 'Declined' ? `<p class="workflow-hint">${esc(plan.declineReason)}</p>` : ''}${plan.status === 'Partial' ? '<p class="workflow-hint amber-text">Your commitment is saved. Only the message needs a retry.</p>' : ''}<div class="plan-actions"><button class="${plan.status === 'Review' ? 'primary' : 'secondary'}" data-action="plan-open" data-id="${plan.id}">${plan.status === 'Review' ? 'Review action' : plan.status === 'Partial' ? 'Review outcome' : 'View details'} ${icon('arrow','sm')}</button>${plan.status === 'Review' ? `<button class="text-button" data-action="plan-snooze" data-id="${plan.id}">Snooze</button>` : ''}</div></article>`).join('') || emptyState('Everything is in its place.', 'Choose another filter to explore your reviewed actions.', 'circleCheck')}</div><p class="help-note">Every outcome stays in this browser. A simulated send saves the approved words; it never claims delivery.</p></section>`;
}
function field(label, name, value, type = 'text', extra = '') {
  return `<div class="form-row"><label for="plan-${name}">${label}</label><input id="plan-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
}
function stepToggle(name, checked, title, content) {
  return `<section class="approval-section"><label class="approval-label"><input class="check" type="checkbox" name="${name}" ${checked ? 'checked' : ''}><strong>${title}</strong></label>${content}</section>`;
}
function messageFields(plan) {
  const p = plan.payload;
  return stepToggle('message', p.message, plan.type === 'lead' ? 'Save a welcome message' : 'Save a client follow-up', `<div class="form-row"><label for="plan-body">Exact message to approve</label><textarea id="plan-body" name="body" rows="4" maxlength="1800">${esc(p.body)}</textarea></div><p class="tiny muted">${plan.type === 'reschedule' ? 'The reviewed date, time, duration and address are appended below your message. ' : ''}Simulated send only · No external delivery</p>`);
}
function taskFields(plan) {
  const p = plan.payload;
  return stepToggle('task', p.task, 'Create a commitment', field('Next step', 'taskTitle', p.taskTitle, 'text', 'maxlength="120"') + field('Due date · Alex Rivera', 'date', p.date, 'date', 'min="2026-10-23"'));
}
function scheduleFeedback(plan, payload = plan.payload) {
  const conflicts = appointmentConflicts(payload.date, payload.time, payload.duration, plan.eventId);
  const slots = availableTimes(payload.date, payload.duration, plan.eventId).filter(time => time >= '14:00').slice(0, 6);
  return `<div class="note ${conflicts.length ? 'schedule-conflict' : 'schedule-clear'}" id="schedule-feedback" role="status"><strong>${conflicts.length ? 'This time overlaps another appointment' : 'No overlap in your demo agenda'}</strong>${conflicts.map(event => `<p class="small">${esc(event.title)} · ${formatTime(event.time)} · ${esc(event.duration)}</p>`).join('')}<p class="tiny muted">Checks the full appointment duration. Availability is checked again on approval.</p></div><div class="form-row"><label>Available alternatives · Eastern</label><div class="slot-options">${slots.map(time => `<button type="button" class="secondary ${payload.time === time ? 'selected-slot' : ''}" data-action="plan-slot" data-value="${time}" data-id="${plan.id}">${formatTime(time)}</button>`).join('') || '<p class="small">No afternoon slots. Try another date.</p>'}</div></div>`;
}
function openPlan(id) {
  const plan = planById(id);
  if (!plan) return;
  if (plan.status !== 'Review') return planReceipt(id);
  const p = plan.payload;
  let content = '';
  if (plan.type === 'lead') {
    content = `<section class="approval-section"><h3>1. Review the client record</h3><div class="form-two">${field('Full name', 'name', p.name, 'text', 'required maxlength="80"')}${field('Email', 'email', p.email, 'email', 'required maxlength="120"')}</div><div class="form-two">${field('Area', 'area', p.area, 'text', 'required maxlength="100"')}${field('Price expectation · CAD', 'budget', p.budget, 'number', 'required min="100000" max="10000000" step="1000"')}</div><div class="form-two"><div class="form-row"><label for="plan-language">Language</label><select id="plan-language" name="language">${['French','English'].map(language => `<option ${p.language === language ? 'selected' : ''}>${language}</option>`).join('')}</select></div><div class="form-row"><label for="plan-consent">Email permission</label><select id="plan-consent" name="consent">${['Needs review','Email permitted','Opted out'].map(value => `<option ${p.consent === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div></div>${field('Permission evidence · required if permitted', 'evidence', p.evidence, 'text', 'placeholder="Example: fictional reply confirming email permission" maxlength="240"')}<p class="tiny muted">The enquiry alone does not establish permission. Keep it unreviewed if you cannot confirm it.</p><div class="form-row"><label for="plan-note">Client context</label><textarea id="plan-note" name="note" rows="3" maxlength="1000">${esc(p.note)}</textarea></div></section>${taskFields(plan)}${messageFields(plan)}`;
  } else if (plan.type === 'reschedule') {
    const event = state.events.find(item => item.id === plan.eventId);
    const changed = eventStamp(event) !== plan.baseline;
    content = `<div class="diff"><span class="eyebrow">CURRENT APPOINTMENT</span><h3>${event ? `${esc(event.date)} · ${formatTime(event.time)} · ${esc(event.duration)}` : 'Appointment removed'}</h3><p class="small">${esc(event?.location || 'Create a new appointment from Agenda.')}</p>${changed && event ? `<p class="small amber-text">The original appointment changed. Review this version before continuing.</p><button class="secondary" type="button" data-action="plan-rebase" data-id="${id}">Use this current appointment</button>` : ''}</div><div class="form-two">${field('New date', 'date', p.date, 'date', 'required min="2026-10-23"')}${field('New time · Eastern', 'time', p.time, 'time', 'required')}</div><div class="form-row"><label for="plan-duration">Duration</label><select id="plan-duration" name="duration">${[15,30,45,60,90].map(minutes => `<option value="${minutes}" ${Number(p.duration) === minutes ? 'selected' : ''}>${minutes} minutes</option>`).join('')}</select></div><div id="schedule-options">${scheduleFeedback(plan)}</div>${field('Reason for the change', 'reason', p.reason, 'text', 'required maxlength="240"')}${messageFields(plan)}`;
  } else {
    content = `${taskFields(plan)}${messageFields(plan)}<label class="workflow-demo-control"><input class="check" type="checkbox" name="simulateFailure" ${p.simulateFailure ? 'checked' : ''}><span>Try a partial-completion scenario<small>The commitment succeeds; the message has a simulated timeout. Retry preserves completed work.</small></span></label>`;
  }
  openDialog(plan.title, `<div class="between bottom-gap">${badge('Needs your review', 'purple')}<span class="tiny muted">Revision ${plan.revision}</span></div><details class="workflow-source"><summary>Review the source context</summary><p class="tiny muted">${esc(plan.source)}</p><blockquote>${esc(plan.excerpt)}</blockquote></details><form id="plan-review-form" data-form="workflow-plan" data-id="${id}">${content}</form><p class="help-note">Only the selected steps run after approval. Your edits are saved with this revision.</p>`, `<button class="text-button" data-action="plan-decline" data-id="${id}">Decline</button><button class="secondary" type="submit" form="plan-review-form" data-intent="save">Save draft</button><button class="primary" type="submit" form="plan-review-form" data-intent="approve">Approve selected steps</button>`);
}
function planReceipt(id) {
  const plan = planById(id);
  if (!plan) return;
  const labels = planStepLabels(plan);
  openDialog(plan.title, `<div class="between bottom-gap">${badge(plan.status === 'Partial' ? 'Partially completed' : plan.status, planStatusClass(plan))}<span class="tiny muted">${plan.approvedRevision ? 'Approved revision ' + plan.approvedRevision : 'Revision ' + plan.revision}</span></div>${Object.entries(plan.outcomes).map(([key, value]) => `<div class="receipt-step"><span class="list-icon ${value.status === 'done' ? 'green' : value.status === 'failed' ? 'amber' : ''}">${icon(value.status === 'done' ? 'check' : value.status === 'failed' ? 'refresh' : 'close')}</span><div><h3>${esc(labels[key])}</h3><p>${esc(value.note)}</p></div></div>`).join('')}${plan.status === 'Snoozed' ? `<div class="note">Snoozed until ${esc(plan.snoozedUntil)}. This demo uses a fixed date; you can bring it back now.</div>` : ''}${plan.status === 'Declined' ? `<div class="note">${esc(plan.declineReason)}</div>` : ''}${plan.approvedPayload ? `<details class="workflow-source top-gap"><summary>View the approved details</summary>${plan.approvedPayload.task ? `<p class="small">Commitment: ${esc(plan.approvedPayload.taskTitle)} · ${esc(plan.approvedPayload.date)}</p>` : ''}${plan.approvedPayload.name ? `<p class="small">Client: ${esc(plan.approvedPayload.name)} · ${esc(plan.approvedPayload.email)}<br>Permission: ${esc(plan.approvedPayload.consent)}</p>` : ''}${plan.previousAppointment ? `<p class="small">Before: ${esc(plan.previousAppointment.date)} · ${formatTime(plan.previousAppointment.time)}<br>After: ${esc(plan.approvedPayload.date)} · ${formatTime(plan.approvedPayload.time)} · ${plan.approvedPayload.duration} min</p>` : ''}${plan.approvedPayload.message ? `<p class="small preserved-text">${esc(plan.approvedPayload.body)}</p>` : ''}</details>` : ''}${plan.clientId ? `<button class="list-row top-gap" data-action="workflow-client" data-id="${plan.clientId}"><span class="list-icon">${icon('people')}</span><div><h3>${esc(getClient(plan.clientId).name)}</h3><p>Memory, commitments and communication history</p></div>${icon('arrow','sm')}</button>` : ''}<p class="help-note">No email, calendar or CRM provider was contacted. Every receipt describes a local demo outcome.</p>`, plan.status === 'Partial' ? `<button class="secondary" data-action="plan-cancel-remaining" data-id="${id}">Cancel remaining step</button><button class="primary" data-action="plan-retry" data-id="${id}">Retry failed message</button>` : ['Snoozed','Declined'].includes(plan.status) ? `<button class="secondary" data-action="close">Close</button><button class="primary" data-action="plan-restore" data-id="${id}">Return to review</button>` : '<button class="primary" data-action="close">Done</button>');
}

const originalRenderPage = renderPage;
renderPage = function () { return ui.page === 'plans' ? plansPage() : originalRenderPage(); };
const originalHomePage = homePage;
homePage = function () {
  const count = state.plans.filter(plan => ['Review','Partial'].includes(plan.status)).length;
  const base = originalHomePage(), next = state.events.filter(event => event.date >= WORKFLOW_TODAY).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const nextCard = next ? `<button class="next-card" data-action="event" data-id="${esc(next.id)}"><div class="date-block"><strong>${formatTime(next.time).split(' ')[0]}</strong><span>${formatTime(next.time).split(' ')[1]} · ${next.date === WORKFLOW_TODAY ? 'TODAY' : esc(next.date.slice(5))}</span></div><div><h3>${esc(next.title)}</h3><p>${esc(next.location)}</p></div>${icon('chevron')}</button>` : '<div class="note small">Your calendar has a little breathing room.</div>';
  return base.slice(0, base.indexOf('<div class="home-next">')) + `<section class="workflow-home"><button class="card card-button workflow-launch" id="workflow-launch" data-action="navigate" data-page="plans"><span class="list-icon">${icon('bolt')}</span><div><h3>${count ? count + ' actions, ready when you are.' : 'Your reviewed actions, in one place.'}</h3><p>Lead intake, schedule changes and follow-through</p></div>${icon('chevron')}</button></section><div class="home-next"><div class="section-heading"><h2>Next on your calendar</h2><button class="text-button" data-action="navigate" data-page="calendar">View day ${icon('chevron','sm')}</button></div>${nextCard}</div>`;
};
const originalRail = rail;
rail = function () {
  const showing = state.events.find(event => event.id === 'e1');
  return originalRail().replace('Coming up · 2:00 PM', showing ? `Showing · ${formatTime(showing.time)}` : 'Showing removed').replace('Showing at 1280 Avenue du Parc.', showing ? `${esc(showing.date)} · ${esc(showing.location)}.` : 'Create a new appointment from Agenda.');
};
briefing = function () {
  const showing = state.events.find(event => event.id === 'e1');
  openDialog('Your showing, at a glance.', `<div class="between bottom-gap">${badge(showing ? `${showing.date} · ${formatTime(showing.time)}` : 'Appointment removed','purple')}<span class="tiny muted">${esc(showing?.duration || '')}</span></div><div class="row">${avatar(CLIENTS[0],true)}<div><h2>Sarah Mitchell</h2><p class="small">${esc(showing?.location || 'No showing currently scheduled')}</p></div></div><div class="section-heading"><h2>Three things to remember</h2></div><div class="receipt-step">${icon('home')}<div><h3>Natural light matters.</h3><p>Sarah loved the bright living space at the last showing.</p></div></div><div class="receipt-step">${icon('bookmark')}<div><h3>Keep the everyday costs comfortable.</h3><p>Budget up to ${money(state.budget)}. Monthly fee target: under $${state.fees}.</p></div></div><div class="receipt-step">${icon('note')}<div><h3>A garage is ${state.garage.toLowerCase()}.</h3><p>Confirm the parking arrangement before making a shortlist.</p></div></div><p class="source top-gap">Buyer consultation + reviewed local agenda · Demo sources</p>`, `<button class="secondary" data-action="brief-client">Client memory</button><button class="primary" data-action="voice">Capture a recap ${icon('mic','sm')}</button>`);
};
morePage = function () {
  const descriptions = { plans:'Review, approve and trace each next step', recovery:'Reconnect thoughtfully', properties:'Explore the shortlist', vault:'Keep the evidence close', transactions:'Review the next milestone', insights:'See your demo outcomes', settings:'Make Tayoo yours' };
  return `<section class="section-page">${pageHeader('Everything, in its place.', 'Open the workspace you need.')}<div class="more-grid">${[...extraNavigation,['settings','settings','Preferences']].map(([page, name, label]) => `<button class="more-tile" data-action="navigate" data-page="${page}">${icon(name)}<h3>${label}</h3><p>${descriptions[page]}</p></button>`).join('')}</div><div class="card top-gap"><div class="between"><div><h3>Find your way around.</h3><p class="small">A guided tour of your demo workspace</p></div><button class="secondary" data-guide-open>Tutorial</button></div></div></section>`;
};
const originalClientPage = clientPage;
clientPage = function () {
  const client = getClient(ui.selectedClient);
  const messages = state.messages.map((message, index) => ({ ...message, index })).filter(message => message.client === client.id);
  const log = state.worklog.filter(item => item.clientId === client.id).slice(0, 6);
  const completed = state.tasks.filter(task => task.client === client.name && task.done && task.outcome);
  return originalClientPage() + `<section class="section-page workflow-history" id="client-history"><div class="section-heading"><h2>Relationship history</h2><span class="tiny muted">Local demo records</span></div>${messages.length ? messages.slice(-5).reverse().map(message => `<button class="list-row" data-action="saved-message" data-index="${message.index}"><span class="list-icon">${icon('mail')}</span><div><h3>Approved follow-up</h3><p>${esc(message.body.slice(0, 90))}${message.body.length > 90 ? '…' : ''}</p><span class="tiny muted">Simulated send · No delivery claimed</span></div>${icon('chevron','sm')}</button>`).join('') : '<div class="note small">No approved message yet. Reviewed follow-ups will appear here.</div>'}${log.map(item => `<div class="workflow-timeline"><span class="timeline-dot"></span><div><h3>${esc(item.title)}</h3><p class="small muted">${esc(item.body)}</p>${item.planId ? `<button class="text-button" data-action="plan-open" data-id="${item.planId}">View action details</button>` : ''}</div></div>`).join('')}${completed.map(task => `<div class="workflow-timeline"><span class="timeline-dot green-dot"></span><div><h3>${esc(task.title)}</h3><p class="small muted">${esc(task.outcome)}</p><span class="tiny muted">Completion confirmed by Alex</span></div></div>`).join('')}${client.consentEvidence ? `<details class="workflow-source"><summary>Communication permission evidence</summary><p class="small">${esc(client.consentEvidence)}</p></details>` : ''}</section>`;
};
const originalCalendarPage = calendarPage;
calendarPage = function () {
  const proposal = planById('move-sarah');
  return originalCalendarPage() + `<section class="section-page workflow-history" id="schedule-proposals"><div class="section-heading"><h2>Schedule changes</h2>${badge(proposal.status, planStatusClass(proposal))}</div><button class="list-row" data-action="plan-open" data-id="move-sarah"><span class="list-icon">${icon('calendar')}</span><div><h3>Sarah asked for a later showing</h3><p>Check availability, choose a time and review the update.</p></div>${icon('chevron','sm')}</button></section>`;
};

const originalSendChat = sendChat;
sendChat = function (text) {
  const lower = text.toLowerCase();
  let response, destination;
  if (/new lead|enquiry|inquiry|action cent|reschedul|move.*showing|inspection follow/.test(lower)) {
    response = 'The Action Center has three prepared scenarios: a seller enquiry, a showing time change and inspection follow-through. Open a proposal to edit its details and choose the steps. No new action was inferred from your message.';
    destination = { page:'plans', title:'Review the next step', text:'Lead intake · Rescheduling · Partial-result recovery', icon:'bolt' };
  } else if (/calendar|schedule|meeting|appointment|tomorrow|today/.test(lower) && !/showing|recap|garage|fees|budget|sarah/.test(lower)) {
    const count = state.events.filter(event => event.date === ui.selectedDay).length;
    response = `Your demo agenda has ${count} appointment${count === 1 ? '' : 's'} on ${ui.selectedDay}. Open it to inspect the current times, make changes or review commitments.`;
    destination = { page:'calendar', title:'Your day, organized', text:'Schedule and commitments · Eastern time', icon:'calendar' };
  } else if (/tremblay|transaction|inspect|file/.test(lower) && !/recap|showing/.test(lower)) {
    response = `The Tremblay file has ${state.checklist.length} reviewed milestones. ${state.financingDate ? 'The broker-reviewed demo financing date is ' + state.financingDate + '.' : 'The conflicting financing date needs a broker review.'}`;
    destination = { page:'transactions', title:'The Tremblay file', text:'Milestones, evidence and review history', icon:'briefcase' };
  } else { originalSendChat(text); return; }
  ui.page = 'chat';
  ui.chat.push({ type:'user', text:(ui.attachment ? '[Context: ' + ui.attachment + ']\n' : '') + text }, { type:'assistant', text:response }, { type:'navigation', ...destination });
  ui.attachment = ''; state.conversation = ui.chat; save(); render(); window.scrollTo({ top:document.body.scrollHeight, behavior:'smooth' });
};

// All manually created appointments use the same duration-aware availability check.
newEvent = function (event = null) {
  openDialog(event ? 'Edit appointment' : 'Make time for a conversation.', `<form id="event-form" data-form="workflow-event" data-id="${event?.id || ''}">${field('Appointment', 'title', event?.title || '', 'text', 'required maxlength="100"')}<div class="form-row"><label for="event-client">Client</label><select name="client" id="event-client">${allClients().map(client => `<option ${client.name === event?.client ? 'selected' : ''}>${esc(client.name)}</option>`).join('')}</select></div><div class="form-two">${field('Date', 'date', event?.date || ui.selectedDay, 'date', 'required min="2026-10-23"')}${field('Time · Eastern', 'time', event?.time || '11:00', 'time', 'required')}</div><div class="form-row"><label for="event-duration">Duration</label><select name="duration" id="event-duration">${[15,30,45,60,90].map(minutes => `<option value="${minutes}" ${minutes === durationMinutes(event?.duration) ? 'selected' : ''}>${minutes} minutes</option>`).join('')}</select></div>${field('Location', 'location', event?.location || '', 'text', 'required maxlength="180"')}<div class="form-row"><label for="event-note">A note for your future self</label><textarea id="event-note" name="note" rows="3" maxlength="1000">${esc(event?.note || '')}</textarea></div><p class="note small">The whole time range is checked for overlaps. Saves only to this demo agenda; no invitation is sent.</p></form>`, `<button class="secondary" data-action="${event ? 'delete-event' : 'close'}" ${event ? `data-id="${event.id}"` : ''}>${event ? 'Remove' : 'Cancel'}</button><button class="primary" type="submit" form="event-form">Save appointment</button>`);
};
function saveWorkflowEvent(id, values) {
  if (!values.title?.trim() || !values.location?.trim()) return { ok: false, error: 'Add an appointment title and location.' };
  if (!validWorkflowDate(values.date) || values.date < WORKFLOW_TODAY || !Number.isFinite(timeMinutes(values.time))) return { ok: false, error: 'Choose a valid date and time on or after October 23.' };
  if (![15,30,45,60,90].includes(Number(values.duration)) || timeMinutes(values.time) + Number(values.duration) > 1440) return { ok: false, error: 'Choose a duration that ends on the same day.' };
  const conflict = appointmentConflicts(values.date, values.time, values.duration, id)[0];
  if (conflict) return { ok: false, error: `This appointment overlaps ${conflict.title} at ${formatTime(conflict.time)}. Choose another time.` };
  const existing = state.events.find(event => event.id === id);
  const appointment = { id: id || 'event-' + Date.now(), title: values.title.trim(), client: values.client, date: values.date, time: values.time, duration: Number(values.duration) + ' min', location: values.location.trim(), note: values.note?.trim() || '', color: existing?.color || '' };
  if (existing) Object.assign(existing, appointment); else state.events.push(appointment);
  const client = allClients().find(item => item.name === values.client);
  if (client) workflowLog(client.id, existing ? 'Appointment updated' : 'Appointment added', `${values.title} · ${values.date}, ${formatTime(values.time)} Eastern`);
  ui.selectedDay = values.date;
  save();
  return { ok: true, id: appointment.id };
}

const MILESTONES = [
  { id:'identity', title:'Client identity reviewed', due:'2026-10-18', requires:[], evidence:'Identity review recorded by Alex on October 18.' },
  { id:'listing', title:'Listing documents organized', due:'2026-10-20', requires:['identity'], evidence:'Fictional listing package linked to TX-2026-024.' },
  { id:'inspection', title:'Inspection reviewed with client', due:'2026-10-23', requires:['listing'], evidence:'' },
  { id:'financing', title:'Financing date confirmed', due:'2026-10-28', requires:['inspection'], evidence:'' },
  { id:'notary', title:'Notary appointment arranged', due:'2026-10-27', requires:['financing'], evidence:'' }
];
function milestoneRecord(id) {
  const definition = MILESTONES.find(item => item.id === id);
  return { owner:'Alex Rivera', due:definition.due, evidence:definition.evidence, history:[], ...(state.milestoneReviews[id] || {}) };
}
transactionsPage = function () {
  const count = MILESTONES.filter(item => state.checklist.includes(item.id)).length;
  return `<section class="section-page">${pageHeader('Keep the whole picture.', 'The Tremblay file · TX-2026-024')}<div class="client-summary"><div class="between">${badge('Under contract','purple')}<span class="tiny muted">Closing target · Nov 12</span></div><h2>845 Rue des Érables</h2><p>Marc Tremblay · Alex Rivera</p><div class="progress-track"><div style="width:${count / MILESTONES.length * 100}%"></div></div><div class="tiny muted">${count} of ${MILESTONES.length} milestones reviewed</div></div><div class="note ${state.financingDate ? '' : 'schedule-conflict'}"><div class="between"><div><strong>${state.financingDate ? 'Financing date reviewed' : 'Two sources. One unresolved date.'}</strong><p class="small">${state.financingDate ? esc(state.financingDate) + ' · Your broker-reviewed demo date' : 'October 28 in the agent note; October 30 in the report excerpt.'}</p></div><button class="text-button" data-action="milestone-review" data-id="financing">Review</button></div></div><div class="section-heading"><h2>Milestone reviews</h2><span class="tiny muted">Owner · Due date · Evidence</span></div><div id="transaction-checklist">${MILESTONES.map(item => { const reviewed = state.checklist.includes(item.id), record = milestoneRecord(item.id), missing = item.requires.filter(id => !state.checklist.includes(id)); return `<button class="list-row milestone-row" data-action="milestone-review" data-id="${item.id}"><span class="list-icon ${reviewed ? 'green' : missing.length ? '' : 'purple'}">${icon(reviewed ? 'circleCheck' : missing.length ? 'shield' : 'circleCheck')}</span><div><h3>${item.title}</h3><p>${esc(record.owner)} · ${esc(record.due)}</p><span class="tiny ${reviewed ? 'green-text' : 'muted'}">${reviewed ? 'Reviewed · Evidence saved' : missing.length ? 'Waiting for the previous review' : 'Ready for your review'}</span></div>${icon('chevron','sm')}</button>`; }).join('')}</div><div class="section-heading"><h2>Related evidence</h2></div><button class="list-row" data-action="document" data-id="inspection"><span class="list-icon">${icon('note')}</span><div><h3>Sample inspection excerpt</h3><p>Fictional source · October 22</p></div>${icon('chevron','sm')}</button><button class="list-row" data-action="plan-open" data-id="inspection-marc"><span class="list-icon">${icon('bolt')}</span><div><h3>Inspection follow-through</h3><p>Review the commitment and client message</p></div>${icon('chevron','sm')}</button><p class="help-note">A review records your demo decision and evidence. It does not establish that a contractual condition has been satisfied.</p></section>`;
};
function reviewMilestone(id) {
  const item = MILESTONES.find(definition => definition.id === id);
  if (!item) return;
  const record = milestoneRecord(id), done = state.checklist.includes(id);
  const missing = item.requires.filter(key => !state.checklist.includes(key)).map(key => MILESTONES.find(definition => definition.id === key).title);
  openDialog(item.title, `<div class="between bottom-gap">${badge(done ? 'Reviewed' : missing.length ? 'Previous review required' : 'Ready for review', done ? 'green' : 'purple')}<span class="tiny muted">Tremblay file</span></div>${missing.length ? `<div class="note schedule-conflict">First review: ${missing.map(esc).join(', ')}. You can save notes now.</div>` : ''}${id === 'financing' ? '<div class="diff"><h3>Source comparison</h3><p class="small">Agent note · October 20: <strong>October 28</strong></p><p class="small">Sample inspection excerpt · October 22: <strong>October 30</strong></p><p class="tiny muted">Confirm your decision and evidence below. Neither source is silently treated as authoritative.</p></div>' : ''}<form id="milestone-form" data-form="workflow-milestone" data-id="${id}"><div class="form-two">${field('Owner', 'owner', record.owner, 'text', 'required maxlength="80"')}${field('Review due date', 'due', record.due, 'date', 'required')}</div>${id === 'financing' ? field('Broker-confirmed financing date', 'financingDate', state.financingDate || '', 'date', 'min="2026-10-23"') : ''}<div class="form-row"><label for="milestone-evidence">${done ? 'Review evidence / reason to reopen' : 'Evidence and review note'}</label><textarea id="milestone-evidence" name="evidence" rows="4" maxlength="1500" placeholder="Record what you reviewed, who confirmed it and what remains open.">${esc(record.evidence)}</textarea></div>${!done ? '<label class="approval-label"><input class="check" type="checkbox" name="confirmed">I reviewed this milestone and its supporting evidence.</label>' : '<p class="note small">Reopening this milestone also reopens completed dependent reviews. Their notes and history are retained.</p>'}</form>${record.history.length ? `<details class="workflow-source top-gap"><summary>Review history · ${record.history.length}</summary>${record.history.slice().reverse().map(entry => `<div class="workflow-history-entry"><strong>${esc(entry.action)}</strong><p class="small">${esc(entry.note)}</p><span class="tiny muted">${esc(entry.owner)} · ${esc(entry.date)}</span></div>`).join('')}</details>` : ''}`, `<button class="secondary" type="submit" form="milestone-form" data-intent="save">Save notes</button><button class="primary" type="submit" form="milestone-form" data-intent="${done ? 'reopen' : 'complete'}">${done ? 'Reopen review' : 'Complete review'}</button>`);
}
function updateMilestone(id, values, intent) {
  const item = MILESTONES.find(definition => definition.id === id);
  if (!item) return { ok:false, error:'Milestone not found.' };
  if (!values.owner?.trim() || !validWorkflowDate(values.due)) return { ok:false, error:'Add an owner and a valid review due date.' };
  if (intent !== 'save' && !values.evidence?.trim()) return { ok:false, error:'Add the evidence you reviewed or the reason for reopening.' };
  if (intent === 'complete') {
    if (!values.confirmed) return { ok:false, error:'Confirm that you reviewed the evidence.' };
    if (item.requires.some(key => !state.checklist.includes(key))) return { ok:false, error:'Complete the previous milestone review first.' };
    if (id === 'financing' && (!validWorkflowDate(values.financingDate) || values.financingDate < WORKFLOW_TODAY)) return { ok:false, error:'Choose a broker-confirmed financing date on or after October 23.' };
  }
  const previous = milestoneRecord(id);
  const record = { ...previous, owner:values.owner.trim(), due:values.due, evidence:values.evidence?.trim() || '' };
  record.history.push({ action: intent === 'complete' ? 'Review completed' : intent === 'reopen' ? 'Review reopened' : 'Notes updated', note:record.evidence, owner:record.owner, date:WORKFLOW_TODAY });
  state.milestoneReviews[id] = record;
  if (intent === 'complete') {
    if (!state.checklist.includes(id)) state.checklist.push(id);
    if (id === 'financing') state.financingDate = values.financingDate;
  }
  if (intent === 'reopen') {
    const reopened = new Set([id]);
    for (const definition of MILESTONES) if (definition.requires.some(key => reopened.has(key))) reopened.add(definition.id);
    for (const key of reopened) {
      if (key !== id && state.checklist.includes(key)) {
        const dependent = milestoneRecord(key);
        dependent.history.push({ action:'Reopened after a prerequisite changed', note:item.title + ' was reopened.', owner:'Alex Rivera', date:WORKFLOW_TODAY });
        state.milestoneReviews[key] = dependent;
      }
    }
    state.checklist = state.checklist.filter(key => !reopened.has(key));
    if (reopened.has('financing')) delete state.financingDate;
  }
  workflowLog('marc', item.title, intent === 'complete' ? 'Review completed: ' + record.evidence : intent === 'reopen' ? 'Review reopened: ' + record.evidence : 'Review notes updated.');
  save();
  return { ok:true };
}

taskRow = function (task) {
  return `<div class="task-row ${task.done ? 'done' : ''}"><button class="commitment-toggle ${task.done ? 'is-done' : ''}" data-action="commitment-toggle" data-id="${esc(task.id)}" aria-label="${task.done ? 'Reopen' : 'Complete'} ${esc(task.title)}" aria-pressed="${task.done}">${icon(task.done ? 'circleCheck' : 'check','sm')}</button><div class="task-copy"><strong>${esc(task.title)}</strong><small>${esc(task.client)} · ${task.date === WORKFLOW_TODAY ? 'Today' : esc(task.date)}</small>${task.done && task.outcome ? `<small>${esc(task.outcome)}</small>` : ''}</div><button class="icon-button plain" data-action="task-detail" data-id="${esc(task.id)}" aria-label="Edit ${esc(task.title)}">${icon('more','sm')}</button></div>`;
};
function reviewCommitment(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  if (task.done) {
    task.done = false;
    task.previousOutcome = task.outcome;
    delete task.outcome;
    save(); render(); toast('Commitment reopened.'); return;
  }
  openDialog('Close the loop.', `<p class="small bottom-gap">${esc(task.title)}</p><form id="commitment-form" data-form="workflow-commitment" data-id="${id}"><div class="form-row"><label for="commitment-outcome">What happened?</label><textarea id="commitment-outcome" name="outcome" rows="4" maxlength="600" required placeholder="For example: reviewed the findings with Marc and agreed on the next call.">${esc(task.previousOutcome || '')}</textarea></div><p class="note small">A prepared draft does not complete the commitment. Record the outcome you are confirming in this demo.</p></form>`, '<button class="secondary" data-action="close">Keep open</button><button class="primary" form="commitment-form" type="submit">Confirm completion</button>');
}
function completeCommitment(id, outcome) {
  const task = state.tasks.find(item => item.id === id);
  if (!task || !outcome?.trim()) return { ok:false, error:'Describe the outcome before closing this commitment.' };
  if (task.done) return { ok:false, error:'This commitment is already complete.' };
  task.done = true; task.outcome = outcome.trim(); task.completedAt = new Date().toISOString();
  save(); return { ok:true };
}

const originalHandleAction = handleAction;
handleAction = function (action, button) {
  const id = button.dataset.id;
  if (action === 'activity-detail') {
    const activity = state.activity.find(item => item.id === id);
    if (activity?.planId) { openPlan(activity.planId); return; }
  }
  if (action === 'plan-filter') { ui.planFilter = button.dataset.value; render(); return; }
  if (action === 'plan-open') { openPlan(id); return; }
  if (action === 'plan-snooze') {
    const plan = planById(id); if (!plan || plan.status !== 'Review') return;
    plan.status = 'Snoozed'; plan.snoozedUntil = '2026-10-24'; save(); render(); toast('Set aside until tomorrow. Find it in Deferred.'); return;
  }
  if (action === 'plan-decline') {
    openDialog('Decline this proposed action?', `<form id="plan-decline-form" data-form="workflow-decline" data-id="${id}"><div class="form-row"><label for="decline-reason">Reason for the record</label><textarea id="decline-reason" name="reason" rows="3" required maxlength="500" placeholder="For example: client’s plans changed."></textarea></div></form><p class="help-note">No proposed steps will run. You can return the action to review later.</p>`, `<button class="secondary" data-action="plan-open" data-id="${id}">Keep reviewing</button><button class="primary" type="submit" form="plan-decline-form">Decline action</button>`); return;
  }
  if (action === 'plan-restore') {
    const plan = planById(id); if (!plan || !['Snoozed','Declined'].includes(plan.status)) return;
    plan.status = 'Review'; delete plan.snoozedUntil; delete plan.declineReason; save(); render(); openPlan(id); return;
  }
  if (action === 'plan-retry' || action === 'plan-cancel-remaining') {
    const result = action === 'plan-retry' ? retryPlan(id) : { ok:cancelRemainingPlan(id) };
    if (!result.ok) { toast(result.error || 'No remaining step to cancel.'); return; }
    render(); planReceipt(id); return;
  }
  if (action === 'plan-rebase') {
    const plan = planById(id), event = state.events.find(item => item.id === plan?.eventId);
    if (plan?.status === 'Review' && event) { plan.baseline = eventStamp(event); plan.revision += 1; save(); toast('Current appointment reviewed. Your proposed time is still editable.'); button.disabled = true; }
    return;
  }
  if (action === 'plan-slot') {
    document.querySelector('#plan-time').value = button.dataset.value;
    updateSchedulePreview(id); return;
  }
  if (action === 'workflow-client') { closeDialog(); ui.selectedClient = id; navigate('client'); return; }
  if (action === 'milestone-review' || action === 'conflict') { reviewMilestone(action === 'conflict' ? 'financing' : id); return; }
  if (action === 'commitment-toggle') { reviewCommitment(id); return; }
  originalHandleAction(action, button);
  if (action === 'confirm-reset') { migrateWorkflows(); ui.planFilter = 'Review'; render(); }
};
function updateSchedulePreview(id) {
  const plan = planById(id);
  if (!plan) return;
  const values = { date:document.querySelector('#plan-date').value, time:document.querySelector('#plan-time').value, duration:Number(document.querySelector('#plan-duration').value) };
  document.querySelector('#schedule-options').innerHTML = scheduleFeedback(plan, values);
}
document.addEventListener('change', event => {
  if (['plan-date','plan-time','plan-duration'].includes(event.target.id)) {
    const form = event.target.closest('form');
    if (form?.dataset.form === 'workflow-plan' && planById(form.dataset.id)?.type === 'reschedule') updateSchedulePreview(form.dataset.id);
  }
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (!form.dataset.form?.startsWith('workflow-')) return;
  event.preventDefault();
  const data = new FormData(form), value = name => String(data.get(name) || '').trim(), checked = name => data.has(name);
  let result;
  if (form.dataset.form === 'workflow-plan') {
    const plan = planById(form.dataset.id);
    let payload;
    if (plan.type === 'lead') payload = { name:value('name'), email:value('email'), area:value('area'), budget:Number(value('budget')), language:value('language'), consent:value('consent'), evidence:value('evidence'), note:value('note'), task:checked('task'), taskTitle:value('taskTitle'), date:value('date'), message:checked('message'), body:value('body') };
    else if (plan.type === 'reschedule') payload = { date:value('date'), time:value('time'), duration:Number(value('duration')), reason:value('reason'), message:checked('message'), body:value('body') };
    else payload = { task:checked('task'), taskTitle:value('taskTitle'), date:value('date'), message:checked('message'), body:value('body'), simulateFailure:checked('simulateFailure') };
    result = savePlanDraft(plan.id, payload);
    if (!result.ok) { toast(result.error); return; }
    if (event.submitter?.dataset.intent !== 'approve') { closeDialog(); render(); toast('Draft saved. No steps have run.'); return; }
    result = approvePlan(plan.id);
    if (!result.ok) { toast(result.error); return; }
    render(); planReceipt(plan.id); return;
  }
  if (form.dataset.form === 'workflow-event') result = saveWorkflowEvent(form.dataset.id, { title:value('title'), client:value('client'), date:value('date'), time:value('time'), duration:Number(value('duration')), location:value('location'), note:value('note') });
  if (form.dataset.form === 'workflow-milestone') result = updateMilestone(form.dataset.id, { owner:value('owner'), due:value('due'), evidence:value('evidence'), financingDate:value('financingDate'), confirmed:checked('confirmed') }, event.submitter?.dataset.intent || 'save');
  if (form.dataset.form === 'workflow-commitment') result = completeCommitment(form.dataset.id, value('outcome'));
  if (form.dataset.form === 'workflow-decline') {
    const plan = planById(form.dataset.id);
    if (!value('reason')) { toast('Add a short reason for declining.'); return; }
    if (!plan || plan.status !== 'Review') { toast('This action is no longer awaiting review.'); return; }
    plan.status = 'Declined'; plan.declineReason = value('reason'); save(); result = { ok:true };
  }
  if (result && !result.ok) { toast(result.error); return; }
  closeDialog(); render(); toast('Saved in your demo workspace.');
});

render();
if (window.DemoGuide) {
  const tourPage = (page, configure) => () => { if (modal.open) closeDialog(); if (configure) configure(); ui.page = page; render(); window.scrollTo({ top:0, behavior:'instant' }); };
  window.DemoGuide.setup({ id:'tayoo', title:'Your first day with Tayoo', lang:'en', accent:'#9b8aff', onAccent:'#191524', theme:'dark', steps:[
    { title:'Start with the next step', body:'Tayoo turns client context into work you can review. Open the Action Center to try three connected scenarios. Every record is fictional and stays in this browser.', target:'#workflow-launch', enter:tourPage('home') },
    { title:'Review a new seller enquiry', body:'Open Élise’s action to edit her details, review communication permission and choose whether to add a commitment or a welcome message. Approval links the selected steps to her new client record.', target:'#plan-card-lead-elise', enter:tourPage('plans', () => { ui.planFilter = 'All'; }) },
    { title:'Resolve a scheduling conflict', body:'Sarah’s requested time overlaps an existing appointment. Open the proposal, choose an available alternative, review the message and approve. Availability is checked again before anything changes.', target:'#plan-card-move-sarah', enter:tourPage('plans', () => { ui.planFilter = 'All'; }) },
    { title:'Recover from a partial result', body:'The inspection scenario can simulate a message timeout after saving its commitment. The receipt shows what succeeded. Retry only the failed message, or cancel the remaining step.', target:'#plan-card-inspection-marc', enter:tourPage('plans', () => { ui.planFilter = 'All'; }) },
    { title:'Keep the relationship connected', body:'Client memory, commitments and approved words stay together. This history grows as you review actions. Open a message to see the exact saved text and its simulated outcome.', target:'#client-history', enter:tourPage('client', () => { ui.selectedClient = 'marc'; }) },
    { title:'Protect the whole time slot', body:'Add or edit appointments from Agenda. Overlap checks include duration, and schedule proposals are kept below the agenda. Commitments need a confirmed outcome before they close.', target:'#schedule-proposals', enter:tourPage('calendar') },
    { title:'Review a transaction with evidence', body:'Each milestone has an owner, due date, evidence and history. Complete the inspection review before resolving the financing date. Reopening an earlier review also reopens its dependent milestones.', target:'#transaction-checklist', enter:tourPage('transactions') },
    { title:'Trace the outcome', body:'Activity keeps receipts for reviewed actions. The envelope opens approved messages. Nothing in this demo contacts a provider or claims that a message was delivered.', target:'.section-page', enter:tourPage('activity') },
    { title:'Explore at your own pace', body:'Your changes stay in this browser. Preferences includes a fresh-demo reset. Use Tutorial in the header whenever you want to resume or replay this walkthrough.', target:'.section-page', enter:tourPage('settings') }
  ] });
}
