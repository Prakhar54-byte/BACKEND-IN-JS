// require('dotenv').config({path:'./config.env'})

import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from "./app.js";

// import {app} from './app.js'
dotenv.config({
    path: "/.env"
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT || 5000,()=>{
        console.log(`SERVER is running at port ${process.env.PORT}`);
        
    })
})
.catch((e)=>{
console.log("MONOGODB CONNECTION FAILED !!!!!",e);
    
})
