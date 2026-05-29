const assert = require('assert');
const { describe } = require('./index');

const result = describe();
assert.ok(typeof result.consumer === 'string');
assert.ok(typeof result.dependency === 'string');
assert.ok(result.greeting.includes('consumer'));
assert.strictEqual(result.sum, 5);

console.log('am-consumer tests passed.');
console.log(JSON.stringify(result, null, 2));
