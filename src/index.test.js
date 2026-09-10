const assert = require('assert');
const ms = require('ms');
const { describe } = require('./index');
const pkg = require('../package.json');

const result = describe();
assert.ok(typeof result.consumer === 'string');
assert.ok(typeof result.dependency === 'string');
assert.ok(result.greeting.includes('consumer'));
assert.strictEqual(result.sum, 5);

// The point of the whole pipeline: the version the dependency reports about
// ITSELF at runtime must equal the version package.json pins. This catches a
// bump that edited package.json but resolved to a different tarball — i.e. it
// tests dependency resolution, not just the pin rewrite.
const pinned = pkg.dependencies['@washogren/am-dependency'];
assert.strictEqual(
  result.dependency,
  pinned,
  `resolved @washogren/am-dependency@${result.dependency} != pinned ${pinned}`,
);

// `ms` is a PUBLIC dep and exists solely as a guard: the action must bind only
// `@washogren:registry` to GitHub Packages, never the global default. If it
// ever sets the default again, resolving this package 404s and `npm ci` fails
// before the tests even run. (Regression: public transitive deps 404ing.)
assert.strictEqual(ms('1s'), 1000);

console.log('am-consumer tests passed.');
console.log(`dependency pin ${pinned} resolved to ${result.dependency} at runtime.`);
console.log(JSON.stringify(result, null, 2));
