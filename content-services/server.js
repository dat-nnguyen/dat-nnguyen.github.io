const express = require('express'); // import express tool

const app = express(); // init app

const PORT = 5001; // define port that server will run on

app.get('/api/test', (req, res) => {
    res.json({ message: 'Hello World' })
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})