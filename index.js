const express = require('express');
const cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();


// middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.5bfvhe8.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            console.log(token);
            res.send({ token })
        })
    }
    finally {

    }
}
run().catch(err => console.error(err));

app.get('/', (req, res) => {
    res.send('Used Product Sale Sites server is running')
})

app.listen(port, () => {
    console.log(`Used Product Sale Sites server running on ${port}`);
})