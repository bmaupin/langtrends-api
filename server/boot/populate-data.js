'use strict';

const DataPopulator = require('../src/DataPopulator');

module.exports = function(app, cb) {
  populateData(app, cb);
  schedulePopulateDataDaily(app);
};

function schedulePopulateDataDaily(app) {
  const MILLISECONDS_PER_DAY = 86400000;
  setInterval(populateData, MILLISECONDS_PER_DAY, app);
}

function populateData(app, cb) {
  console.log(`DEBUG: ${new Date(Date.now()).toISOString()}\tpopulateData`);

  let dataPopulator = new DataPopulator(app, cb);

  dataPopulator.populateAllLanguages().then(() => {
    dataPopulator.populateTopScores();
  });
}
