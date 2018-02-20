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

  populateAllSites(app);
  populateAllLangs(app).then(() => {
    populateAllScores(app, cb);
  });
};

// TODO: remove this or make it return a promise
function populateAllSites(app) {
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

async function populateAllLangs(app) {
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

async function populateAllScores(app, cb) {
  const FIRST_DATE = new Date(Date.UTC(2007, 9)); // 2007-10-01 00:00:00 UTC
  const NUM_LANGUAGES = 10;
  let date = getFirstDayOfMonth();

  let topLangs = await getTopLangs(app, NUM_LANGUAGES, date);

  // TODO
  console.log(topLangs);

  // TODO make this code clearer
  for (let i = 0; date >= FIRST_DATE; i++) {
    date.setUTCMonth(date.getUTCMonth() - 1);
    // TODO
    console.log(`${i}: ${date}`);

    await populateScores(app, date, topLangs);

    // Tell the app we're ready after the most recent year's scores are populated
    if (i === 10) {
      process.nextTick(cb);
      // TODO
      break;
    }
  }
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

  // TODO: do these all at once using Promise.all
  for (let i = 0; i < topLangs.length; i++) {
    let languageName = topLangs[i];
    await addScore(app, date, languageName, scores[languageName]);
  }

  return topLangs;
}

async function getAllScores(app, date) {
  let langs = await getAllLanguages(app);
  let scores = {};

  for (let i = 0; i < langs.length; i++) {
    let languageName = langs[i].name;

    // TODO: do these all at once, or n at a time
    scores[languageName] = await getScore(app, date, languageName);
  }

  return scores;
}

async function getScore(app, date, languageName) {
  let github = new Github();
  let stackoverflow = new Stackoverflow();

  if (process.env.hasOwnProperty('GITHUB_API_KEY')) {
    github.apiKey = process.env.GITHUB_API_KEY;
  }
  if (process.env.hasOwnProperty('STACKOVERFLOW_API_KEY')) {
    stackoverflow.apiKey = process.env.STACKOVERFLOW_API_KEY;
  }

  let githubScore = await github.getScore(languageName, date);
  let stackoverflowTag = await getStackoverflowTag(app, languageName);
  let stackoverflowScore = await stackoverflow.getScore(stackoverflowTag, date);
  if (stackoverflowScore === 0) {
    console.log(`WARNING: stackoverflow tag not found for ${languageName}`);
  }

  return githubScore + stackoverflowScore;
}

function getStackoverflowTag(app, languageName) {
  return new Promise((resolve, reject) => {
    app.models.lang.findOne({where: {name: languageName}}, (err, lang) => {
      if (err) throw err;

      if (lang !== null) {
        if (typeof lang.stackoverflowTag === 'undefined') {
          resolve(languageName);
        } else {
          resolve(lang.stackoverflowTag);
        }
      } else {
        reject(`Language ${languageName} not found`);
      }
    });
  });
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
  return new Promise((resolve, reject) => {
    app.models.lang.findOne({where: {name: languageName}}, (err, lang) => {
      if (err) reject(err);

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
            if (err) reject(err);
          }
        );
      } else {
        reject(`Language ${languageName} not found`);
      }
      resolve();
    });
  });
}

async function getTopLangsFromDb(app, numberOfLanguages, date) {
  throw 'unimplemented';
}

function populateScores(app, date, languages) {
  return new Promise((resolve, reject) => {
    let promises = [];

    for (let i = 0; i < languages.length; i++) {
      promises.push(populateScore(app, date, languages[i]));
    }

    Promise.all(promises).then(
      values => { resolve(); },
      reason => { reject(reason); }
    );
  });
}

function populateScore(app, date, languageName) {
  return new Promise((resolve, reject) => {
    app.models.lang.findOne({where: {name: languageName}}, (err, lang) => {
      if (err) throw err;

      if (lang !== null) {
        app.models.score.findOne(
          {
            where: {
              date: date,
              langId: lang.id,
            },
          },
          async (err, score) => {
            if (err) reject(err);
            if (score === null) {
              let points = await getScore(app, date, languageName);
              await addScore(app, date, languageName, points);
            }
            resolve();
          }
        );
      } else {
        reject(`Language ${languageName} not found`);
      }
    });
  });
}
