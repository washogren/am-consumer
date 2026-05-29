const dep = require('@washogren/am-dependency');
const pkg = require('../package.json');

function describe() {
  return {
    consumer: pkg.version,
    dependency: dep.version,
    greeting: dep.greet('consumer'),
    sum: dep.add(2, 3),
  };
}

module.exports = { describe };
