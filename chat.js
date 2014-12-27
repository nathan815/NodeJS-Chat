var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname));

http.listen(process.env.PORT || 3000, function() {
  console.log('listening on *:3000');
});

var allClients = [];
var nicknames = [];

io.sockets.on('connection', function(socket){

  allClients.push(socket);
  var i = allClients.indexOf(socket);
  var user = allClients[i];

  // When a user disconnects
  socket.on('disconnect', function() {
    var nickname = user['nickname'];
    stopTyping();
    allClients.splice(i,1);
    nicknames.splice(nicknames.indexOf(nickname),1);
    io.emit('status', { type: 'leave', nickname: nickname, allUsers: nicknames });
  });

  // When a user joins
  socket.on('user join', function(nickname) {
    user['nickname'] = nickname;
    nicknames.push(nickname);
    io.sockets.emit('status', { type: 'join', nickname: nickname, allUsers: nicknames });
  });

  // Functions for typing system
  var beginTyping = function() {
    var nickname = user['nickname'];
    socket.broadcast.emit('begin typing', nickname);
  };

  var stopTyping = function() {
    var nickname = user['nickname'];
    socket.broadcast.emit('stop typing', nickname);
  };

  // When someone begins typing
  socket.on('begin typing', beginTyping);

  // When someone stops typing
  socket.on('stop typing', stopTyping);

  // Chat message sent
  socket.on('chat message', function(data) {
    socket.broadcast.emit('chat message', data);
  });

});