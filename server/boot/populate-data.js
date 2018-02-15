'use strict';

const Github = require('../src/Github');
const languages = require('./languages.json');
const Stackoverflow = require('../src/Stackoverflow');

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
    populateScores(app);
    // TODO: when should we run this? Before populating all scores? Or maybe just after a certain number
    process.nextTick(cb);
  });
};

function populateSite(app) {
  app.models.site.count((err, count) => {
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

  for (let i = 0; i < langsFromGithub.length; i++) {
    let languageName = langsFromGithub[i];

    if (languages.hasOwnProperty(languageName)) {
      if (languages[languageName].include === true) {
        await addLanguage(app, languageName, languages[languageName].stackoverflowTag);
      }
    } else {
      console.log(`DEBUG: Language from Github not found in languages.json: ${languageName}`);
    }
  }
}

function addLanguage(app, languageName, stackoverflowTag) {
  return new Promise((resolve, reject) => {
    // Do an upsert in case stackoverflowTag changes
    app.models.lang.upsertWithWhere(
      {name: languageName},
      {
        name: languageName,
        stackoverflowTag: stackoverflowTag,
      },
      // Oddly enough this only works if the validations are ignored
      // https://github.com/strongloop/loopback-component-passport/issues/123#issue-131073519
      {validate: false},
      (err, lang) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
}

async function populateScores(app) {
  const NUM_LANGUAGES = 10;
  const firstDayOfMonth = getFirstDayOfMonth();

  let topLangs = await getTopLangs(app, NUM_LANGUAGES, firstDayOfMonth);

  // TODO
  console.log(topLangs);
}

function getFirstDayOfMonth() {
  // Note this will return a date at 00:00:00 UTC time
  return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth()));
}

async function getTopLangs(app, numberOfLanguages, date) {
  let scoreCount = await getScoreCount(app, date);
  let topLangs = [];

  if (scoreCount < numberOfLanguages) {
    topLangs = await getTopLangsFromApi(app, numberOfLanguages, date);
  } else {
    topLangs = await getTopLangsFromDb(app, numberOfLanguages, date);
  }

  return topLangs;
}

function getScoreCount(app, date) {
  return new Promise((resolve, reject) => {
    app.models.score.count({date: date}, (err, count) => {
      if (err) reject(err);
      resolve(count);
    });
  });
}

async function getTopLangsFromApi(app, numberOfLanguages, date) {
  let scores = await getAllScores(app, date);
  let topLangs = getTopItems(scores, numberOfLanguages);

  for (let i = 0; i < topLangs.length; i++) {
    let languageName = topLangs[i];
    addScore(app, date, languageName, scores[languageName]);
  }

  return topLangs;
}

async function getAllScores(app, date) {
  let github = new Github();
  let langs = await getAllLanguages(app);
  let scores = {};
  let stackoverflow = new Stackoverflow();

  if (process.env.hasOwnProperty('GITHUB_API_KEY')) {
    github.apiKey = process.env.GITHUB_API_KEY;
  }
  if (process.env.hasOwnProperty('STACKOVERFLOW_API_KEY')) {
    stackoverflow.apiKey = process.env.STACKOVERFLOW_API_KEY;
  }

  for (let i = 0; i < langs.length; i++) {
    let languageName = langs[i].name;

    let githubScore = await github.getScore(languageName, date);
    // TODO use correct stackoverflow tag
    let stackoverflowScore = await stackoverflow.getScore(languageName, date);
    if (stackoverflowScore === 0) {
      console.log(`WARNING: stackoverflow tag not found for ${languageName}`);
    }

    scores[languageName] = githubScore + stackoverflowScore;
  }

  return scores;
}

function getAllLanguages(app) {
  return new Promise((resolve, reject) => {
    app.models.lang.all((err, langs) => {
      if (err) throw err;

      if (langs === null) {
        reject('Languages must be populated before scores can be populated');
      }

      resolve(langs);
    });
  });
}

function getTopItems(obj, numberOfItems) {
  // https://stackoverflow.com/a/39442287/399105
  let sortedKeys = Object.keys(obj).sort((a, b) => obj[b] - obj[a]);

  return sortedKeys.splice(0, numberOfItems);
}

function addScore(app, date, languageName, points) {
  // TODO: wrap this in a promise??
  app.models.lang.findOne({where: {name: languageName}}, (err, lang) => {
    if (err) throw err;

    if (lang !== null) {
      // Do an upsert because we don't want duplicate scores per date/language
      app.models.score.upsertWithWhere(
        {
          date: date,
          langId: lang.id,
        },
        {
          date: date,
          lang: lang,
          points: points,
        },
        (err, score) => {
          if (err) throw err;
        }
      );
    } else {
      throw new Error(`Language ${languageName} not found`);
    }
  });
}

async function getTopLangsFromDb(app, numberOfLanguages, date) {
  throw 'unimplemented';
}
