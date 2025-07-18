// require('dotenv').config({path:'../.env'})


import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { DB_NAME} from './constants.js'
import connectDB from "./db/index.js";
import {app} from './app.js'
// import {app} from './app.js'
dotenv.config({ path:"../.env"});


const PORT = process.env.PORT || 8080;

const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};




connectDB()
.then(()=>{
    app.on("error",(e)=>{
        console.log('Error',e);
        throw new Error(e);
        
    })

   // Change the port to 8080 or another free port
app.listen(process.env.PORT || 8080, () => {
    console.log(`SERVER is running at port ${process.env.PORT || 8080}`);
    console.log(`MONGO DB IS CONNECTED TO ${DB_NAME}`);
});
})
.catch((e)=>{
console.log("MONGODB CONNECTION FAILED !!!!!",e);
throw new Error(e);
})
