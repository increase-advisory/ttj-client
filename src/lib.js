import { Agent, fetch } from 'undici';
import { fetchRetry } from './helper.js';
import { TTJUtils } from './utils.js';
const utils = new TTJUtils();

/**
 * @typedef {{
 * value:any,
 * probability:number
 * }} ProbabilityResult
*/

export class TTJClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * 
     * @template T
     * @param {string} text the text to extract the data from
     * @param {string} uuid the uuid of the schema to use
     * @returns {Promise<T>}
     */
    async inferByUUID(text, uuid) {
        const url = `https://text-to-json.com/api/v1/infer?apiToken=${this.apiKey}&uuid=${uuid}`;
        /** @type {any} */
        const response = await fetchRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text
            })
        }).then(r => r.json());
        return response;
    }

    /**
     * @typedef {'openai/gpt-3.5-turbo'|'openai/gpt-4'|'ollama/mixtral'|'ollama/llama2'|'ollama/llama2:13b'|'ollama/gemma'} SupportedStreamingLanguageModel
     * @typedef {SupportedStreamingLanguageModel|'azure/gpt-35-turbo'|'vertex/text-bison@001'} SupportedLanguageModel
     * @typedef {SupportedLanguageModel | 'vertex/gemini-1.0-pro-vision-001'} SupportedVisionModel
     */

    /**
     * @template T
     * @param {string} text the text to extract the data from
     * @param {T} schema the schema for the data (see https://text-to-json.com/en/docs/#defining-a-schema for more information on schemas)
     * @param {SupportedLanguageModel} languageModel 
     * @returns {Promise<ReturnType<TTJParsingFunction<T>>>}
     */
    async inferBySchema(text, schema, languageModel) {
        const url = `https://text-to-json.com/api/v1/infer?apiToken=${this.apiKey}`;
        languageModel = languageModel || ('openai/gpt-3.5-turbo');
        /** @type {any} */
        const response = await fetchRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                schema: schema,
                languageModel
            })
        }).then(r => r.json());
        return response;
    }

    /**
     * @typedef {{
     *  type:'raw'|'padded',
     *  name: SupportedLanguageModel,
     *  maxcount?:number
     * }} TextParsingStep
     */

    /**
     * @typedef {{
     * type:'image',
     * name: SupportedVisionModel,
     * maxcount?:number
     * }} ImageParsingStep
     */

    /**
     * @template T
     * @callback ReturnProbabilitiesFunction
     * @param {T} schema
     * @returns {T extends (string)?ProbabilityResult[]: T extends (infer U)[] ? ReturnType<ReturnProbabilitiesFunction<U>>[]: T extends {} ? { [K in keyof T]?: ReturnType<ReturnProbabilitiesFunction<T[K]>> } : ProbabilityResult[]}
     * */

    /**
     * @template T
     * @callback TTJParsingFunction
     * @param {T} schema
     * @returns {{[K in keyof T]?:T[K]extends {}?ReturnType<TTJParsingFunction<T[K]>>:T[K]}}
     * */


    /**
     * 
     * @template S
     * @template {boolean} R
     * @param {Buffer|Uint8Array|string} data a pdf, png, or jpeg file as a buffer, uint8array or dataurl
     * @param {'application/pdf'|'image/png'|'image/jpeg'} mimetype the mimetype of the data (e.g. 'application/pdf', 'image/png', 'image/jpeg')
     * @param {S} schema
     * @param {(TextParsingStep|ImageParsingStep)[]=} parsingsteps
     * @param {R=} returnprobabilities
     * @returns { Promise <{ results: R extends true ? ReturnType<ReturnProbabilitiesFunction<S>> : ReturnType<TTJParsingFunction<S>>, codeData: { data: { type: string, string: string, data: string }, position: { orientation: string, quadrilateral: number[][] } }[] | undefined } >}
     * }
     * */
    async inferDocumentBySchema(data, mimetype, schema, parsingsteps, returnprobabilities) {
        const url = `https://text-to-json.com/api/v1/inferDocument?apiToken=${this.apiKey}`;

        //if data is a uint8array, convert it to a buffer
        if (data instanceof Uint8Array) {
            data = Buffer.from(data);
        }

        //if data is a buffer, encode it as dataurl
        if (data instanceof Buffer) {
            data = `data:${mimetype};base64,${data.toString('base64')}`;
        }
        /** @type {any} */
        const parsingRequestResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schema,
                data,
                mimetype,
                parsingsteps,
                returnprobabilities
            })
        }).then(r => r.json());
        if (!parsingRequestResponse.id) {
            if (parsingRequestResponse.error) {
                if (typeof parsingRequestResponse.error === 'string' && /^\d+:\d+/.test(parsingRequestResponse.error)) {
                    throw new Error(parsingRequestResponse.error.match(/^(\d+:\d+:?\s*)(.*)/)[2]);
                }
                throw new Error(parsingRequestResponse.error);
            }
            throw new Error('TTJ parsing failed: ' + JSON.stringify(parsingRequestResponse));
        }
        const taskId = parsingRequestResponse.id;

        /** @type {any} */
        let response;

        let failed = 0;
        while (true) {
            try {
                await new Promise(r => setTimeout(r, 1000));
                response = await fetch(`https://text-to-json.com/api/v1/document?id=${taskId}&apiToken=${this.apiKey}`).then(r => r.json());
            } catch (e) {
                console.error(e);
                failed++;
                if (failed > 10) {
                    throw e;
                }
            }
            if (response.status === 'finished') {
                console.log(`got TTJ response for ${taskId} after ${new Date(response.finished).getTime() - new Date(response.started).getTime()}ms`);
                return { results: response.result, codeData: response.codeData };
            }
            if (response.status === 'failed') {
                throw new Error(response.error);
            }
        }
    }

    /**
     * @template T
     * @param {string} text the text to extract the data from
     * @param {T} schema the schema for the data (see https://text-to-json.com/en/docs/#defining-a-schema for more information on schemas)
     * @param {SupportedStreamingLanguageModel} languageModel 
     * @returns {AsyncGenerator<ReturnType<TTJParsingFunction<T>>, void, ReturnType<TTJParsingFunction<T>>>}
     */
    async *inferStreamingBySchema(text, schema, languageModel) {
        const url = `https://text-to-json.com/api/v1/inferStreaming?apiToken=${this.apiKey}`;
        languageModel = languageModel || ('openai/gpt-3.5-turbo');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                schema: schema,
                languageModel
            }),
            dispatcher: new Agent({
                bodyTimeout: 20 * 60 * 1000,
            })
        });
        if (!response.ok) {
            const resText = await response.text();
            let parsedRes;
            try {
                parsedRes = JSON.parse(resText);
            } catch (e) {
            }
            if (parsedRes && parsedRes.error) {
                throw new Error(parsedRes.error);
            } else {
                throw new Error(resText);
            }
        }

        yield* utils.streamFetchJson(response);
    }

}

export { TTJUtils };
