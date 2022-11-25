const express = require('express');
const cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;


app.get('/', (req, res) => {
    res.send('Used Product Sale Sites server is running')
})

app.listen(port, () => {
    console.log(`Used Product Sale Sites server running on ${port}`);
})