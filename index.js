const express = require('express');
const cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
        const bookingCarCollection = client.db('resaleProducts').collection('bookingcars')
        const allCheckOutCollection = client.db('resaleProducts').collection('checkout')

        // verify Admin
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== "admin") {
                return res.status(403).send({ message: "Admin Forbiddn Access" });
            }
            next();
        };
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
        app.put('/verifyseller', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.query.email;
            const filter = {
                email: email
            }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    verifySeller: true,
                }
            }

            const result = await usersCollection.updateOne(filter, updateDoc, option)
            res.send(result)

        })

        // make  user admin 
        app.put('/user/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, option)
            res.send(result)
        })

        app.put("/user/:email", async (req, res) => {
            try {
                const email = req.params.email;

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
        app.get('/user', async (req, res) => {

            let query = {}
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        // Hooks Api
        app.get('/user/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            res.send({ isSeller: user.role === 'Seller' })
        })
        // Adimin
        app.delete('/user/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })
        // Check Admin 
        app.get("/user/admin/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user.role === 'admin' });
        });
        // Check buyer
        app.get('/user/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            res.send({ isSeller: user.role === 'Buyer' })
        })

        // -------- Cars Api -------- 
        // Cars Catagory
        app.get('/categories', async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/addcars', verifyJWT, verifySeller, async (req, res) => {

            const body = req.body;
            const result = await carCollection.insertOne(body);
            res.send(result)

        })

        app.get('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const query = {

                catagoryId
                    : id
            }
            const result = await carCollection.find(query).toArray();
            res.send(result)
        })
        // advertise car
        app.get('/alladvertisecar', async (req, res) => {
            const query = {}
            const result = await carCollection.find(query).toArray()
            res.send(result)
        })

        // get car by user email
        app.get('/allcars', async (req, res) => {
            const email = req.query.email;
            const query = {
                sellerEmail: email
            };
            const cars = await carCollection.find(query).toArray()
            res.send(cars)
        })


        app.put('/advertiseCar/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    advertise: 'true'
                }
            }
            const result = await carCollection.updateOne(filter, updateDoc, option);

            res.send(result)
        })
        // sold car api
        app.put('/car/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true };
            const updatedoc = {
                $set: {
                    status: 'sold',
                    advertise: 'false',
                }
            }
            const result = await carCollection.updateOne(filter, updatedoc, option);
            res.send(result)
        })
        //-------------- Booking Cars ------------
        app.post('/book', async (req, res) => {
            const body = req.body;
            const result = await bookingCarCollection.insertOne(body)
            res.send(result);

        })
        app.get('/booked', verifyJWT, async (req, res) => {

            const decoded = req.decoded;

            if (decoded.email !== req.query.email) {
                console.log('forbidden Access')
                res.status(403).send({ message: 'Forbidend access' })
            }

            const email = req.query.email;
            const query = {
                buyerEmail: email
            }
            const result = await bookingCarCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/buyers', async (req, res) => {
            const email = req.query.email;
            const query = {
                sellerEmail: email

            }

            const result = await bookingCarCollection.find(query).toArray()
            res.send(result)

        })
        // delete car api
        app.delete('/car/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await carCollection.deleteOne(query);
            res.send(result)
        })

        app.put('/reported/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    reported: 'true',
                }
            }
            const result = await carCollection.updateMany(filter, updateDoc, option)
            res.send(result)
        })
        app.get("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingCarCollection.findOne(query);
            res.send(result);
        });

        // Strip Api

        app.post("/create-checkout-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.carPrice;
            const amount = parseInt(price) * 100;
            console.log(price)
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,

                "payment_method_types": ["card"],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // CheckOut 
        app.post('/checkout', async (req, res) => {
            const body = req.body;
            const id = body.bookingID;
            // const filter = { id: ObjectId(id) }
            const carcollectionQuery = { _id: ObjectId(id) }
            const bookedCarQuery = {
                carId: id
            }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    paid: 'true',
                }
            }
            const updateCarCollection = await carCollection.updateOne(carcollectionQuery, updateDoc, option)
            const updatebookingCollection = await bookingCarCollection.updateOne(bookedCarQuery, updateDoc, option)
            const result = await allCheckOutCollection.insertOne(body)
            res.send(result)
        })
    }
    finally {

    }
}
run().catch(err => console.error(err));

app.get('/', (req, res) => {
    res.send('Used Cars Sale Sites server is running')
})

app.listen(port, () => {
    console.log(`Used Product Sale Sites server running on ${port}`);
})