const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/content_db', {})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

app.use('/api/posts', postRoutes);
app.use('/api/about', aboutRoutes);

const PORT = 5001;
app.listen(PORT, () => console.log(`Content Service running on port ${PORT}`));