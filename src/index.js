// require('dotenv').config({path:'../.env'})


import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { DB_NAME} from './constants.js'
import connectDB from "./db/index.js";
import {app} from './app.js'
// import {app} from './app.js'
dotenv.config({ path:"../.env"});


const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const isProd = process.env.NODE_ENV === 'production';

const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};




import videoProcessingQueue from './queues/videoProcessing.queue.js';

// ...

videoProcessingQueue?.on?.('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

videoProcessingQueue?.on?.('failed', (job, err) => {
    console.log(`Job ${job.id} has failed with ${err.message}`);
});

connectDB()
.then(()=>{
    const startServer = (port, attempt = 0) => {
        const server = app.listen(port, () => {
            console.log(`SERVER is running at port ${port}`);
            console.log(`MONGO DB IS CONNECTED TO ${DB_NAME}`);
        });

        // Prevent Node from crashing on common startup errors like EADDRINUSE.
        server.on('error', (err) => {
            if (err?.code === 'EADDRINUSE') {
                if (!isProd && attempt < 10) {
                    const nextPort = port + 1;
                    console.warn(`Port ${port} is already in use; trying ${nextPort}...`);
                    setTimeout(() => startServer(nextPort, attempt + 1), 200);
                    return;
                }
                console.error(`Port ${port} is already in use. Stop the other process or set a different PORT.`);
                process.exit(1);
            }
            console.error('Server error:', err);
            process.exit(1);
        });
    };

    startServer(Number.isFinite(DEFAULT_PORT) ? DEFAULT_PORT : 8080);
})
.catch((e)=>{
console.log("MONGODB CONNECTION FAILED !!!!!",e);
throw new Error(e);
})
