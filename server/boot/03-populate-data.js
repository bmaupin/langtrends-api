'use strict';

const DataPopulator = require('./classes/DataPopulator');

module.exports = function(app) {
  populateData(app);
  schedulePopulateDataDaily(app);
};

function schedulePopulateDataDaily(app) {
  const MILLISECONDS_PER_DAY = 86400000;
  setInterval(populateData, MILLISECONDS_PER_DAY, app);
}

function populateData(app) {
  console.log(`DEBUG: ${new Date(Date.now()).toISOString()}\tpopulateData`);

  let dataPopulator = new DataPopulator(app);

  dataPopulator.populateAllLanguages().then(() => {
    dataPopulator.populateTopScores();
  });
}
