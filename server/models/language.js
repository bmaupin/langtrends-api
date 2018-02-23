'use strict';

module.exports = function(Language) {
  Language.validatesPresenceOf('name');
  Language.validatesUniquenessOf('name');
};
