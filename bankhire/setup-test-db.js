/**
 * Setup Test Database
 * Creates the bankhire_test database for running tests
 */

require('dotenv').config({ path: '.env.test' });
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: 'postgres',
  password: 'Village@1234',
  database: 'postgres',
});

async function setupTestDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const dbName = process.env.DB_NAME || 'bankhire_test';
    const dbUser = process.env.DB_USER || 'bankhire_user';

    // Check if database exists
    const dbExists = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbExists.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${dbName} OWNER ${dbUser};`);
      console.log(`Test database '${dbName}' created`);
    } else {
      console.log(`Test database '${dbName}' already exists`);
    }

    // Grant permissions
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};`);
    console.log(`Permissions granted to '${dbUser}'`);

  } catch (err) {
    console.error('Error setting up test database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupTestDatabase();
