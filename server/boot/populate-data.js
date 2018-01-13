'use strict';

const Github = require('../src/Github');
const languages = require('./languages.json');

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
          name: 'github',
        },
        {
          name: 'stackoverflow',
        },
      ]);
    }
  });
}

async function populateLang(app) {
  let langsFromGithub = await Github.getLangNames();

  for (let i = 0; i < languages.length; i++) {
    if (languages[i].include === true && langsFromGithub.includes(languages[i].name)) {
      app.models.lang.findOne({where: {name: languages[i].name}}, function(err, lang) {
        if (err) throw err;

        if (lang === null) {
          app.models.lang.create([
            {
              name: languages[i].name,
            },
          ]);
        }
      });
    }

    delete langsFromGithub[langsFromGithub.indexOf(languages[i].name)];
  }

  for (let i = 0; i < langsFromGithub.length; i++) {
    if (typeof langsFromGithub[i] !== 'undefined') {
      console.log(`DEBUG: Language from Github not found in languages.json: ${langsFromGithub[i]}`);
    }
  }
}
