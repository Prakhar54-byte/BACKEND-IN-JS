import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app= express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
credentials: true,
allowedHeaders:true}
))

app.use(express.urlencoded({extended: true,limit: "16kb"}));


app.use(express.json({limit: "16kb "}));
app.use(express.static('public'));//Pdf files it will be stored in Public folder

app.use(cookieParser());



export default app;