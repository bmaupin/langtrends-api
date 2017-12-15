'use strict';

module.exports = function(Site) {
  Site.validatesPresenceOf('name');
  Site.validatesUniquenessOf('name');
};
