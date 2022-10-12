require('dotenv').config()
console.log(process.env.STRIPE_SECRET_KEY)
const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cors = require('cors')
const port = process.env.PORT || 5000;
app.use(express.json())
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY )
app.use(
  cors({
  origin: "https://hasbro-3af86.web.app",
 
  })
  )

const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
  app.use(cors(corsConfig))
  app.options("*", cors(corsConfig))
  app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,authorization")
  next()
  })




const { MongoClient, ServerApiVersion,ObjectId, Transaction } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kcfgl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req,res,next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message:'Unauthorized Access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,function(err,decoded){
        if(err){
            return res.status(403).send({message:'Forbidden Access'})
        }
        req.decoded=decoded;
        next(); // at middle tire it start his life cycle
    })
}

// console.log(uri);
async function run(){
    try{
        await client.connect();
        console.log('db connected')
        const productsCollection = client.db('tools-manufacture').collection("products");
        const userCollection = client.db('tools-manufacture').collection("users"); 
        const orderCollection = client.db('tools-manufacture').collection("orders"); 
        const reviewCollection = client.db('tools-manufacture').collection("reviews"); 
        const profileCollection = client.db('tools-manufacture').collection("profiles"); 
        const paymentCollection = client.db('tools-manufacture').collection("payments"); 
      //get all products
        app.get('/products',async(req,res)=>{
            const query={};
            const cursor = productsCollection.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })



        app.delete('/products/:id',async(req,res)=>{
          const id = req.params.id;
          const query = {_id:ObjectId(id)};
          const result= await productsCollection.deleteOne(query);
          res.send(result)
      })

        //post a Product
        app.post('/products',async(req,res)=>{
          const addProduct = req.body;
          // console.log(addProduct)
          const result = await productsCollection.insertOne(addProduct)
          res.send(result)
      })


           // get single Product
           app.get('/products/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result= await productsCollection.findOne(query);
            res.send(result)
          })

          //users

          app.get('/user',verifyJWT,async(req,res)=>{
              const users = await userCollection.find().toArray()
              res.send(users)
          })


          app.put('/user/admin/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({email:requester});
            if(requesterAccount.role ==='admin'){
              const filter = {email:email};
              const updateDoc = {
                $set:{role: 'admin'},
              };
              const result = await userCollection.updateOne(filter,updateDoc);
              res.send(result)
            }
            else{
              res.status(403).send({message: 'Forbidden'})
            }
           
            })

      
   


          app.get('/admin/:email',verifyJWT,async(req,res)=>{
              const email =req.params.email;
              const user = await userCollection.findOne({email:email})
              const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin})
          
          })



          app.put('/user/:email',async(req,res)=>{
              const email = req.params.email;
              const user = req.body;
              const filter={email:email};
              const options = { upsert: true };
              const updateDoc = {
                $set: user,
              };
              const result = await userCollection.updateOne(filter,updateDoc,options)
              const token = jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
              res.send({result,token})
          })


          app.delete('/user/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result= await userCollection.deleteOne(query);
            res.send(result)
  
          })




          //Order
          app.post('/order',async(req,res)=>{
            const purchaseOrder = req.body;
            const result = await orderCollection.insertOne(purchaseOrder)
            res.send(result)
        })

        app.get('/order',async(req,res)=>{
          const query={};
          const cursor = orderCollection.find(query);
          const result = await cursor.toArray()
          res.send(result)
      })



      
        app.get('/order/:email', verifyJWT, async(req,res)=>{
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            console.log(decodedEmail);
            console.log(email);
            if(email === decodedEmail){
              const query={email:email}
              const orders = await orderCollection.find(query).toArray()
             return res.send(orders)
            }
           else{
               return res.status(403).send({message:'Forbidden Access'})
           }
        })

        
        app.put('/order/:id',verifyJWT,async(req,res)=>{
          const id = req.params.id;
          console.log(id);
          const status = req.body;
          console.log(status);
          const filter={_id:ObjectId(id)};
          const options = { upsert: true };
          const updateDoc = {
            $set: status,
          };
          const result = await orderCollection.updateOne(filter,updateDoc,options)
          res.send(result)
      })

        app.patch('/order/:id',async(req,res)=>{
          const id = req.params.id;
          const payment= req.body;
          console.log(payment);
          const filter = {_id:ObjectId(id)};
          const updateDoc = {
            $set:{
              paid:true,
              transactionId: payment.transactionId,
              status:'pending'
            }
          }
          const updatedOrder = await orderCollection.updateOne(filter,updateDoc)
          const result= await paymentCollection.insertOne(updatedOrder)

          res.send(updateDoc)


        })

        app.get('/paymentorder/:id',verifyJWT,async(req,res)=>{
          const id = req.params.id;
          const query = {_id:ObjectId(id)}
          const order = await orderCollection.findOne(query);
          res.send(order)
        })

        app.delete('/order/:id',async(req,res)=>{
          const id = req.params.id;
          const query = {_id:ObjectId(id)};
          const result= await orderCollection.deleteOne(query);
          res.send(result)

        })

        app.get('/orders',verifyJWT, async(req,res)=>{
          const orders = await orderCollection.find({}).toArray()
          res.send(orders)
        })

          //PAYMENT
            app.post('/create-payment-intent',async(req,res)=>{
              const order = req.body;
    
              const price = order.totalPrice 
              // console.log(price)
              const amount = parseInt(price)*100;
              const paymentIntent = await stripe.paymentIntents.create({
                amount : amount,
                currency: 'INR',
                payment_method_types:['card']
              });
              res.send({clientSecret:paymentIntent.client_secret})
              console.log(paymentIntent.client_secret);
            })
            // review
             app.post('/review',async(req,res)=>{
              const addReview = req.body;
              const result = await reviewCollection.insertOne(addReview)
              res.send(result)
             })

             app.get('/review',async(req,res)=>{
              const review = await reviewCollection.find({}).toArray()
              res.send(review)
             })

             //Profiles

             app.put('/profile/:email',async(req,res)=>{
              const userProfile = req.body;
              const email = req.params.email;
              const filter={email:email};
              const options = { upsert: true };
              const updateDoc = {
                $set: userProfile,
              };
              const result = await profileCollection.updateOne(filter,updateDoc,options)
              res.send(result)
             })

             app.get('/profile/:email', async(req,res)=>{
              const email =req.params.email;
              const user = await profileCollection.findOne({email:email})
              res.send(user)
             })





    }
    finally{

    }
}
run().catch(console.dir)

app.get('/',(req,res)=>{
  res.send('hello')
})
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })


