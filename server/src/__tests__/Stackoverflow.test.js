'use strict';

const Stackoverflow = require('../Stackoverflow');

let stackoverflow = new Stackoverflow();

test('Test getScore', async () => {
  expect(await stackoverflow.getScore('JavaScript', Date.parse('2017-01-01'))).toBeGreaterThan(1000000);
});
