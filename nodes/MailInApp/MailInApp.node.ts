import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { apiRequest, CREDENTIAL } from '../shared/transport';
import { operations } from './actions';
import { properties } from './descriptions';

// The MailInApp action node (LEAD_FLYWHEEL_PLAN.md 10.4): the same actions as
// the Zapier app (integrations/zapier, 10.3) over the public API, plus the
// read operations an AI agent needs to pick ids (lists, journeys, pipelines).
// Programmatic rather than declarative because the send operation derives the
// missing body, turns an HTTP 200 "failed" into an error, and a deal update
// must refuse an empty patch before calling.

interface Pipeline {
	id: string;
	name: string;
	isDefault?: boolean;
	stages: { id: string; name: string }[];
}

export class MailInApp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MailInApp',
		name: 'mailInApp',
		icon: { light: 'file:../../icons/mailinapp.svg', dark: 'file:../../icons/mailinapp.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage MailInApp contacts, deals and journeys, and send transactional email',
		defaults: { name: 'MailInApp' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: CREDENTIAL, required: true }],
		properties,
	};

	methods = {
		loadOptions: {
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { body } = await apiRequest.call(this, 'GET', '/api/v1/lists');
				return ((body.lists as IDataObject[]) ?? []).map((list) => ({
					name: `${list.name} (${list.rowCount})`,
					value: list.id as string,
				}));
			},

			async getListFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const listId = this.getCurrentNodeParameter('listId') as string | undefined;
				if (!listId) return [];
				const { body } = await apiRequest.call(this, 'GET', '/api/v1/lists');
				const list = ((body.lists as IDataObject[]) ?? []).find((entry) => entry.id === listId);
				return ((list?.fields as string[]) ?? []).map((field) => ({ name: field, value: field }));
			},

			// Only journeys whose trigger is "API" can be enrolled into. A disabled
			// one is listed, marked, since enrolling into it fails.
			async getApiJourneys(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { body } = await apiRequest.call(this, 'GET', '/api/v1/journeys', {
					qs: { trigger: 'api' },
				});
				return ((body.journeys as IDataObject[]) ?? []).map((journey) => ({
					name: journey.enabled ? (journey.name as string) : `${journey.name} (off)`,
					value: journey.id as string,
				}));
			},

			async getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { body } = await apiRequest.call(this, 'GET', '/api/v1/pipelines');
				return ((body.pipelines as Pipeline[]) ?? []).map((pipeline) => ({
					name: pipeline.name,
					value: pipeline.id,
				}));
			},

			// The chosen pipeline's stages, otherwise every pipeline's, labelled
			// "Pipeline › Stage".
			async getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const collection = (this.getCurrentNodeParameter('additionalFields') ??
					this.getCurrentNodeParameter('updateFields') ??
					{}) as IDataObject;
				const pipelineId = collection.pipelineId as string | undefined;
				const { body } = await apiRequest.call(this, 'GET', '/api/v1/pipelines');
				return ((body.pipelines as Pipeline[]) ?? [])
					.filter((pipeline) => !pipelineId || pipeline.id === pipelineId)
					.flatMap((pipeline) =>
						pipeline.stages.map((stage) => ({
							name: pipelineId ? stage.name : `${pipeline.name} › ${stage.name}`,
							value: stage.id,
						})),
					);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const run = operations[resource]?.[operation];
				if (!run) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" for resource "${resource}"`,
						{ itemIndex: i },
					);
				}
				const results = await run.call(this, i);
				returnData.push(...results.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				const nodeError =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				nodeError.context.itemIndex = i;
				throw nodeError;
			}
		}

		return [returnData];
	}
}
