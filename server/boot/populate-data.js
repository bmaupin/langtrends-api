'use strict';

import Github from '../src/site/Github';
import languages from '../src/lang/languages.json';

module.exports = function(app, cb) {
  /*
   * The `app` object provides access to a variety of LoopBack resources such as
   * models (e.g. `app.models.YourModelName`) or data sources (e.g.
   * `app.datasources.YourDataSource`). See
   * http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
   * for more info.
   */

  populateSite(app);
  populateLang(app).then(() => {
    process.nextTick(cb);
  });
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

async function populateLang(app) {
  let langsFromGithub = await Github.getLangNames();

  // TODO: handle languages that aren't in languages.json
  for (let i = 0, len = langsFromGithub.length; i < len; i++) {
    for (let j = 0, len = languages.length; j < len; j++) {
      if (langsFromGithub[i] === languages[j].name) {
        if (languages[j].include === true) {
          app.models.lang.findOne({where: {name: langsFromGithub[i]}}, function(err, lang) {
            if (err) throw err;

            if (lang === null) {
              app.models.lang.create([
                {
                  name: langsFromGithub[i]
                }
              ]);
            }
          });
        }

        continue;
      }
    }
  }
}
