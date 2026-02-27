import { describe, it, expect } from 'vitest';
import { createUnsubscribeToken, verifyUnsubscribeToken } from './tokens';

describe('Unsubscribe Tokens', () => {
  const secret = 'a'.repeat(64); // 32-byte hex string

  it('creates a token that can be verified', () => {
    const token = createUnsubscribeToken('user@example.com', 'campaign-123', secret);
    const result = verifyUnsubscribeToken(token, secret);
    expect(result).toEqual({ email: 'user@example.com', campaignId: 'campaign-123' });
  });

  it('returns null for a tampered token', () => {
    const token = createUnsubscribeToken('user@example.com', 'campaign-123', secret);
    const tampered = token.slice(0, -4) + 'xxxx';
    const result = verifyUnsubscribeToken(tampered, secret);
    expect(result).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(verifyUnsubscribeToken('not-a-real-token', secret)).toBeNull();
    expect(verifyUnsubscribeToken('', secret)).toBeNull();
  });

  it('handles emails with special characters', () => {
    const token = createUnsubscribeToken('user+tag@example.com', 'c-1', secret);
    const result = verifyUnsubscribeToken(token, secret);
    expect(result).toEqual({ email: 'user+tag@example.com', campaignId: 'c-1' });
  });
});
