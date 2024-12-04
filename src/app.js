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
console.log("app 1");

app.use(express.json({limit: "16kb "}));
console.log("app 2");
app.use(express.static('public'));//Pdf files it will be stored in Public folder
console.log("app 3");
app.use(cookieParser());
console.log("app 4");


// routes import 
import userRouter from "./routers/user.routes.js";




//routes declaration 
app.use("/api/v1/users", userRouter);




//  https://localhost:8000//api/v1/users/register
console.log("app.js is running");


export  {app};