import { createHmac, timingSafeEqual } from 'crypto';

// X-MailInApp-Signature is "v1=" + hex HMAC-SHA256(secret, "<timestamp>.<raw body>"),
// where <timestamp> is the X-MailInApp-Timestamp header in epoch ms
// (mailinapp_next_js/src/lib/webhooks/delivery.ts). Every delivery, retries
// included, is signed at send time, so a stale timestamp means a replay.
export const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

const headerValue = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value;

export function verifySignature(
	secret: string,
	headers: Record<string, string | string[] | undefined>,
	rawBody: string,
	now: number,
): boolean {
	const timestamp = headerValue(headers['x-mailinapp-timestamp']);
	const signature = headerValue(headers['x-mailinapp-signature']);
	if (!timestamp || !signature || !signature.startsWith('v1=')) return false;
	const sentAt = Number(timestamp);
	if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > SIGNATURE_TOLERANCE_MS) return false;
	const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
	const given = signature.slice(3);
	return (
		given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
	);
}
