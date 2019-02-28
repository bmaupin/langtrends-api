'use strict';

module.exports = {
  db: {
    connector: 'mongodb',
    url: process.env.DATABASE_URL,
    useNewUrlParser: true,
  },
};
