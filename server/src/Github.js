'use strict';

const jsdom = require('jsdom');
const {JSDOM} = jsdom;

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
};
