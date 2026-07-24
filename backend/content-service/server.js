const express = require('express');
const cors = require('cors');

const postRoutes = require('./routes/postRoutes');
const aboutRoutes = require('./routes/aboutRoutes');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/posts', postRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/projects', projectRoutes);

const PORT = 5001;
app.listen(PORT, () => console.log(`Content Service running on port ${PORT}`));