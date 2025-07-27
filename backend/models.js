const mysql = require("mysql2/promise");
// We import the promise based MySQL library to use async/await syntax

const pool = mysql.createPool({
  host: process.env.DB_HOST || "mysql",       // DB hostname or container name
  user: process.env.DB_USER || "root",        
  password: process.env.DB_PASSWORD || "rootpass",
  database: process.env.DB_NAME || "alertsdb"
});

async function init() {
  // Create Articles table if not present
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(512),
      url VARCHAR(1024),
      source VARCHAR(256),
      published_at DATETIME,
      domain_tags VARCHAR(256),
      notified BOOLEAN DEFAULT FALSE
    );
  `);
}

module.exports = { pool, init };