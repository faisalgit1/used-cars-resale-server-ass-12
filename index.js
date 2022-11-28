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

// verify jwt 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    // console.log('auhthed',authHeader);
    if (!authHeader) {
        return res.status(401).send({ message: 'Unathorized Access' })
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            console.log(err)
            return res.status(403).send({ message: 'Unathorized Access' })
        }
        req.decoded = decoded;
        next()
    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.5bfvhe8.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const usersCollection = client.db('resaleProducts').collection('users')
        const carCollection = client.db('resaleProducts').collection('cars')
        const categoryCollection = client.db('resaleProducts').collection('carCategories')

        // Verify Seller 
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== "Seller") {
                return res.status(403).send({ message: "Seller Forbiddn Access" });
            }
            next();
        };
        app.put("/user/:email", async (req, res) => {
            try {
                const email = req.params.email;

                // check the req
                const query = { email: email }
                const existingUser = await usersCollection.findOne(query)

                if (existingUser) {
                    const token = jwt.sign(
                        { email: email },
                        process.env.ACCESS_TOKEN_SECRET,
                        { expiresIn: "1d" }
                    )
                    return res.send({ data: token })
                }

                else {

                    const user = req.body;
                    const filter = { email: email };
                    const options = { upsert: true };
                    const updateDoc = {
                        $set: user
                    }
                    const result = await usersCollection.updateOne(filter, updateDoc, options);

                    // token generate 
                    const token = jwt.sign(
                        { email: email },
                        process.env.ACCESS_TOKEN_SECRET,
                        { expiresIn: "1d" }
                    )
                    return res.send({ data: token })

                }

            }
            catch (err) {
                console.log(err)
            }
        })
        app.get('/users', async (req, res) => {

            let query = {}
            const result = await usersCollection.find(query).toArray();
            res.send(result)
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