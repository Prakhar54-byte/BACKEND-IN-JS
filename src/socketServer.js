import { Server } from "socket.io";
import { app,server } from "../app.js";

import { dashboardEventEmitter} from "./eventEmitter.js"
import { log } from "node:console";
import { channel } from "node:diagnostics_channel";


const io = new Server(server,{
    cors:{
        origin: process.env.CORS_ORIGIN,
        credentials:true,
    }
})

console.log("Socket.IO server init...");


io.on('connection',(socket)=>{
    console.log(`New client connected: ${socket.id}`);


    socket.on('joinRoom',(channelId)=>{
        const roomName = `dashboard_${channelId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room: ${roomName}`);
    })

    socket.on('disconnect',()=>{
        console.log(`Client disconnected: ${socket.id}`);
    })
})



dashboardEventEmitter.on('stats_updated',({ channelId, stats })=>{
    const roomName = `dashboard_${channelId}`;
    console.log(`Emitting stats update to room: ${roomName}`);
    io.to(roomName).emit('stats_update', stats);
})


export {io};