// POST /api/v1/send's freeform mode wants both bodies, and a workflow usually
// has one. Text → HTML escapes and keeps line breaks. HTML → text drops tags,
// keeping block boundaries as line breaks: a plain-text fallback, not a
// rendering. Same conversion as the Zapier app (integrations/zapier/lib/text.js).

const escapeHtml = (value: string): string =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const textToHtml = (text: string): string =>
	`<p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p>`;

export const htmlToText = (html: string): string =>
	html
		.replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
