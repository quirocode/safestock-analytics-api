const { Pool } = require('pg');

class PostgresDatabase {
  constructor(config) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : false
    });
    this.pool.on('error', (error) => console.error('PostgreSQL pool error', error));
  }

  query(text, params = []) {
    return this.pool.query(text, params);
  }

  async transaction(work) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck() {
    const result = await this.query('SELECT NOW() AS database_time');
    return result.rows[0];
  }
}

module.exports = PostgresDatabase;
