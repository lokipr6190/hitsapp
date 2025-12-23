const express = require('express');
const { Pool } = require('pg');
const app = express();

// Database connection configuration
const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || "postgresql-project-hit", // Service name in OpenShift
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  database: process.env.POSTGRESQL_DATABASE,
  port: 5432,
});

let isReady = false;

// Initialize Database Table
async function initDB() {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS counters (id serial PRIMARY KEY, count integer);');
    const res = await pool.query('SELECT * FROM counters WHERE id = 1');
    if (res.rowCount === 0) {
      await pool.query('INSERT INTO counters(id, count) VALUES(1, 0)');
    }
    isReady = true;
    console.log("Database initialized and ready.");
  } catch (err) {
    console.error("DB Init Error, retrying...", err);
    setTimeout(initDB, 5000); // Retry after 5s
  }
}

initDB();

app.get('/', async (req, res) => {
  try {
    // Increment the hit count in Postgres
    const result = await pool.query('UPDATE counters SET count = count + 1 WHERE id = 1 RETURNING count');
    const currentHits = result.rows[0].count;
    res.send(`<h1>Hello World!</h1><p>This page has been hit <b>${currentHits}</b> times.</p>`);
  } catch (err) {
    res.status(500).send("Error updating hits");
  }
});

// Probes
app.get('/health/live', (req, res) => res.status(200).send('Alive'));
app.get('/health/ready', (req, res) => isReady ? res.status(200).send('Ready') : res.status(503).send('Waiting for DB'));

app.listen(8080, () => console.log('Server running on 8080'));
