// The MailInApp webhook event catalog (mailinapp_next_js's
// src/lib/webhooks/events.ts, LEAD_FLYWHEEL_PLAN.md 10.1) as the trigger's
// event picker. Pure data with no imports, so the web app's own test suite
// (src/lib/webhooks/n8nCatalog.test.ts) can check it against the catalog
// without installing this package.
//
// Adding an event on the web side means adding it here, in catalog order. The
// web test fails until that's done.

export interface MailInAppEvent {
	type: string;
	name: string;
	description: string;
}

export const EVENTS: MailInAppEvent[] = [
	{
		type: 'interaction.received',
		name: 'Interaction Received',
		description:
			'A recipient interacted with an email: voted in a poll, answered a quiz, clicked a tracked button',
	},
	{
		type: 'form.submitted',
		name: 'Form Submitted',
		description: 'Someone submitted a form in an email or a signup form',
	},
	{
		type: 'contact.created',
		name: 'Contact Created',
		description: 'A contact was added to one of your contacts lists',
	},
	{
		type: 'contact.updated',
		name: 'Contact Updated',
		description: "A contact's fields changed",
	},
	{
		type: 'lead.hot',
		name: 'Lead Turned Hot',
		description: "A contact's engagement score crossed your hot-lead threshold",
	},
	{
		type: 'lead.new',
		name: 'New Lead',
		description: 'A new lead came in from a signup form or a form in an email',
	},
	{
		type: 'booking.created',
		name: 'Meeting Booked',
		description: 'Someone booked a meeting from an email',
	},
	{
		type: 'booking.cancelled',
		name: 'Meeting Cancelled',
		description: 'A booked meeting was cancelled',
	},
	{
		type: 'deal.created',
		name: 'Deal Created',
		description: 'A deal was created in one of your pipelines',
	},
	{
		type: 'deal.stage_changed',
		name: 'Deal Stage Changed',
		description: 'A deal moved to another stage, including won and lost',
	},
	{
		type: 'purchase.completed',
		name: 'Purchase Completed',
		description: 'A recipient completed a purchase from an email',
	},
	{
		type: 'journey.completed',
		name: 'Journey Completed',
		description: 'A contact reached the end of a journey',
	},
];
