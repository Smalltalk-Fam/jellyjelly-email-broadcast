import { describe, it, expect } from 'vitest';
import { batchArray, buildEmailHtml } from './sender';

describe('batchArray', () => {
	it('splits array into chunks of given size', () => {
		const items = [1, 2, 3, 4, 5];
		expect(batchArray(items, 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	it('returns single batch when array is smaller than batch size', () => {
		expect(batchArray([1, 2], 5)).toEqual([[1, 2]]);
	});

	it('returns empty array for empty input', () => {
		expect(batchArray([], 5)).toEqual([]);
	});
});

describe('buildEmailHtml', () => {
	it('injects body into template', () => {
		const template = '<html>{{body}}</html>';
		const body = '<p>Hello</p>';
		const result = buildEmailHtml(template, body, 'https://example.com/unsub');
		expect(result).toContain('<p>Hello</p>');
	});

	it('injects unsubscribe URL', () => {
		const template = '<html>{{body}}<a href="{{unsubscribe_url}}">Unsub</a></html>';
		const result = buildEmailHtml(template, '<p>Hi</p>', 'https://example.com/unsub?token=abc');
		expect(result).toContain('href="https://example.com/unsub?token=abc"');
	});
});
