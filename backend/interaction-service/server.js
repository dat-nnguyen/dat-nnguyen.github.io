const express = require('express');
const { Pool } = require('pg'); // PostgreSQL driver
const PORT = 5002;
const app = express();

app.use(express.json()); // allow Express to read JSON data from front-end

// connect to PostgreSQL database
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://admin:secretpassword@localhost:5432/interaction_db',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 3000,
});

// testing connection to database
if (require.main === module) {
  pool.connect()
    .then(() =>{ console.log('Connected successfully to PostgreSQL database'); })
    .catch(err => console.log(err));
}

// Init table
const initDb = async () => {
  const createTableText = `
        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            article_id VARCHAR(255) NOT NULL,
            author_name VARCHAR(100) NOT NULL,
            author_email VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS subscribers (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            unsubscribe_token VARCHAR(64) UNIQUE
        );
        CREATE TABLE IF NOT EXISTS sent_notifications (
            id SERIAL PRIMARY KEY,
            post_slug VARCHAR(255) NOT NULL,
            recipient_count INT DEFAULT 0,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
  try {
    await pool.query(createTableText);
    console.log('Comments and subscribers tables are ready.');
  } catch (err) {
    console.error('Error creating table:', err);
  }
};

const commentsRoutes = require('./routes/commentsRoutes')(pool);
const subscribersRoutes = require('./routes/subscribersRoutes')(pool);
app.use('/api/comments', commentsRoutes);
app.use('/api/subscribers', subscribersRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the interaction service!' });
});

if (require.main === module) {
  initDb()
    .then(() => console.log('Database initialization complete.'))
    .catch(err => console.error('Database initialization failed:', err));

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, pool, initDb };