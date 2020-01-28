'use strict';

module.exports = {
  db: {
    connector: 'postgresql',
    // Scalingo only allows max 10 DB connections, only 8 are available to us, and the pgAdmin client can use several.
    // Using too many connections throws error: remaining connection slots are reserved for non-replication superuser
    // connections
    max: 5,
    // Scalingo requires SSL
    ssl: true,
    url: process.env.DATABASE_URL,
    useNewUrlParser: true,
  },
};
