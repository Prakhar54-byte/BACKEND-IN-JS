import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        const dbName = process.env.NODE_ENV === 'test' ? `${DB_NAME}-test` : DB_NAME;
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${dbName}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB