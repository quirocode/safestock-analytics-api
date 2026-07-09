const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL client error', error);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
