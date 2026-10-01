import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// The one way both nodes call MailInApp's public API (/api/v1, documented in
// mailinapp_next_js/public/openapi.json). Errors come back as
// `{"error": "…"}`; that message becomes the node error's, with the status.

export const CREDENTIAL = 'mailInAppApi';

type ApiContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

export interface ApiResponse {
	statusCode: number;
	body: IDataObject;
}

export async function apiRequest(
	this: ApiContext,
	method: IHttpRequestMethods,
	path: string,
	options: {
		body?: IDataObject;
		qs?: IDataObject;
		headers?: IDataObject;
		allowStatus?: number[];
	} = {},
): Promise<ApiResponse> {
	const credentials = await this.getCredentials(CREDENTIAL);
	const baseUrl = String(credentials.baseUrl || 'https://mailinapp.com').replace(/\/+$/, '');
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIAL, {
		method,
		url: `${baseUrl}${path}`,
		body: options.body,
		qs: options.qs,
		headers: options.headers,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as { statusCode: number; body: unknown };

	const body = (
		response.body && typeof response.body === 'object' ? response.body : {}
	) as IDataObject;
	if (response.statusCode >= 400 && !options.allowStatus?.includes(response.statusCode)) {
		const message = typeof body.error === 'string' ? body.error : '';
		throw new NodeApiError(this.getNode(), body as JsonObject, {
			httpCode: String(response.statusCode),
			message: message ? `MailInApp: ${message}` : `MailInApp answered ${response.statusCode}`,
		});
	}
	return { statusCode: response.statusCode, body };
}

// Drops unset optional inputs, so an empty field isn't sent as "".
export const compact = (object: IDataObject): IDataObject =>
	Object.fromEntries(
		Object.entries(object).filter(
			([, value]) => value !== undefined && value !== null && value !== '',
		),
	);
