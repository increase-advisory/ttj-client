import { expect, test } from '@jest/globals';
import { TTJUtils } from '../src/utils';

// test('flattenParsingStepsResults flattens an array of objects', () => {
//     const ttjUtils = new TTJUtils();
//     const result = [{
//         value: 'a',
//         probability: 0.5
//     }, {
//         value: 'b',
//         probability: 0.3
//     }, {
//         value: 'c',
//         probability: 0.2
//     }];
//     const flattenedResult = ttjUtils.flattenParsingStepsResults(result);
//     expect(flattenedResult).toStrictEqual(['a', 'b', 'c']);
// });

// test('flattenParsingStepsResults flattens an array of objects with cutoff', () => {
//     const ttjUtils = new TTJUtils();
//     const result = [{
//         value: 'a',
//         probability: 0.5
//     }, {
//         value: 'b',
//         probability: 0.3
//     }, {
//         value: 'c',
//         probability: 0.2
//     }];
//     const flattenedResult = ttjUtils.flattenParsingStepsResults(result, 0.3);
//     expect(flattenedResult).toStrictEqual(['a', 'b']);
// });

// test('flattenParsingStepsResults does not touch objects with a value and probability if they\'re not an array', () => {
//     const ttjUtils = new TTJUtils();
//     const result = {
//         a: [{
//             value: 'a',
//             probability: 0.5
//         }, {
//             value: 'b',
//             probability: 0.3
//         }, {
//             value: 'c',
//             probability: 0.2
//         }],
//         b: {
//             value: 'd',
//             probability: 0.4
//         }
//     };
//     const flattenedResult = ttjUtils.flattenParsingStepsResults(result);
//     expect(flattenedResult).toStrictEqual({
//         a: ['a', 'b', 'c'],
//         b: {
//             value: 'd',
//             probability: 0.4
//         }
//     });
// });

// test('flattenParsingStepsResults orders the array by probability', () => {
//     const ttjUtils = new TTJUtils();
//     const result = [{
//         value: 'a',
//         probability: 0.3
//     }, {
//         value: 'b',
//         probability: 0.5
//     }, {
//         value: 'c',
//         probability: 0.2
//     }];
//     const flattenedResult = ttjUtils.flattenParsingStepsResults(result);
//     expect(flattenedResult).toStrictEqual(['b', 'a', 'c']);
// });

// test('flattenParsingStepsResults can deal with multiple nested arrays', () => {
//     const ttjUtils = new TTJUtils();
//     const result = [{
//         a: [{
//             value: 'a',
//             probability: 0.5
//         }, {
//             value: 'b',
//             probability: 0.3
//         }, {
//             value: 'c',
//             probability: 0.2
//         }]
//     },
//     {
//         b: [{
//             value: 'd',
//             probability: 0.4
//         }, {
//             value: 'e',
//             probability: 0.6
//         }]
//     }];
//     const flattenedResult = ttjUtils.flattenParsingStepsResults(result);
//     expect(flattenedResult).toStrictEqual([{
//         a: ['a', 'b', 'c']
//     }, {
//         b: ['e', 'd']
//     }]);
// });

test('getMostProbableValidValue returns the most probable value that passes the validator function', () => {
    const ttjUtils = new TTJUtils();
    const result = [{
        value: 'a',
        probability: 0.2
    }, {
        value: 'b',
        probability: 0.5
    }, {
        value: 'c',
        probability: 0.3
    }];
    const validatorFn = (value) => value !== 'a';
    const mostProbableValue = ttjUtils.getMostProbableValidValue(result, validatorFn);
    expect(mostProbableValue).toBe('b');
});

test('getMostProbableValidValue returns null if no value passes the validator function', () => {
    const ttjUtils = new TTJUtils();
    const result = [{
        value: 'a',
        probability: 0.2
    }, {
        value: 'b',
        probability: 0.5
    }, {
        value: 'c',
        probability: 0.3
    }];
    const validatorFn = (value) => value === 'd';
    const mostProbableValue = ttjUtils.getMostProbableValidValue(result, validatorFn);
    expect(mostProbableValue).toBe(null);
});

test('streamFetchJson yields JSON objects from a stream', async () => {
    const stream = new ReadableStream({
        start(controller) {
            const input = '{"a": 1, "b": 2}\n{"c": 3, "d": 4}\n';
            const inputArrayBuffer = new TextEncoder().encode(input);
            controller.enqueue(inputArrayBuffer);
            controller.close();
        }
    });
    const response = {
        body: stream
    };
    const ttjUtils = new TTJUtils();
    const jsonObjects = [];
    // @ts-ignore because we're mocking the response object
    for await (const obj of ttjUtils.streamFetchJson(response)) {
        jsonObjects.push(obj);
    }
    expect(jsonObjects).toStrictEqual([{ a: 1, b: 2 }, { c: 3, d: 4 }]);
});

test('streamFetchJSON can handle escaped quotes', async () => {
    const stream = new ReadableStream({
        start(controller) {
            const input = '{"a": "\\"1", "b": 2}\n{"c": 3, "d": 4}\n';
            const inputArrayBuffer = new TextEncoder().encode(input);
            controller.enqueue(inputArrayBuffer);
            controller.close();
        }
    });
    const response = {
        body: stream
    };
    const ttjUtils = new TTJUtils();
    const jsonObjects = [];
    // @ts-ignore because we're mocking the response object
    for await (const obj of ttjUtils.streamFetchJson(response)) {
        jsonObjects.push(obj);
    }
    expect(jsonObjects).toStrictEqual([{ a: '"1', b: 2 }, { c: 3, d: 4 }]);
});

test('streamFetchJSON can handle escaped backslashes', async () => {
    const stream = new ReadableStream({
        start(controller) {
            const input = '{"a": "\\\\", "b": 2}\n{"c": 3, "d": 4}\n';
            const inputArrayBuffer = new TextEncoder().encode(input);
            controller.enqueue(inputArrayBuffer);
            controller.close();
        }
    });
    const response = {
        body: stream
    };
    const ttjUtils = new TTJUtils();
    const jsonObjects = [];
    // @ts-ignore because we're mocking the response object
    for await (const obj of ttjUtils.streamFetchJson(response)) {
        jsonObjects.push(obj);
    }
    expect(jsonObjects).toStrictEqual([{ a: '\\', b: 2 }, { c: 3, d: 4 }]);
});