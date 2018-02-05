'use strict';

const CodingSite = require('./CodingSite');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {URL} = require('url');

const API_URL = 'https://api.github.com/graphql';

module.exports = class Github extends CodingSite {
  static async getLangNames() {
    const GITHUB_LANGUAGES_URL = 'https://github.com/search/advanced';

    let dom = await JSDOM.fromURL(GITHUB_LANGUAGES_URL);
    let langNames = [];

    let select = dom.window.document.getElementById('search_language');
    let optgroups = select.getElementsByTagName('optgroup');

    for (let i = 0; i < optgroups.length; i++) {
      let options = optgroups[i].getElementsByTagName('option');
      for (let j = 0; j < options.length; j++) {
        langNames.push(options[j].textContent);
      }
    }

    return langNames;
  }

  async getScore(langName, date) {
    // API key can't be null for the GraphQL API (https://platform.github.community/t/anonymous-access/2093)
    if (typeof this._apiKey === 'undefined') {
      throw 'apiKey cannot be null';
    }

    let postData = this._buildPostData(date, langName);
    let body = await this._callApi(API_URL, postData);

    return body.data.search.repositoryCount;
  }

  _buildPostData(date, langName) {
    let postData = `{"query": "{ search(query: \\"language:${Github._encodeLangName(langName)} ` +
      `created:<${Github._encodeDate(date)}\\", type: REPOSITORY) { repositoryCount }}"}`;

    return postData;
  }

  static _encodeLangName(langName) {
    // Github API requires spaces in language names to be replaced with dashes
    return langName.replace(/ /g, '-');
  }

  static _encodeDate(date) {
    // Github API requires the date to be formatted as yyyy-MM-dd
    return date.toISOString().slice(0, 10);
  }

  async _callApi(url, postData) {
    const optionsUrl = new URL(url);
    const options = {
      headers: {
        'Authorization': `bearer ${this._apiKey}`,
        // For whatever reason, user agent is required by the Github API
        'User-Agent': 'node.js',
      },
      hostname: optionsUrl.hostname,
      method: 'POST',
      path: optionsUrl.pathname,
    };

    let bodyJson = await CodingSite._httpsRequest(options, postData);
    return JSON.parse(bodyJson);
  }
};
