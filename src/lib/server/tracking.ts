import crypto from 'crypto';

export function verifyMailgunSignature(
	signingKey: string,
	timestamp: string,
	token: string,
	signature: string
): boolean {
	const encodedToken = crypto
		.createHmac('sha256', signingKey)
		.update(timestamp + token)
		.digest('hex');
	try {
		return crypto.timingSafeEqual(Buffer.from(encodedToken), Buffer.from(signature));
	} catch {
		return false;
	}
}
