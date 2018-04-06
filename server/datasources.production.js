'use strict';

module.exports = {
  db: {
    connector: 'postgresql',
    host: process.env.POSTGRESQL_SERVICE_HOST || 'localhost',
    port: process.env.POSTGRESQL_SERVICE_PORT || 5432,
    user: process.env.POSTGRESQL_USER,
    password: process.env.POSTGRESQL_PASSWORD,
    database: process.env.POSTGRESQL_DATABASE,
  },
};
