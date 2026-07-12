const env = require('../src/shared/infrastructure/environment');
const PostgresDatabase = require('../src/shared/infrastructure/postgres-database');
const PostgresIdentityRepository = require('../src/identity-access/infrastructure/postgres-identity-repository');

class DatabaseDiagnostic {
  constructor(database) {
    this.database = database;
  }

  async run() {
    const connection = await this.database.query(
      'SELECT current_database() AS database, current_user AS usuario, current_schema() AS esquema'
    );
    const tables = await this.database.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
       ORDER BY table_name`,
      ['public']
    );
    const userColumns = await this.database.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      ['public', 'usuarios']
    );
    let identityProbe;
    try {
      const repository = new PostgresIdentityRepository(this.database);
      const user = await repository.findUserByEmail('admin@safestock.com');
      identityProbe = user ? 'admin-found' : 'admin-not-found';
    } catch (error) {
      identityProbe = `${error.code || 'ERROR'}: ${error.message}`;
    }
    console.log(JSON.stringify({
      connection: connection.rows[0],
      tables: tables.rows.map((row) => row.table_name),
      userColumns: userColumns.rows.map((row) => row.column_name),
      identityProbe
    }, null, 2));
  }
}

const database = new PostgresDatabase(env.database);
new DatabaseDiagnostic(database)
  .run()
  .catch((error) => {
    console.error(error.code, error.message);
    process.exitCode = 1;
  })
  .finally(() => database.pool.end());
