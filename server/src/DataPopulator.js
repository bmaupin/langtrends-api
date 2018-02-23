'use strict';

const Github = require('./Github');
const languages = require('./languages.json');
const Stackoverflow = require('./Stackoverflow');

module.exports = class DataPopulator {
  constructor(app, cb) {
    this._app = app;
    this._cb = cb;
    this._github = new Github();
    this._stackoverflow = new Stackoverflow();

    if (process.env.hasOwnProperty('GITHUB_API_KEY')) {
      this._github.apiKey = process.env.GITHUB_API_KEY;
    }
    if (process.env.hasOwnProperty('STACKOVERFLOW_API_KEY')) {
      this._stackoverflow.apiKey = process.env.STACKOVERFLOW_API_KEY;
    }
  }

  async populateAllLangs() {
    let langsFromGithub = await Github.getLangNames();

    for (let i = 0; i < langsFromGithub.length; i++) {
      let languageName = langsFromGithub[i];

      if (languages.hasOwnProperty(languageName)) {
        if (languages[languageName].include === true) {
          await this._addLanguage(languageName, languages[languageName].stackoverflowTag);
        }
      } else {
        console.log(`DEBUG: Language from Github not found in languages.json: ${languageName}`);
      }
    }
  }

  _addLanguage(languageName, stackoverflowTag) {
    return new Promise((resolve, reject) => {
      // Do an upsert in case stackoverflowTag changes
      this._app.models.lang.upsertWithWhere(
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

  async populateTopScores() {
    const FIRST_DATE = new Date(Date.UTC(2007, 9)); // 2007-10-01 00:00:00 UTC
    const NUM_LANGUAGES = 10;
    let date = DataPopulator._getFirstDayOfMonth();

    let topLangs = await this._getTopLangs(NUM_LANGUAGES, date);

    // TODO
    console.log(topLangs);

    // TODO make this code clearer
    for (let i = 0; date >= FIRST_DATE; i++) {
      date.setUTCMonth(date.getUTCMonth() - 1);
      // TODO
      console.log(`${i}: ${date}`);

      await this._populateScores(date, topLangs);

      // Tell the app we're ready after the most recent year's scores are populated
      if (i === 10) {
        // TODO
        return;
        process.nextTick(this._cb);
      }
    }
  }

  static _getFirstDayOfMonth() {
    // Note this will return a date at 00:00:00 UTC time
    return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth()));
  }

  async _getTopLangs(numberOfLanguages, date) {
    let scoreCount = await this._getScoreCount(date);
    let topLangs = [];

    if (scoreCount < numberOfLanguages) {
      topLangs = await this._getTopLangsFromApi(numberOfLanguages, date);
    } else {
      topLangs = await this._getTopLangsFromDb(numberOfLanguages, date);
    }

    return topLangs;
  }

  _getScoreCount(date) {
    return new Promise((resolve, reject) => {
      this._app.models.score.count({date: date}, (err, count) => {
        if (err) reject(err);
        resolve(count);
      });
    });
  }

  _getTopLangsFromApi(numberOfLanguages, date) {
    return new Promise(async (resolve, reject) => {
      let promises = [];
      let scores = await this._getAllScores(date);
      let topLangs = DataPopulator._getTopItems(scores, numberOfLanguages);

      for (let i = 0; i < topLangs.length; i++) {
        let languageName = topLangs[i];
        promises.push(this._addScore(date, languageName, scores[languageName]));
      }

      Promise.all(promises).then(
        values => { resolve(topLangs); },
        reason => { reject(reason); }
      );
    });
  }

  async _getAllScores(date) {
    let languages = await this._getAllLanguages();
    let scores = {};

    while (languages.length !== 0) {
      Object.assign(scores, await this._getScores(date, languages.splice(0, Stackoverflow.MAX_REQUESTS_PER_SECOND)));
    }

    return scores;
  }

  _getScores(date, languages) {
    return new Promise((resolve, reject) => {
      let promises = [];
      let scores = {};

      for (let i = 0; i < languages.length; i++) {
        let languageName = languages[i].name;
        promises.push(
          this._getScore(date, languageName).then((score, reason) => {
            if (reason) reject(reason);
            scores[languageName] = score;
          })
        );
      }

      Promise.all(promises).then(
        values => { resolve(scores); },
        reason => { reject(reason); }
      );
    });
  }

  async _getScore(date, languageName) {
    let githubScore = await this._github.getScore(languageName, date);
    let stackoverflowTag = await this._getStackoverflowTag(languageName);
    let stackoverflowScore = await this._stackoverflow.getScore(stackoverflowTag, date);
    if (stackoverflowScore === 0) {
      console.log(`WARNING: stackoverflow tag not found for ${languageName}`);
    }

    return githubScore + stackoverflowScore;
  }

  _getStackoverflowTag(languageName) {
    return new Promise((resolve, reject) => {
      this._app.models.lang.findOne({where: {name: languageName}}, (err, lang) => {
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

  _getAllLanguages() {
    return new Promise((resolve, reject) => {
      this._app.models.lang.all((err, langs) => {
        if (err) throw err;

        if (langs === null) {
          reject('Languages must be populated before scores can be populated');
        }

        resolve(langs);
      });
    });
  }

  static _getTopItems(obj, numberOfItems) {
    // https://stackoverflow.com/a/39442287/399105
    let sortedKeys = Object.keys(obj).sort((a, b) => obj[b] - obj[a]);

    return sortedKeys.splice(0, numberOfItems);
  }

  _addScore(date, languageName, points) {
    return new Promise((resolve, reject) => {
      this._app.models.lang.findOne({where: {name: languageName}}, (err, lang) => {
        if (err) reject(err);

        if (lang !== null) {
          // Do an upsert because we don't want duplicate scores per date/language
          this._app.models.score.upsertWithWhere(
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

  _getTopLangsFromDb(numberOfLanguages, date) {
    return new Promise((resolve, reject) => {
      this._app.models.score.find(
        {
          fields: {langId: true},
          include: 'lang',
          limit: numberOfLanguages,
          order: 'points DESC',
          where: {date: date},
        },
        (err, scores) => {
          if (err) throw err;

          if (scores === null) {
            reject(`No scores found for date: ${date}`);
          }

          // Apparently score.lang is a function
          resolve(scores.map(score => score.lang().name));
        }
      );
    });
  }

  _populateScores(date, languages) {
    return new Promise((resolve, reject) => {
      let promises = [];

      for (let i = 0; i < languages.length; i++) {
        promises.push(this._populateScore(date, languages[i]));
      }

      Promise.all(promises).then(
        values => { resolve(); },
        reason => { reject(reason); }
      );
    });
  }

  _populateScore(date, languageName) {
    return new Promise((resolve, reject) => {
      this._app.models.lang.findOne({where: {name: languageName}}, (err, lang) => {
        if (err) throw err;

        if (lang !== null) {
          this._app.models.score.findOne(
            {
              where: {
                date: date,
                langId: lang.id,
              },
            },
            async (err, score) => {
              if (err) reject(err);
              if (score === null) {
                let points = await this._getScore(date, languageName);
                await this._addScore(date, languageName, points);
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
};
