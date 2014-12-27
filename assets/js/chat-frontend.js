(function($) {

  var originalTitle = window.title;
  var socket;
  var unread = 0;

  var isTyping = false;
  var typingTimeout;
  var typingUsers = [];

  var isWindowFocused = false;
  var sound = new Audio("assets/sounds/alert.mp3");

  $(window).on('focus', function() {
    isWindowFocused = true;
  });

  $(window).on('blur', function() {
    isWindowFocused = false;
  });

  $('#set-nickname form').submit(function() {
    var nickname = $.trim($('input', this).val());
    if(nickname == '') return false;
    joinChat(nickname);
    return false;
  });

  function joinChat(nickname) {

    socket = io();
    socket.emit('user join', nickname);

    $('#nickname').show();
    $('#nickname b').text(nickname);

    $('#set-nickname').hide();
    $('#chat').show();
    $('#chat input').focus();

    bindSocketEvents();

    $('#chat form').submit(function(){
      var input = $('input', this);
      var msg = $.trim(htmlentities(input.val()));
      if(msg == '') {
        return false;
      }

      var data = { nickname: nickname, msg: msg };
      socket.emit('chat message', data);
      appendMessage(data, true);

      input.val('');
      return false;
    });

    $('#chat input').on('keydown', beginTyping);

  }

  function beginTyping(e) {
    if(e.which === 13) return;
    if(isTyping === false) {
      isTyping = true;
      socket.emit('begin typing');
      timeout = setTimeout(typingTimeoutFunction, 1500);
    }
    else {
      clearTimeout(timeout);
      timeout = setTimeout(typingTimeoutFunction, 1500);
    }
  }
  function typingTimeoutFunction() {
    isTyping = false;
    socket.emit('stop typing');
  }
  function displayTypingUsers() {
    typingUsers = cleanArray(typingUsers);
    if(typingUsers.length < 1) {
      $('#typing').text('');
      return false;
    }
    var users = array2Sentence(typingUsers);
    var article = typingUsers.length === 1 ? 'is' : 'are';
    $('#typing').text(users+' '+article+' typing...');
  }

  function bindSocketEvents() {

    socket.on('chat message', function(data) {
      appendMessage(data, false);
    });

    socket.on('status', function(data) {
      var text = '';
      switch(data.type) {
        case 'join':
          text = 'has joined the chat room.';
        break;
        case 'leave':
          text = 'has left the chat room.';
        break;
      }
      var msg = '<b>'+data.nickname+'</b> ' + text;
      var li = $('<li>').html(msg).addClass('status');
      $('#messages').append(li);
      scrollBottom();
      listOnlineUsers(data.allUsers);
    });

    socket.on('begin typing', function(nickname) {
      typingUsers.push(nickname);
      displayTypingUsers();
    });

    socket.on('stop typing', function(nickname) {
      var i = typingUsers.indexOf(nickname);
      typingUsers.splice(i, 1);
      displayTypingUsers();
    });

  }

  function appendMessage(data, sentByMe) {
    var li = $('<li>')
             .css('display','none')
             .append(
               $('<div>').addClass('name').text(data.nickname)
             )
             .append(data.msg);

    if(sentByMe) {
      li.addClass('by-me');
    }
    else {
      playSound();
    }

    $('#messages').append(li);
    li.fadeIn(200, function() {
      scrollBottom();
    });

  }

  function listOnlineUsers(users) {
    var onlineUl = $('#online ul');
    onlineUl.html('');
    console.log(users);
    
    for(var i = 0; i < users.length; ++i) {
      var user = users[i];
      var li = $('<li>').text(user);
      onlineUl.append(li);
    }

    if(!$('#online').is(':visible')) {
      $('#online').fadeIn();
    }
    
  }

  function playSound() {
    if(!isWindowFocused) sound.play();
  }

  function scrollBottom() {
    var chatEle = document.getElementById("chat");
    $('#messages').animate({ scrollTop: $('#messages')[0].scrollHeight }, 500);
  }

  function cleanArray(actual){
    var newArray = new Array();
    for(var i = 0; i<actual.length; i++){
        if (actual[i]){
          newArray.push(actual[i]);
      }
    }
    return newArray;
  }

  function array2Sentence(source) {
    var arr = cleanArray(source);
    var len = arr.length;
    if(len < 1) return;
    if(len === 1) return arr[0];
    if(len === 2) return arr[0] + ' and ' + arr[1];
    arr[len-1] = 'and '+arr[len-1];
    return arr.join(', ');
  }

  function htmlentities(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})(jQuery);