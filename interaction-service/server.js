const express = require('express');
const { Pool } = require('pg'); // PostgreSQL driver
const PORT = 5002;
const app = express();

app.use(express.json()); // allow Express to read JSON data from front-end

// connect to PostgreSQL database
const pool = new Pool({
  connectionString:
    'postgresql://admin:secretpassword@localhost:5432/interaction_db',
});

// testing connection to database
pool.connect()
  .then(() =>{ console.log('Connected successfully to PostgreSQL database'); })
  .catch(err => console.log(err))

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
    `;
  try {
    await pool.query(createTableText);
    console.log('Comments table is ready.');
  } catch (err) {
    console.error('Error creating table:', err);
  }
};

initDb()
  .then(() => console.log('Database initialization complete.'))
  .catch(err => console.error('Database initialization failed:', err));

const commentsRoutes = require('./routes/commentsRoutes')(pool);
app.use('/api/comments', commentsRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the interaction service!' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));