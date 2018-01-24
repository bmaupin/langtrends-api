'use strict';

const Stackoverflow = require('../Stackoverflow');

let stackoverflow = new Stackoverflow();

beforeAll(() => {
  if (process.env.hasOwnProperty('STACKOVERFLOW_API_KEY')) {
    stackoverflow.apiKey = process.env.STACKOVERFLOW_API_KEY;
  }
});

test('Test getScore', async () => {
  expect(await stackoverflow.getScore('JavaScript', Date.parse('2017-01-01'))).toBeGreaterThan(1000000);
});
