'use strict';

// Create database schema if it doesn't exist (https://loopback.io/doc/en/lb3/Creating-a-database-schema-from-models.html)
// This is effectively a no-op for the memory connector (https://loopback.io/doc/en/lb3/Memory-connector.html)
// Based on https://stackoverflow.com/a/40032444/399105
module.exports = function(app) {
  let ds = app.datasources.db;

  for (let model in app.models) {
    ds.isActual(model, (err, actual) => {
      if (err) throw err;
      if (!actual) {
        ds.autoupdate(model, (err, result) => {
          if (err) throw err;
          console.log(`Autoupdate performed for model ${model}`);
        });
      }
    });
  }
};
