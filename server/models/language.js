'use strict';

module.exports = function(Lang) {
  Lang.validatesPresenceOf('name');
  Lang.validatesUniquenessOf('name');
};
