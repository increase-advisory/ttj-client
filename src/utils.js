export class TTJUtils {

    // /**
    //  * @template T
    //  * @callback FlattenParsingStepsFunction
    //  * @param {T} result
    //  * @returns {T extends {value: any, probability: number}[] ? any[]: T extends {} ? { [K in keyof T]: ReturnType<FlattenParsingStepsFunction<T[K]>> } : T extends (infer U)[] ? ReturnType<FlattenParsingStepsFunction<U>>[] : T}
    //  * */

    // //TODO we can make this fancy by creating objects according to their probability, first compute probability breakpoints (a set of all probability values), the create an object for each probability interval for example probability 1 would be included in every object, probability 0.9 in the 1.0-0.1 object,...
    // /**
    //  * strips the probability values from the results and returns them as an array of values
    //  * @template T
    //  * @param {T} result
    //  * @param {number=} cutoff
    //  * @returns {ReturnType<FlattenParsingStepsFunction<T>>}
    //  * }}
    //  */
    // flattenParsingStepsResults(result, cutoff) {
    //     if (Array.isArray(result)) {
    //         let arrayResult = result;
    //         if (result[0] && result[0].value && typeof result[0].probability === 'number') {
    //             // @ts-ignore
    //             arrayResult = result.sort((a, b) => b.probability - a.probability).filter(i => !isNaN(cutoff) ? i.probability >= cutoff : true).map(i => i.value);
    //         }
    //         // @ts-ignore
    //         return arrayResult.map(i => this.flattenParsingStepsResults(i, cutoff)).filter(i => !!i);
    //     }
    //     if (typeof result !== 'object' || result instanceof Date) {
    //         // @ts-ignore
    //         return result;
    //     }
    //     /** @type {any} */
    //     let flattenedResults = {};
    //     for (const prop in result) {
    //         flattenedResults[prop] = this.flattenParsingStepsResults(result[prop], cutoff);
    //     }
    //     return flattenedResults;
    // }

    /**
     * @typedef {import('./lib').ProbabilityResult} ProbabilityResult
     */

    /**
     * @callback ValidatorFunction
     * @param {any} value
     * @returns {boolean}
     */

    /**
     * returns the most probable value that passes the validator function or null if no value passes
     * @param {ProbabilityResult[]} result 
     * @param {ValidatorFunction} validatorFn 
     * @returns {any}
     */
    getMostProbableValidValue(result, validatorFn) {
        result = result.sort((a, b) => b.probability - a.probability);
        for (const res of result) {
            if (validatorFn(res.value)) {
                return res.value;
            }
        }
        return null;
    }

    async *streamFetchJson(response) {
        let jsonLevel = 0;
        let isString = false;
        let isEscaped = false;
        let jsonString = '';

        const reader = await response.body.pipeThrough(new TextDecoderStream()).getReader();

        while (true) {
            const chunk = await reader.read();
            if (chunk.done) {
                return;
            }

            for (let i = 0; i < chunk.value.length; i++) {
                const char = chunk.value[i];
                if ((char === '{' || char === '[') && !isString && !isEscaped) {
                    jsonLevel++;
                } else if ((char === '}' || char === ']') && !isString && !isEscaped) {
                    jsonLevel--;
                }
                else if (char === '"' && !isEscaped) {
                    isString = !isString;
                }

                if ((char === '\\' && isEscaped) || (char !== '\\')) {
                    isEscaped = false;
                }
                else if (char === '\\') {
                    isEscaped = true;
                }

                jsonString += char;
                if (jsonLevel === 0 && !isString && jsonString.trim() !== '') {
                    try {
                        yield JSON.parse(jsonString);
                        jsonString = '';
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        }
    }

    /**
     * sets the values of the object according to the property mapping, if the value is already set it will not be overwritten
     * @param {any} object 
     * @param {any} ttjResponse 
     * @param {{objPath:string,ttjPath:string}[]} propertyMapping 
     */
    setObject(object, ttjResponse, propertyMapping) {
        for (const mapping of propertyMapping) {
            const ttjPath = mapping.ttjPath.split('.');
            const objPath = mapping.objPath.split('.');
            let obj = object;
            let ttj = ttjResponse;
            for (let i = 0; i < ttjPath.length; i++) {
                if (ttj === undefined || ttj === null) {
                    break;
                }
                ttj = ttj[ttjPath[i]];
            }
            if (ttj === undefined || ttj === null) {
                continue;
            }
            for (let i = 0; i < objPath.length - 1; i++) {
                if (!obj[objPath[i]]) {
                    obj[objPath[i]] = {};
                }
                obj = obj[objPath[i]];
            }
            if (obj[objPath[objPath.length - 1]] === undefined || obj[objPath[objPath.length - 1]] === null || obj[objPath[objPath.length - 1]] === '') {
                obj[objPath[objPath.length - 1]] = ttj;
            }
        }
    }

}