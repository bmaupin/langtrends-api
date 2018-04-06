'use strict';

// Update (or create) database schema (https://loopback.io/doc/en/lb3/Creating-a-database-schema-from-models.html)
// This is effectively a no-op for the memory connector
// Based on https://stackoverflow.com/a/40032444/399105
module.exports = function(app, cb) {
  updateDatabaseSchema(app).then(() => {
    process.nextTick(cb);
  });
};

function updateDatabaseSchema(app) {
  return new Promise((resolve, reject) => {
    let datastore = app.datasources.db;

    for (let model in app.models) {
      datastore.isActual(model, async (err, actual) => {
        if (err) reject(err);
        if (!actual) {
          await updateSchemaForModel(datastore, model);
        }
      });
    }

    resolve();
  });
}

function updateSchemaForModel(datastore, model) {
  return new Promise((resolve, reject) => {
    datastore.autoupdate(model, (err, result) => {
      if (err) reject(err);
      console.log(`Autoupdate performed for model ${model}`);
      resolve();
    });
  });
}
