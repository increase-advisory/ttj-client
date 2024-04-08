import { expect, test } from '@jest/globals';
import { TTJClient } from '../lib';

const TTJ_API_TOKEN = process.env.TTJ_API_TOKEN;
const DEMO_UUID = process.env.DEMO_UUID;

test('an invalid API key throws an error', async () => {
    const ttjClient = new TTJClient('invalid-api-token');
    await expect(ttjClient.inferByUUID('test', 'test')).rejects.toThrow('invalid API Token!');
}, 120000);

test('an invalid uuid throws an error', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    await expect(ttjClient.inferByUUID('test', 'invalid-uuid')).rejects.toThrow('Missing body parameter schema');
}, 120000);

test('a valid uuid and api token return a response', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    const response = await ttjClient.inferByUUID('company name: acme corp\na street 123\n1234 Town', DEMO_UUID);
    expect(response.company_name).toBe('acme corp');
}, 120000);