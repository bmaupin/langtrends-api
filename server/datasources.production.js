'use strict';

module.exports = {
  db: {
    connector: 'postgresql',
    // Clever Cloud only allows max 5 DB connections and the pgAdmin client can use several. Using too many connections
    // throws error: too many connections for role
    max: 2,
    url: process.env.DATABASE_URL,
    useNewUrlParser: true,
  },
};
