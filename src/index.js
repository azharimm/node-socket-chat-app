const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const PORT = process.env.PORT || 3000;
const Filter = require('bad-words');
const {generateMessage, generateUrlMessage} = require('./utils/messages');
const {addUser, removeUser, getUser, getUserInRoom} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const public_dir = path.join(__dirname,'../public');

app.use(express.static(public_dir));

io.on('connection', (socket)=>{
    console.log('New WebSocket Connection');
    socket.on('join', ({username, room}, callback)=>{
        const {error, user} = addUser({id:socket.id, username, room});

        if(error){
            return callback(error);
        }
        socket.join(user.room);
        socket.emit('message', generateMessage('Welcome!', 'Administrator'));
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room:user.room,
            users:getUserInRoom(user.room)
        });
        callback();
    });

    socket.on('sendMessage', (message, callback)=>{
        const filter = new Filter()
        const {room, username} = getUser(socket.id);
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!');
        };
        io.to(room).emit('message', generateMessage(message, username));
        callback();
    });

    socket.on('sendLocation',(position, callback) =>{
        const {room, username} = getUser(socket.id);

        io.to(room).emit('locationMessage',generateUrlMessage(`https://google.com/maps?q=${position.latitude},${position.longitude}`, username));
        callback();
    });

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id);
        if(user){
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room:user.room,
                users: getUserInRoom(user.room)
            });
        }
    });
});

server.listen(PORT, () => console.log(`app running on port ${PORT}`));