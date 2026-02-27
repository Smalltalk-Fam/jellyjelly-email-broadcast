import { createHmac, timingSafeEqual } from 'crypto';

interface TokenPayload {
  email: string;
  campaignId: string;
}

export function createUnsubscribeToken(email: string, campaignId: string, secret: string): string {
  const payload = JSON.stringify({ email, campaignId });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyUnsubscribeToken(token: string, secret: string): TokenPayload | null {
  try {
    const dotIndex = token.indexOf('.');
    if (dotIndex === -1) return null;

    const payloadB64 = token.slice(0, dotIndex);
    const signature = token.slice(dotIndex + 1);

    const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url');

    const sigBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSig, 'base64url');

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (typeof payload.email !== 'string' || typeof payload.campaignId !== 'string') return null;

    return { email: payload.email, campaignId: payload.campaignId };
  } catch {
    return null;
  }
}
