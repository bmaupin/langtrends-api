'use strict';

module.exports = class CodingSite {
  set apiKey(newApiKey) {
    this._apiKey = newApiKey;
  }

  async _retryOnError(errorCode, secondsToWait, options, postData) {
    console.log(`WARNING: ${options.hostname} returned error code ${errorCode}; retrying in ${secondsToWait} seconds`);
    await CodingSite._waitSeconds(secondsToWait);
    return await this._httpsRequest(options, postData);
  }

  // Based on https://stackoverflow.com/a/39027151/399105
  static _waitSeconds(numSeconds) {
    return new Promise(resolve => {
      setTimeout(resolve, numSeconds * 1000);
    });
  }
};
