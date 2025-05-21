import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async () => {
    try {
        const dbUrl = process.env.MONGODB_URL;
        
        if (!dbUrl) {
            console.error("MONGODB_URL is not defined in environment variables");
            process.exit(1);
        }
        
        const connectionInstance = await mongoose.connect(dbUrl);
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
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
