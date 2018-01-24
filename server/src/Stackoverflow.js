'use strict';

const https = require('https');
const {URL} = require('url');
const util = require('util');
const zlib = require('zlib');

const API_URL = 'https://api.stackexchange.com/2.2/search?todate=%s&site=stackoverflow&tagged=%s&filter=!.UE8F0bVg4M-_Ii4';

module.exports = class Stackoverflow {
  async getScore(langName, date) {
    let url = this._buildUrl(date, langName);

    // TODO: Add functionality to set API key
    /* TODO: handle API limitations in instance (https://stackapps.com/a/3057/41977)
     *  - Don't make more than 30 requests/second
     *  - Handle backoff field
     */
    let bodyJson = await this._httpsRequest(url);
    let body = JSON.parse(bodyJson);

    // TODO: find and use a proper logging framework
    console.log(`DEBUG: StackOverflow API daily quota remaining: ${body.quota_remaining}`);

    return body.total;
  }

  set apiKey(newApiKey) {
    this._apiKey = newApiKey;
  }

  _buildUrl(date, langName) {
    let url = util.format(API_URL, Stackoverflow._encodeDate(date), Stackoverflow._encodeLangName(langName));
    url = this._addApiKey(url);

    return url;
  }

  static _encodeDate(date) {
    // All dates in the API are in unix epoch time, which is the number of seconds since midnight UTC January 1st, 1970.
    // (https://api.stackexchange.com/docs/dates)
    return Math.floor(date / 1000);
  }

  static _encodeLangName(langName) {
    return encodeURIComponent(langName.toLowerCase().replace(/ /g, '-'));
  }

  _addApiKey(url) {
    const KEY_PARAMETER = '&key=';
    if (typeof this._apiKey !== 'undefined') {
      url = `${url}${KEY_PARAMETER}${this._apiKey}`;
    }

    return url;
  }

  // TODO: clean this up and make it less generic?
  //  - we don't need postData
  //  - we don't need to handle uncompressed body
  //  - we can parse the JSON here
  // Based on https://stackoverflow.com/a/38543075/399105
  _httpsRequest(url, postData) {
    const options = new URL(url);

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
