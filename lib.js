import { fetchRetry } from './helper';

export class TTJClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async inferByUUID(text, uuid) {
        const url = `https://text-to-json.com/api/v1/infer?apiToken=${this.apiKey}&uuid=${uuid}`;

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

    async inferBySchema(text, schema, languageModel) {
        const url = `https://text-to-json.com/api/v1/infer?apiToken=${this.apiKey}`;
        languageModel = languageModel || ('gpt-3.5-turbo');
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

    async parseTTJ(text, schema, languageModel) {
        if (!text) {
            return null;
        }
        if (typeof schema === 'string' && schema.length === 36) {
            if (languageModel) {
                throw new Error('languageModel is not supported for UUID inference');
            }
            return await this.inferByUUID(text, schema);
        }
        else if (typeof schema === 'object') {
            return await this.inferBySchema(text, schema, languageModel);
        }
        else {
            throw new Error('invalid schema');
        }
    }


    async mergeOCRResults(text1, text2) {
        const url = `https://text-to-json.com/api/v1/mergeOCR?apiToken=${this.apiKey}`;

        const response = await fetchRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text1,
                text2
            })
        }).then(r => r.text());
        try {
            const parsedResponse = JSON.parse(response);
            return parsedResponse.answer;
        } catch (err) {
            throw new Error('mergeOCRResults failed: ' + response);
        }
    }


    /**
     * @template T
     * @callback Parsing     
     * @param {T} schema
     * @returns {T extends (string)?{value:any,probability:number}[]: T extends (infer U)[] ? ReturnType<Parsing<U>>[]: T extends {} ? { [K in keyof T]?: ReturnType<Parsing<T[K]>> } : {value:any,probability:number}[]}
     * */


    /**
     * 
     * @template S
     * @param {Buffer|Uint8Array|string} data
     * @param {string} mimetype
     * @param {S} schema
     * @param {{ name: string, maxcount?: number, type: string, skip?:number}[]=} parsingsteps
     * @returns { Promise <{ results: ReturnType<Parsing<S>>, codeData: { data: { type: string, string: string, data: string }, position: { orientation: string, quadrilateral: number[][] } }[] | undefined } >}
     * }
     * */
    async parseDocumentBySchema(data, mimetype, schema, parsingsteps) {
        const url = `https://text-to-json.com/api/v1/inferDocument?apiToken=${this.apiKey}`;

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
                returnprobabilities: true
            })
        }).then(r => r.json());
        const taskId = parsingRequestResponse.id;

        let response;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                await new Promise(r => setTimeout(r, 1000));
                response = await fetch(`https://text-to-json.com/api/v1/document?id=${taskId}&apiToken=${this.apiKey}`).then(r => r.json());
            } catch (e) {
                console.error(e);
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

}


