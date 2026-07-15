const express = require('express');
const mongoose = require('mongoose');
const articleRoutes = require('./routes/postRoutes');
const app = express();
const port = 5001;

app.use(express.json()); // allow Express to read JSON data from front-end
app.use('/api/articles', articleRoutes);

//connect to MONGOOSE
mongoose.connect('mongodb://localhost:27017/content_db')
  .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
  .catch(err => console.log("Cannot connect to database:", err));

app.get('/', (req, res) => res.send(''));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));