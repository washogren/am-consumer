#!/usr/bin/env node
const { describe } = require('../src/index');

const result = describe();
console.log('am-consumer CLI');
console.log('---------------');
console.log(`consumer version:    ${result.consumer}`);
console.log(`dependency version:  ${result.dependency}`);
console.log(`greeting:            ${result.greeting}`);
console.log(`add(2, 3):           ${result.sum}`);
