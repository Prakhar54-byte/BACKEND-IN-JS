require('dotenv').config({path:'./.env'})


import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { DB_NAME} from './constants.js'
import connectDB from "./db/index.js";
import {app} from './app.js'
// import {app} from './app.js'
dotenv.config({ path:"BACKEND/.env"});




connectDB()
.then(()=>{
    app.on("error",(e)=>{
        console.log('Error',e);
        throw new Error(e);
        
    })

    app.listen(process.env.PORT || 8000,()=>{
        console.log(`SERVER is running at port ${process.env.PORT}`);
        console.log(`MONGO DB IS CONNECTED TO ${DB_NAME}`);
            
    })
})
.catch((e)=>{
console.log("MONGODB CONNECTION FAILED !!!!!",e);
throw new Error(e);
})
