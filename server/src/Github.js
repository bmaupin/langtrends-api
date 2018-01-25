'use strict';

const https = require('https');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {URL} = require('url');
const zlib = require('zlib');

const API_URL = 'https://api.github.com/graphql';

module.exports = class Github {
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

    let bodyJson = await this._httpsRequest(API_URL, postData);
    let body = JSON.parse(bodyJson);

    return body.data.search.repositoryCount;
  }

  set apiKey(newApiKey) {
    this._apiKey = newApiKey;
  }

  _buildPostData(date, langName) {
    let postData = `{"query": "{ search(query: \\"language:${Github._encodeLangName(langName)} ` +
      `created:<${Github._encodeDate(date)}\\", type: REPOSITORY) { repositoryCount }}"}`;

    return postData;
  }

  static _encodeLangName(langName) {
    // Github API requires spaces in language names to be replaced with dashes
    return encodeURIComponent(langName.replace(/ /g, '-'));
  }

  static _encodeDate(date) {
    // Github API requires the date to be formatted as yyyy-MM-dd
    return date.toISOString().slice(0, 10);
  }

  // TODO: clean this up and make it less generic?
  //  - we don't need to handle compressed body
  // Based on https://stackoverflow.com/a/38543075/399105
  _httpsRequest(url, postData) {
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

    return new Promise(function(resolve, reject) {
      let request = https.request(options, function(response) {
        // Reject on bad status code
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(new Error('statusCode=' + response.statusCode));
        }
        let body = [];
        response.on('data', function(chunk) {
          body.push(chunk);
        });
        response.on('end', function() {
          try {
            switch (response.headers['content-encoding']) {
              case 'gzip':
                zlib.gunzip(Buffer.concat(body), (error, uncompressedData) => {
                  resolve(uncompressedData.toString());
                });
                break;
              default:
                resolve(Buffer.concat(body).toString());
                break;
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      // Reject on request error
      request.on('error', function(err) {
        reject(err);
      });
      if (postData) {
        request.write(postData);
      }
      request.end();
    });
  }
};
