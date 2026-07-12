const fs = require('fs');
const path = require('path');
const env = require('../src/shared/infrastructure/environment');
const PostgresDatabase = require('../src/shared/infrastructure/postgres-database');

class MigrationRunner {
  constructor(database, directory) {
    this.database = database;
    this.directory = directory;
  }

  async run() {
    const migrations = fs.readdirSync(this.directory).filter((name) => name.endsWith('.sql')).sort();
    for (const migration of migrations) {
      const sql = fs.readFileSync(path.join(this.directory, migration), 'utf8');
      await this.database.query(sql);
      console.log(`Applied ${migration}`);
    }
    await this.database.pool.end();
  }
}

new MigrationRunner(new PostgresDatabase(env.database), path.join(__dirname, '..', 'sql'))
  .run()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
