require('dotenv').config();
const { Client } = require('pg');

// Connect to default postgres database to create user and DB
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: 'postgres',
  password: 'Village@1234',
  database: 'postgres',
});

async function setupDatabase() {
  try {
    await client.connect();

    // Check if user exists
    const userExists = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [process.env.DB_USER]);
    if (userExists.rows.length === 0) {
      // Create user
      await client.query(`CREATE USER ${process.env.DB_USER} WITH PASSWORD '${process.env.DB_PASS}';`);
      console.log('User created');
    } else {
      console.log('User already exists');
    }

    // Check if database exists
    const dbExists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [process.env.DB_NAME]);
    if (dbExists.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${process.env.DB_NAME} OWNER ${process.env.DB_USER};`);
      console.log('Database created');
    } else {
      console.log('Database already exists');
    }

  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    await client.end();
  }
}

setupDatabase();