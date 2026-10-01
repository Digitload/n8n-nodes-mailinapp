import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// A MailInApp API key (Dashboard → Developers), sent as `Authorization: Bearer
// mia_live_…` on every call. The same key also authenticates the MCP server
// (https://mailinapp.com/api/mcp), which is what the AI-agent example uses.
export class MailInAppApi implements ICredentialType {
	name = 'mailInAppApi';

	displayName = 'MailInApp API';

	icon: Icon = { light: 'file:../icons/mailinapp.svg', dark: 'file:../icons/mailinapp.dark.svg' };

	documentationUrl = 'https://mailinapp.com/dashboard/developers';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Create one in MailInApp under Dashboard → Developers. It starts with <code>mia_live_</code>.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://mailinapp.com',
			description: 'Change only to point at a staging or local MailInApp instance',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey.trim()}}',
			},
		},
	};

	// Cheap, read-only and contact-free.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/api/v1/lists',
			method: 'GET',
		},
	};
}
