'use strict';

module.exports = function(app, cb) {
  /*
   * The `app` object provides access to a variety of LoopBack resources such as
   * models (e.g. `app.models.YourModelName`) or data sources (e.g.
   * `app.datasources.YourDataSource`). See
   * http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
   * for more info.
   */

  populateSite(app);

  process.nextTick(cb); // Remove if you pass `cb` to an async function yourself
};

function populateSite(app) {
  app.models.site.count(function(err, count) {
    if (err) throw err;

    if (count < 1) {
      app.models.site.create([
        {
          name: 'github'
        },
        {
          name: 'stackoverflow'
        },
      ]);
    }
  });
}
