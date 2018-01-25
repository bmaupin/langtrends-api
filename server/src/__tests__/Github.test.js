'use strict';

const Github = require('../Github');

test('Test getLangNames', async () => {
  let langNames = await Github.getLangNames();
  expect(langNames.length).toBeGreaterThan(100);
  expect(langNames).toContain('JavaScript');
});

test('Test getScore', async () => {
  let github = new Github();
  if (process.env.hasOwnProperty('GITHUB_API_KEY')) {
    github.apiKey = process.env.GITHUB_API_KEY;
  }
  expect(await github.getScore('JavaScript', new Date('2017-01-01'))).toBeGreaterThan(1000000);
});
