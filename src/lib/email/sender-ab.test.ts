import { describe, it, expect } from 'vitest';
import { splitRecipients } from './sender';

describe('splitRecipients', () => {
	it('splits 50/50', () => {
		const recipients = Array.from({ length: 100 }, (_, i) => ({
			email: `user${i}@test.com`,
			userId: `u${i}`
		}));
		const { groupA, groupB } = splitRecipients(recipients, 50);
		expect(groupA.length).toBe(50);
		expect(groupB.length).toBe(50);
		const allEmails = [...groupA, ...groupB].map((r) => r.email);
		expect(new Set(allEmails).size).toBe(100);
	});

	it('splits 70/30', () => {
		const recipients = Array.from({ length: 100 }, (_, i) => ({
			email: `user${i}@test.com`,
			userId: `u${i}`
		}));
		const { groupA, groupB } = splitRecipients(recipients, 70);
		expect(groupA.length).toBe(70);
		expect(groupB.length).toBe(30);
	});

	it('handles empty list', () => {
		const { groupA, groupB } = splitRecipients([], 50);
		expect(groupA).toHaveLength(0);
		expect(groupB).toHaveLength(0);
	});

	it('handles single recipient', () => {
		const recipients = [{ email: 'solo@test.com', userId: 'u1' }];
		const { groupA, groupB } = splitRecipients(recipients, 50);
		expect(groupA.length + groupB.length).toBe(1);
	});
});
