# ttj-client SDK for Node.js

The ttj-client SDK for Node.js lets you use the [text-to-json.com](https://text-to-json.com) API to LLM powered data extraction features for your applications.

For API docs see [https://text-to-json.com/docs](https://text-to-json.com/docs).

## Before you begin

1. [Create an Account](https://text-to-json.com/create-account)
2. [Setup payment](https://text-to-json.com/account/billing)

## Install the SDK

```shell
npm install ttj-client
```

## Initiate the `TTJClient` class

To use the ttj-client SDK for Node.js, create an instance of `TTJClient` by passing it your API Key.
You can generate an API Key on the [Usage](https://text-to-json.com/account/usage) page by clicking `Create new API Key`.

```javascript
async function infer(){
    const { TTJClient } = await import('ttj-client');
    const ttjClient = new TTJClient(TTJ_API_TOKEN);
    //...
}
```

## Querying the Document API

You can extract the data defined in your [schema](https://text-to-json.com/en/docs#defining-a-schema) from any pdf, png, or jpeg file. Just pass the file as a `Buffer` or `string` as the first parameter and the `mimetype` as the second parameter. Define your `schema` as the third parameter. 

```javascript
async function infer(){
    //...
    const response = await ttjClient.inferDocumentBySchema(
        await fs.promises.readFile('tests/testfiles/invoice.jpg'),
         'image/jpeg', 
         {
            issuer_legal_name: '<string: the legal name of the company that issued the invoice>',
            issuer_street: '<string: the street and number of the issuer address>',
            issuer_zip: '<string: the zip code of the issuer address without the town>',
            issuer_town: '<string: the town of the issuer address without zip code>',
            issuer_tax_number: '<string: the tax number ("UID Nummer") of the issuer>',
            invoice_number: '<string: invoice number>',
            invoice_date: '<date: the date (without time) the invoice was issued>',
            total_gross_sum: '<float: the total gross sum of the invoice including VAT, null iff unsure>',
            total_net_sum: '<float: the total net sum of the invoice excluding VAT, null iff unsure>',
        }, 
        [{
            type: 'raw',
            name: 'openai/gpt-3.5-turbo',
            maxcount: 3
        },
        {
            type: 'padded',
            name: 'openai/gpt-3.5-turbo',
            maxcount: 3
        }], false);
}
console.log(JSON.stringify(response.results));
/* logs
{
    issuer_legal_name: 'some-company',
    issuer_street: 'a street',
    issuer_zip: '1234',
    issuer_town: 'a town'
    ...
}
*/
```

### returnprobabilities

Set `returnprobabilities` (the fourth parameter) to true to get options and their probability for every value.

```javascript
async function infer(){
    //...
    const response = await ttjClient.inferDocumentBySchema(
        await fs.promises.readFile('tests/testfiles/invoice.jpg'),
         'image/jpeg', 
         {
            issuer_legal_name: '<string: the legal name of the company that issued the invoice>',
            issuer_street: '<string: the street and number of the issuer address>',
            issuer_zip: '<string: the zip code of the issuer address without the town>',
            issuer_town: '<string: the town of the issuer address without zip code>',
            issuer_tax_number: '<string: the tax number ("UID Nummer") of the issuer>',
            invoice_number: '<string: invoice number>',
            invoice_date: '<date: the date (without time) the invoice was issued>',
            total_gross_sum: '<float: the total gross sum of the invoice including VAT, null iff unsure>',
            total_net_sum: '<float: the total net sum of the invoice excluding VAT, null iff unsure>',
        }, 
        [{
            type: 'raw',
            name: 'openai/gpt-3.5-turbo',
            maxcount: 3
        },
        {
            type: 'padded',
            name: 'openai/gpt-3.5-turbo',
            maxcount: 3
        }], true);// set returnproabilities to true
}
console.log(JSON.stringify(response.results));
/* logs
{
    issuer_legal_name: [{
        value: 'some-company',
        probability: 1
    }],
    issuer_street: [
        {
            value: 'a street',
            probability: 0.66
        },
        {
            value: 'different-value',
            probability: 0.33
        }
    ],
    issuer_zip: [{
        value: '1234',
        probability: 1
    }],
    issuer_town: [{
        value: 'a town',
        probability: 1
    }],
    ...
}
*/
```


## Querying the Text API

You can extract the data defined in your [schema](https://text-to-json.com/en/docs#defining-a-schema) from any text. Just pass the text as the first parameter and define your `schema` as the second parameter. 

```javascript
async function infer(){
    //...
    const response = await ttjClient.inferBySchema(
        'company name: Acme Corp\na street 123\n1234 Town', 
        {
            customer: {
                company_name: 'string',
                address: {
                    street: 'string',
                    zip_code: 'number',
                    city: 'string'
                }
            }
        }, 
        'openai/gpt-3.5-turbo');
    console.log(JSON.stringify(response));
}
/* logs
{
    customer: {
        company_name: 'Acme Corp',
        address: {
            street: 'a street 123',
            zip_code: 1234,
            city: 'Town'
        }
    }
}
*/
```

### using a model defined on the website

You can also use a model defined on the website using `inferByUUID`.

```javascript
async function infer(){
    //...
    const response = await ttjClient.inferByUUID('company name: acme corp\na street 123\n1234 Town', YOUR_UUID);
    console.log(JSON.stringify(response));
}

infer();
/* logs
{
    customer: {
        company_name: 'Acme Corp',
        address: {
            street: 'a street 123',
            zip_code: 1234,
            city: 'Town'
        }
    }
}
*/
```