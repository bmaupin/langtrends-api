'use strict';

const DataPopulator = require('../src/DataPopulator');

module.exports = function(app, cb) {
  let dataPopulator = new DataPopulator(app, cb);

  dataPopulator.populateAllSites();
  dataPopulator.populateAllLangs().then(() => {
    dataPopulator.populateAllScores();
  });
};
