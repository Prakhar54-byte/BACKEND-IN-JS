import mongoose from "mongoose";
import { DB_NAME } from "BACKEND/src/constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        // console.log("This is connectionInstance",connectionInstance);
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
        connectDB();
        // debugger;

    } catch (error) {
        console.log("MONGODB connection FAILED !!! index", error);
        process.exit(1);
        
    }
    
}


export default connectDB;








/*
import express from "express";
const app = express();

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB

*/
