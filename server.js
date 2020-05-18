const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages'); 
const { userJoin, getCurrentUser, userLeave, getRoomUsers} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

const botName = '🤖 System';

//Run when client connects
io.on('connection', socket => {

    socket.on('joinRoom', ({ username, room }) => {
        
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

    //Message to welcome current user: socket.emit()
    socket.emit('message', formatMessage(botName, `Welcome to the chat, <span class='username'>${user.username}</span> ~${user.id.substring(0, 6)}.`));

    //Message to everybody except the new client: broadcast.emit()
    socket.broadcast.to(user.room).emit('message', formatMessage(botName, `<span class='username'>${user.username}</span> ~${user.id.substring(0, 6)} has joined the chat`));

    //Send users and room info
    io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
        });
    });

    //Listen for chat messages
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg, user.id.substring(0, 6))) 
    });    

    //When client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if(user) {
            io.to(user.room).emit('message', formatMessage(botName,`<span class='username'>${user.username}</span> ~${socket.id.substring(0, 6)} has left the chat`));

            //Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
                });
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));