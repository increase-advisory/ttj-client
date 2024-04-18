import { expect, test } from '@jest/globals';
import { TTJClient } from '../src/lib';

const TTJ_API_TOKEN = process.env.TTJ_API_TOKEN;
const DEMO_UUID = process.env.DEMO_UUID;

test('an invalid API key throws an error', async () => {
    expect.assertions(3);
    const ttjClient = new TTJClient('invalid-api-token');
    await expect(ttjClient.inferByUUID('test', 'test')).rejects.toThrow('invalid API Token!');
    await expect(ttjClient.inferBySchema('test', {}, 'ollama/mixtral')).rejects.toThrow('invalid API Token!');
    await expect(ttjClient.inferDocumentBySchema('test', 'image/jpeg', {}, [], false)).rejects.toThrow('invalid API Token!');
}, 120000);

test('an invalid uuid throws an error', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    await expect(ttjClient.inferByUUID('test', 'invalid-uuid')).rejects.toThrow('Missing body parameter schema');
}, 120000);

test('a valid uuid and api token return a response', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    const response = await ttjClient.inferByUUID('company name: acme corp\na street 123\n1234 Town', DEMO_UUID);
    expect(response.customer.company_name).toBe('acme corp');
}, 120000);

test('a valid schema and api token return a response', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    const response = await ttjClient.inferBySchema('company name: Acme Corp\na street 123\n1234 Town', {
        customer: {
            company_name: 'string',
            address: {
                street: 'string',
                zip_code: 'number',
                city: 'string'
            }
        }
    }, 'ollama/mixtral');
    expect(response.customer.company_name).toBe('Acme Corp');
}, 120000);

test('an invalid schema throws an error', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    await expect(ttjClient.inferBySchema('company name: Acme Corp\na street 123\n1234 Town', null, 'ollama/mixtral')).rejects.toThrow('Missing body parameter schema');
}, 120000);

import fs from 'fs';

test('an image can be inferred', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    const response = await ttjClient.inferDocumentBySchema(await fs.promises.readFile('tests/testfiles/invoice.jpg'), 'image/jpeg', {
        issuer_legal_name: '<string: the legal name of the company that issued the invoice ("Rechnungssteller", "Verkauft von")>',
        issuer_street: '<string: the street and number of the issuer address>',
        issuer_zip: '<string: the zip code of the issuer address without the town>',
        issuer_town: '<string: the town of the issuer address without zip code>',
        issuer_tax_number: '<string: the tax number ("UID Nummer") of the issuer>',
        invoice_number: '<string: invoice number ("Belegnummer", "Re-Nr.", or "Rechnungsnummer")>',
        invoice_date: '<date: the date (without time) the invoice was issued>',
        total_gross_sum: '<float: the total gross ("Brutto") sum of the invoice including VAT, null iff unsure>',
        total_net_sum: '<float: the total net ("Netto") sum of the invoice excluding VAT, null iff unsure>',
    }, [{
        type: 'raw',
        name: 'ollama/mixtral',
        maxcount: 2
    }], false);
    expect(response.results.issuer_tax_number).toBe('ATU41171708');
}, 120000);

test('an invalid schema for inferDocumentBySchema throws an error', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    await expect(ttjClient.inferDocumentBySchema(await fs.promises.readFile('tests/testfiles/invoice.jpg'), 'image/jpeg', null, [], false)).rejects.toThrow('Missing parameter schema');
}, 120000);

test('an invalid mime type for inferDocumentBySchema throws an error', async () => {
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    await expect(ttjClient.inferDocumentBySchema(`data:image/jpeg;base64,${await fs.promises.readFile('tests/testfiles/invoice.jpg', { encoding: 'base64' })}`, 'application/pdf', { a: '<string: value>' }, [{ type: 'raw', name: 'ollama/mixtral', maxcount: 1 }], false)).rejects.toThrow('Invalid mimetype parameter');
}, 120000);

async function collect(iterator) {
    const items = [];
    for await (const item of iterator) {
        items.push(item);
    }
    return items;

}

test('inferStreamingBySchema returns a list of valid objects', async () => {
    expect.assertions(3);
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    const response = await collect(ttjClient.inferStreamingBySchema(`Unternehmensbezeichnung
increase advisory GmbH
UID-Nummer
ATU74981479
Unternehmenssitz
Tummelplatz 19, A-4020 Linz`, {
        customer: {
            company_name: '<string: The name of the company>',
            vat_id: '<string: The VAT (Value Added Tax) identification number of the company>',
            address: {
                street: '<string: The street address of the company>',
                town: '<string: The town or city where the company is located>',
                zip_code: '<string: The postal code of the company\'s location>'
            }
        }
    }, 'ollama/mixtral'));
    expect(response.length).toBeGreaterThan(1);
    expect(response[response.length - 1].customer.company_name).toBe('increase advisory GmbH');
    expect(response[response.length - 1].customer.vat_id).toBe('ATU74981479');

}, 120000);