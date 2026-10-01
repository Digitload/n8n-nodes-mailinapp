import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { EVENTS } from '../shared/events';
import { verifySignature } from '../shared/signature';
import { apiRequest, CREDENTIAL } from '../shared/transport';

// Starts a workflow on MailInApp webhook events (LEAD_FLYWHEEL_PLAN.md 10.4)
// through the account-level subscriptions of 10.1:
//   - activation:   POST /api/v1/webhooks {url, events, source: "n8n"}; the
//                   subscription id and secret are kept in the node's static
//                   data.
//   - deactivation: DELETE /api/v1/webhooks/{id}. A 404 (already gone, e.g.
//                   auto-disabled after a 410) counts as done.
//   - delivery:     dropped with a 401 unless X-MailInApp-Signature verifies
//                   against the raw body with that secret, so knowing the
//                   webhook URL isn't enough to start someone's workflow.
// The output is the delivery's envelope as sent: {id, type, createdAt, data},
// with `data.test: true` on a dashboard "Send test". `id` is stable per real-world
// event (also sent as X-MailInApp-Idempotency-Key), so a retried delivery can
// be deduplicated on it.

interface Subscription {
	id: string;
	url: string;
	events: string[];
	status: string;
}

const sameEvents = (a: string[], b: string[]) =>
	a.length === b.length && [...a].sort().join() === [...b].sort().join();

export class MailInAppTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MailInApp Trigger',
		name: 'mailInAppTrigger',
		icon: { light: 'file:../../icons/mailinapp.svg', dark: 'file:../../icons/mailinapp.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when MailInApp events occur',
		defaults: { name: 'MailInApp Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: CREDENTIAL, required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: EVENTS.map((event) => ({
					name: event.name,
					value: event.type,
					description: event.description,
				})),
				description: 'The events to start the workflow on',
			},
		],
	};

	webhookMethods = {
		default: {
			// True only when the stored subscription still exists, is active, and
			// matches this webhook URL and the selected events. A stale one (events
			// changed since activation) is removed so `create` makes a fresh one.
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const id = staticData.subscriptionId as string | undefined;
				if (!id) return false;
				const { body } = await apiRequest.call(this, 'GET', '/api/v1/webhooks');
				const subscription = ((body.subscriptions as Subscription[]) ?? []).find(
					(entry) => entry.id === id,
				);
				const events = this.getNodeParameter('events') as string[];
				if (
					subscription &&
					subscription.status === 'active' &&
					subscription.url === this.getNodeWebhookUrl('default') &&
					sameEvents(subscription.events, events)
				) {
					return true;
				}
				if (subscription) {
					await apiRequest.call(this, 'DELETE', `/api/v1/webhooks/${encodeURIComponent(id)}`, {
						allowStatus: [404],
					});
				}
				delete staticData.subscriptionId;
				delete staticData.secret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const { body } = await apiRequest.call(this, 'POST', '/api/v1/webhooks', {
					body: {
						url: this.getNodeWebhookUrl('default'),
						events: this.getNodeParameter('events') as string[],
						source: 'n8n',
					},
				});
				const staticData = this.getWorkflowStaticData('node');
				staticData.subscriptionId = body.id;
				staticData.secret = body.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const id = staticData.subscriptionId as string | undefined;
				if (id) {
					await apiRequest.call(this, 'DELETE', `/api/v1/webhooks/${encodeURIComponent(id)}`, {
						allowStatus: [404],
					});
				}
				delete staticData.subscriptionId;
				delete staticData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const secret = this.getWorkflowStaticData('node').secret as string | undefined;
		const request = this.getRequestObject();
		if (!request.rawBody) await request.readRawBody();
		const rawBody = request.rawBody ? request.rawBody.toString('utf8') : '';
		if (!secret || !verifySignature(secret, request.headers, rawBody, Date.now())) {
			this.getResponseObject().status(401).json({ error: 'Invalid signature' });
			return { noWebhookResponse: true };
		}

		const envelope = this.getBodyData() as IDataObject;
		const events = this.getNodeParameter('events') as string[];
		if (!envelope.id || typeof envelope.type !== 'string' || !events.includes(envelope.type)) {
			return { webhookResponse: { ok: true, ignored: true } };
		}
		return { workflowData: [this.helpers.returnJsonArray([envelope])] };
	}
}
