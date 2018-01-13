'use strict';

const Github = require('../Github');

test('Test getting language names from Github', async () => {
  expect(await Github.getLangNames()).toContain('JavaScript');
});
