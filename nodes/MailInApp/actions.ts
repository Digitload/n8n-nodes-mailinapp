import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { apiRequest, compact } from '../shared/transport';
import { htmlToText, textToHtml } from '../shared/text';

// One function per resource:operation. Each returns the items to output for
// input item `i`. All of them are thin calls to /api/v1; the server does the
// work (verification on contact writes, consent never set by the API, deal
// automation on a stage move).

type Operation = (this: IExecuteFunctions, i: number) => Promise<IDataObject[]>;

interface NameValue {
	name?: string;
	value?: string;
}

const pairs = (collection: IDataObject, key: string): IDataObject =>
	compact(
		Object.fromEntries(
			((collection[key] as NameValue[] | undefined) ?? [])
				.filter((pair) => pair.name)
				.map((pair) => [pair.name as string, pair.value]),
		),
	);

const limitResults = (ctx: IExecuteFunctions, i: number, rows: IDataObject[]): IDataObject[] => {
	if (ctx.getNodeParameter('returnAll', i) as boolean) return rows;
	return rows.slice(0, ctx.getNodeParameter('limit', i) as number);
};

const contactUpsert: Operation = async function (i) {
	const { statusCode, body } = await apiRequest.call(this, 'POST', '/api/v1/contacts', {
		body: {
			listId: this.getNodeParameter('listId', i) as string,
			email: this.getNodeParameter('email', i) as string,
			fields: pairs(this.getNodeParameter('contactFields', i, {}) as IDataObject, 'field'),
		},
	});
	return [{ ...(body.contact as IDataObject), created: statusCode === 201 }];
};

// Every list the address is on, most recently updated first. Each read is
// recorded in the account's data-access log on the server.
const contactGet: Operation = async function (i) {
	const { body } = await apiRequest.call(this, 'GET', '/api/v1/contacts', {
		qs: compact({
			email: this.getNodeParameter('email', i) as string,
			listId: this.getNodeParameter('listId', i, '') as string,
		}),
	});
	return (body.contacts as IDataObject[]) ?? [];
};

const listGetAll: Operation = async function (i) {
	const { body } = await apiRequest.call(this, 'GET', '/api/v1/lists');
	return limitResults(this, i, (body.lists as IDataObject[]) ?? []);
};

const dealCreate: Operation = async function (i) {
	const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	const { body } = await apiRequest.call(this, 'POST', '/api/v1/deals', {
		body: compact({
			email: this.getNodeParameter('email', i) as string,
			title: this.getNodeParameter('title', i) as string,
			listId: extra.listId,
			value: extra.value,
			currency: extra.currency,
			pipelineId: extra.pipelineId,
			stageId: extra.stageId,
		}),
		headers: extra.idempotencyKey ? { 'Idempotency-Key': extra.idempotencyKey } : undefined,
	});
	return [{ ...(body.deal as IDataObject), created: body.created !== false }];
};

// pipelineId only narrows the stage dropdown and isn't sent: a deal can't
// change pipelines, its new stage must be one of its own pipeline's.
const dealUpdate: Operation = async function (i) {
	const update = this.getNodeParameter('updateFields', i, {}) as IDataObject;
	const body = compact({
		title: update.title,
		value: update.value,
		currency: update.currency,
		stageId: update.stageId,
	});
	if (Object.keys(body).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'Set at least one of Stage, Title, Value or Currency',
			{ itemIndex: i },
		);
	}
	const dealId = this.getNodeParameter('dealId', i) as string;
	const response = await apiRequest.call(
		this,
		'PATCH',
		`/api/v1/deals/${encodeURIComponent(dealId)}`,
		{ body },
	);
	return [{ ...(response.body.deal as IDataObject), moved: response.body.moved }];
};

// Always type "transactional". Marketing sends are left out on purpose: they
// need consent a workflow can't prove. A "failed" outcome comes back as HTTP
// 200 and is raised here so the execution shows it; "suppressed" (the
// address bounced or is invalid) is a normal result for an If node to act on.
const emailSend: Operation = async function (i) {
	const to = this.getNodeParameter('to', i) as string;
	const content = this.getNodeParameter('content', i) as string;
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	let payload: IDataObject;
	if (content === 'project') {
		payload = {
			projectId: this.getNodeParameter('projectId', i) as string,
			mergeData: pairs(this.getNodeParameter('mergeData', i, {}) as IDataObject, 'value'),
			subject: options.subject,
		};
	} else {
		const html = this.getNodeParameter('html', i, '') as string;
		const text = this.getNodeParameter('text', i, '') as string;
		if (!html && !text) {
			throw new NodeOperationError(this.getNode(), 'Set HTML, Text, or both', { itemIndex: i });
		}
		payload = {
			subject: this.getNodeParameter('subject', i) as string,
			html: html || textToHtml(text),
			text: text || htmlToText(html),
		};
	}
	const { body } = await apiRequest.call(this, 'POST', '/api/v1/send', {
		body: compact({
			to,
			type: 'transactional',
			...payload,
			from: options.fromEmail
				? compact({ email: options.fromEmail, name: options.fromName })
				: undefined,
			replyTo: options.replyTo,
		}),
	});
	if (body.status === 'failed') {
		throw new NodeApiError(this.getNode(), body as never, {
			message: `MailInApp could not send the email: ${String(body.error || 'unknown error')}`,
			itemIndex: i,
		});
	}
	return [body];
};

// The server adds the address to the list first if it isn't there.
const journeyEnroll: Operation = async function (i) {
	const journeyId = this.getNodeParameter('journeyId', i) as string;
	const listId = this.getNodeParameter('listId', i) as string;
	const email = this.getNodeParameter('email', i) as string;
	const { body } = await apiRequest.call(
		this,
		'POST',
		`/api/v1/journeys/${encodeURIComponent(journeyId)}/trigger`,
		{ body: { listId, email } },
	);
	return [{ ...body, journeyId, listId, email }];
};

const journeyGetAll: Operation = async function (i) {
	const apiOnly = this.getNodeParameter('apiOnly', i, false) as boolean;
	const { body } = await apiRequest.call(this, 'GET', '/api/v1/journeys', {
		qs: apiOnly ? { trigger: 'api' } : undefined,
	});
	return limitResults(this, i, (body.journeys as IDataObject[]) ?? []);
};

const pipelineGetAll: Operation = async function (i) {
	const { body } = await apiRequest.call(this, 'GET', '/api/v1/pipelines');
	return limitResults(this, i, (body.pipelines as IDataObject[]) ?? []);
};

export const operations: Record<string, Record<string, Operation>> = {
	contact: { upsert: contactUpsert, get: contactGet },
	list: { getAll: listGetAll },
	deal: { create: dealCreate, update: dealUpdate },
	email: { send: emailSend },
	journey: { enroll: journeyEnroll, getAll: journeyGetAll },
	pipeline: { getAll: pipelineGetAll },
};
