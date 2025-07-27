// Backend code
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let db;
const RETRY_INTERVAL = 5000;

function connectWithRetry() {
  db = mysql.createConnection({
    host: "mysql",
    user: "root", 
    password: "rootpass",
    database: "alertsdb",
  });

  db.connect((err) => {
    if (err) {
      console.error("Failed to connect to MySQL, retrying in 5s...", err);
      setTimeout(connectWithRetry, RETRY_INTERVAL);
    } else {
      console.log("Connected to MySQL");
      startServer();
    }
  });
}

function startServer() {
  // All articles (for backward compatibility)
  app.get('/news', (req, res) => {
    db.query('SELECT * FROM Articles ORDER BY created_at DESC LIMIT 50', (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results || []);
    });
  });

  // Top 5 important articles
  app.get('/top-articles', (req, res) => {
    const tags = ['war', 'religion', 'economy', 'tech', 'politics', 'world'];
    // Create a clause for each tag: domain_tags LIKE '%tag%'
    const whereClauses = tags.map(() => 'domain_tags LIKE ?').join(' OR ');
    const params = tags.map(tag => `%${tag}%`);

    const sql = `
      SELECT * FROM Articles
      WHERE ${whereClauses}
      ORDER BY published_at DESC
      LIMIT 5
    `;

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('Database query error for /top-articles:', err);
        return res.status(500).json([]);
      }
      res.json(results || []);
    });
  });

  // Critical articles - simplified query for now
  app.get('/critical-articles', (req, res) => {
    // First check if domain_tags column exists
    db.query("SHOW COLUMNS FROM Articles LIKE 'domain_tags'", (err, columns) => {
      if (err || columns.length === 0) {
        // If column doesn't exist, return empty array
        console.log('domain_tags column does not exist, returning empty array');
        return res.json([]);
      }
      
      // If column exists, query for critical articles
      db.query(`
        SELECT * FROM Articles 
        WHERE domain_tags IS NOT NULL
          AND domain_tags LIKE '%finance%' 
          AND domain_tags LIKE '%geopolitics%' 
          AND domain_tags LIKE '%religion%'
          AND (notified = FALSE OR notified IS NULL)
        ORDER BY created_at DESC 
        LIMIT 3
      `, (err, results) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json([]);
        }
        res.json(results || []);
      });
    });
  });

  // Return up to 3 critical articles (regardless of notified)
  app.get('/critical-articles-all', (req, res) => {
    const sql = `
      SELECT * FROM Articles
      WHERE domain_tags LIKE '%finance%'
        AND domain_tags LIKE '%geopolitics%'
        AND domain_tags LIKE '%religion%'
      ORDER BY created_at DESC
      LIMIT 3
    `;
    db.query(sql, (err, results) => {
      if (err) {
        console.error('critical-articles-all error', err);
        return res.status(500).json([]);
      }
      res.json(results || []);
    });
  });

  // Mark one article as read (notified=true) but still keep it in the list
  app.post('/articles/:id/mark-read', (req, res) => {
    const { id } = req.params;
    db.query(
      'UPDATE Articles SET notified = TRUE WHERE id = ?',
      [id],
      (err, result) => {
        if (err) {
          console.error('mark-read error', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
      }
    );
  });

  // Add test data endpoint
  app.get('/add-test-data', (req, res) => {
    const sql = `INSERT INTO Articles (title, url, source, published_at, created_at) VALUES 
      ('Global Markets Rally on Strong Economic Data', 'https://finance.yahoo.com/news/markets-rally', 'Yahoo Finance', NOW(), NOW()),
      ('Tech Stocks Surge After Earnings Beat', 'https://bloomberg.com/news/tech-surge', 'Bloomberg', NOW(), NOW()),
      ('Oil Prices Jump on Supply Concerns', 'https://reuters.com/business/energy/oil-prices', 'Reuters', NOW(), NOW()),
      ('Federal Reserve Hints at Rate Changes', 'https://wsj.com/articles/fed-rates', 'Wall Street Journal', NOW(), NOW()),
      ('Cryptocurrency Market Shows Volatility', 'https://coindesk.com/markets/crypto-vol', 'CoinDesk', NOW(), NOW())`;

    db.query(sql, (err, result) => {
      if (err) {
        console.error('Error adding test data:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log('✅ Added', result.affectedRows, 'test articles');
      res.json({ 
        message: 'Test data added successfully', 
        articlesAdded: result.affectedRows 
      });
    });
  });

  // Check table structure endpoint
  app.get('/check-table', (req, res) => {
    db.query('DESCRIBE Articles', (err, results) => {
      if (err) {
        console.error('Error checking table structure:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ columns: results });
    });
  });

  // Create/update table structure
  app.get('/setup-table', (req, res) => {
    // Drop and recreate table to ensure proper structure
    const dropTableSQL = `DROP TABLE IF EXISTS Articles`;
    
    db.query(dropTableSQL, (err) => {
      if (err) {
        console.error('Error dropping table:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const createTableSQL = `
        CREATE TABLE Articles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(500),
          url VARCHAR(1000),
          source VARCHAR(200),
          published_at DATETIME,
          domain_tags VARCHAR(200),
          summary TEXT,
          notified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

      db.query(createTableSQL, (err, result) => {
        if (err) {
          console.error('Error creating table:', err);
          return res.status(500).json({ error: err.message });
        }
        
        console.log('✅ Table Articles created successfully');
        res.json({ message: 'Table created successfully with proper structure' });
      });
    });
  });

  // Return up to 40 other articles, paginated
  app.get('/other-news', (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 40);
    const offset = (page - 1) * limit;

    const sql = `
      SELECT * FROM Articles
      ORDER BY published_at DESC
      LIMIT ? OFFSET ?
    `;
    db.query(sql, [limit, offset], (err, results) => {
      if (err) {
        console.error('other-news error', err);
        return res.status(500).json([]);
      }
      res.json(results || []);
    });
  });

  app.listen(5000, () => {
    console.log('Backend running on port 5000');
  });
}

connectWithRetry();