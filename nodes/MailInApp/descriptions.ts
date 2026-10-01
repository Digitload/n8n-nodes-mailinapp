import type { INodeProperties } from 'n8n-workflow';

// The MailInApp node's parameters, resource by resource. Operations map to
// /api/v1 routes one to one (see actions.ts).

const show = (resource: string, operation: string[]) => ({
	show: { resource: [resource], operation },
});

const listPicker = (overrides: Partial<INodeProperties> = {}): INodeProperties => ({
	displayName: 'Contacts List Name or ID',
	name: 'listId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getLists' },
	required: true,
	default: '',
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	...overrides,
});

const emailInput = (overrides: Partial<INodeProperties> = {}): INodeProperties => ({
	displayName: 'Email',
	name: 'email',
	type: 'string',
	placeholder: 'name@email.com',
	required: true,
	default: '',
	...overrides,
});

const returnAllAndLimit = (resource: string): INodeProperties[] => [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: show(resource, ['getAll']),
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: [resource], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
	},
];

export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Contact', value: 'contact' },
		{ name: 'Contacts List', value: 'list' },
		{ name: 'Deal', value: 'deal' },
		{ name: 'Email', value: 'email' },
		{ name: 'Journey', value: 'journey' },
		{ name: 'Pipeline', value: 'pipeline' },
	],
	default: 'contact',
};

// ── Contact ────────────────────────────────────────────────────────────────

const contactOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['contact'] } },
	options: [
		{
			name: 'Create or Update',
			value: 'upsert',
			description: 'Create a new record, or update the current one if it already exists (upsert)',
			action: 'Create or update a contact',
		},
		{
			name: 'Get',
			value: 'get',
			description: "Find an address's contact rows, in one list or in all of them",
			action: 'Get a contact',
		},
	],
	default: 'upsert',
};

const contactFields: INodeProperties[] = [
	listPicker({ displayOptions: show('contact', ['upsert']) }),
	emailInput({ displayOptions: show('contact', ['upsert', 'get']) }),
	{
		displayName: 'Contact Fields',
		name: 'contactFields',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Field',
		displayOptions: show('contact', ['upsert']),
		default: {},
		description:
			'A field the list does not have yet is added to it (up to 40 per list). The server verifies the address and never sets consent.',
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'name',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getListFields', loadOptionsDependsOn: ['listId'] },
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	listPicker({
		displayName: 'Contacts List Name or ID',
		required: false,
		displayOptions: show('contact', ['get']),
		description:
			'Leave empty to search every list. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	}),
];

// ── Contacts list ──────────────────────────────────────────────────────────

const listOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['list'] } },
	options: [
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'List your contacts lists with their fields and row counts',
			action: 'Get many contacts lists',
		},
	],
	default: 'getAll',
};

// ── Deal ───────────────────────────────────────────────────────────────────

const dealOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['deal'] } },
	options: [
		{
			name: 'Create',
			value: 'create',
			description: 'Create a deal on one of your contacts',
			action: 'Create a deal',
		},
		{
			name: 'Update',
			value: 'update',
			description:
				'Move a deal to another stage (won and lost included), or change its title or value',
			action: 'Update a deal',
		},
	],
	default: 'create',
};

const dealFields: INodeProperties[] = [
	emailInput({
		displayOptions: show('deal', ['create']),
		description: 'The contact the deal is for. It must already be on one of your contacts lists.',
	}),
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: show('deal', ['create']),
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: show('deal', ['create']),
		default: {},
		options: [
			{
				displayName: 'Contacts List Name or ID',
				name: 'listId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLists' },
				default: '',
				description:
					'Defaults to the most recently updated list that has the address. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'EUR',
				description: 'Three-letter code. Defaults to USD.',
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'A key unique to this deal, e.g. an order ID. A retry with the same key returns the existing deal instead of creating a second one.',
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipelineId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
				description:
					'Defaults to your default pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stageId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStages',
					loadOptionsDependsOn: ['additionalFields.pipelineId'],
				},
				default: '',
				description:
					'Defaults to the pipeline\'s first open stage. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				typeOptions: { numberPrecision: 2 },
				default: 0,
			},
		],
	},
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: show('deal', ['update']),
		default: '',
		description: 'From a Deal Created or Deal Stage Changed trigger, or a Create Deal step',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: show('deal', ['update']),
		default: {},
		options: [
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'EUR',
				description: 'Three-letter code',
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipelineId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
				description:
					'Only narrows the Stage list, and isn\'t sent: a deal stays in its own pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stageId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStages',
					loadOptionsDependsOn: ['updateFields.pipelineId'],
				},
				default: '',
				description:
					'A stage of the deal\'s own pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				typeOptions: { numberPrecision: 2 },
				default: 0,
			},
		],
	},
];

// ── Email ──────────────────────────────────────────────────────────────────

const emailOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['email'] } },
	options: [
		{
			name: 'Send Transactional',
			value: 'send',
			description:
				'Send one email to one recipient: your own subject and body, or one of your studio projects',
			action: 'Send a transactional email',
		},
	],
	default: 'send',
};

const emailFields: INodeProperties[] = [
	emailInput({
		displayName: 'To',
		name: 'to',
		displayOptions: show('email', ['send']),
		description: 'One recipient address',
	}),
	{
		displayName: 'Content',
		name: 'content',
		type: 'options',
		noDataExpression: true,
		displayOptions: show('email', ['send']),
		options: [
			{ name: 'Custom', value: 'custom', description: 'Your own subject and body' },
			{
				name: 'Studio Project',
				value: 'project',
				description: 'A studio project, interactive blocks included',
			},
		],
		default: 'custom',
	},
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['email'], operation: ['send'], content: ['project'] } },
		default: '',
		description: 'Copy it from the studio URL: /studio/&lt;project ID&gt;',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['email'], operation: ['send'], content: ['custom'] } },
		default: '',
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		typeOptions: { rows: 5 },
		displayOptions: { show: { resource: ['email'], operation: ['send'], content: ['custom'] } },
		default: '',
		description: 'Set this, Text, or both. The one left empty is made from the other.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 5 },
		displayOptions: { show: { resource: ['email'], operation: ['send'], content: ['custom'] } },
		default: '',
		description: 'The plain-text version',
	},
	{
		displayName: 'Merge Data',
		name: 'mergeData',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Merge Value',
		displayOptions: { show: { resource: ['email'], operation: ['send'], content: ['project'] } },
		default: {},
		description: "Values for the project's merge tags, e.g. name fills {{name}}",
		options: [
			{
				displayName: 'Value',
				name: 'value',
				values: [
					{ displayName: 'Tag', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: show('email', ['send']),
		default: {},
		options: [
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description:
					'Overrides your default sender. On MailInApp sending it must be an address at your verified domain.',
			},
			{
				displayName: 'From Name',
				name: 'fromName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reply-To',
				name: 'replyTo',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Subject Override',
				name: 'subject',
				type: 'string',
				displayOptions: { show: { '/content': ['project'] } },
				default: '',
				description: "Replaces the project's subject",
			},
		],
	},
];

// ── Journey ────────────────────────────────────────────────────────────────

const journeyOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['journey'] } },
	options: [
		{
			name: 'Enroll Contact',
			value: 'enroll',
			description: 'Enroll an address in a journey whose trigger is "API"',
			action: 'Enroll a contact in a journey',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'List your journeys',
			action: 'Get many journeys',
		},
	],
	default: 'enroll',
};

const journeyFields: INodeProperties[] = [
	{
		displayName: 'Journey Name or ID',
		name: 'journeyId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getApiJourneys' },
		required: true,
		displayOptions: show('journey', ['enroll']),
		default: '',
		description:
			'Only journeys whose trigger is "API" are listed; one marked (off) must be turned on first. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	listPicker({
		displayOptions: show('journey', ['enroll']),
		description:
			'The contact is added to this list first if it is not on it yet. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	}),
	emailInput({ displayOptions: show('journey', ['enroll']) }),
	{
		displayName: 'API-Triggered Only',
		name: 'apiOnly',
		type: 'boolean',
		displayOptions: show('journey', ['getAll']),
		default: false,
		description: 'Whether to return only the journeys Enroll Contact can use',
	},
	...returnAllAndLimit('journey'),
];

// ── Pipeline ───────────────────────────────────────────────────────────────

const pipelineOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['pipeline'] } },
	options: [
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'List your deal pipelines with their stages',
			action: 'Get many pipelines',
		},
	],
	default: 'getAll',
};

export const properties: INodeProperties[] = [
	resourceProperty,
	contactOperations,
	listOperations,
	dealOperations,
	emailOperations,
	journeyOperations,
	pipelineOperations,
	...contactFields,
	...returnAllAndLimit('list'),
	...dealFields,
	...emailFields,
	...journeyFields,
	...returnAllAndLimit('pipeline'),
];
