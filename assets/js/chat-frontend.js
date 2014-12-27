/**
 * Frontend JavaScript for the NodeJS chat application
 *
 * @author  Nathan Johnson
 */

(function($) {

  var socket;
  var originalTitle = document.title;
  var unread = 0;

  var isTyping = false;
  var typingTimeout;
  var typingUsers = [];

  var isWindowFocused = false;
  var newMsgSound = new Audio("assets/sounds/alert.mp3");

  $(window).on('focus', function() {
    isWindowFocused = true;
    resetTitle();
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

  /**
   * Sets up the chat 
   * 
   * - Hides welcome
   * - Shows chat
   * - Binds chat form (submit and keydown)
   * 
   * @param  {string} nickname The nickname the user chose
   */
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

  /**
   * Called when a user begins typing in the text field,
   * it will tell socket.io that the user has begun 
   * if they're not already typing. If they are already
   * typing it will simply clear the timeout.
   * 
   * @param  {object} e The event object from jQuery keydown callback
   */
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

  /**
   * Sends a message to socket.io that the user stopped typing
   */
  function typingTimeoutFunction() {
    isTyping = false;
    socket.emit('stop typing');
  }

  /**
   * Displays a list of users typing above the message text field
   */
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

  /**
   * Create all of the socket event listeners
   */
  function bindSocketEvents() {

    socket.on('chat message', function(data) {
      appendMessage(data, false);
      titleCount();
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

  // Window title functions
  
  /** Reset title to original and make unread 0 */
  function resetTitle() {
    unread = 0;
    changeTitle(originalTitle);
  }

  /**
   * Changes the title
   * @param  {string} title The new title
   */
  function changeTitle(title) {
    document.title = title;
  }

  /**
   * Puts a count of unread messages into the title
   */
  function titleCount() {
    if(!isWindowFocused) unread++;
    if(unread > 0) {
      changeTitle('(' + unread + ') ' + originalTitle);
    }
    else {
      resetTitle();
    }
  }

  /**
   * Appends a message to the chat box
   * @param  {array} data Data from the server side JS
   * @param  {boolean} sentByMe Whether or not the current user sent it
   */
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

  /**
   * Takes array of users and puts them into the online list
   * @param  {array} users A list of users online
   */
  function listOnlineUsers(users) {
    var onlineUl = $('#online ul');
    onlineUl.html('');

    for(var i = 0; i < users.length; ++i) {
      var user = users[i];
      var li = $('<li>').text(user);
      onlineUl.append(li);
    }

    if(!$('#online').is(':visible')) {
      $('#online').fadeIn();
    }
    
  }

  /**
   * Plays the chat sound
   */
  function playSound() {
    if(!isWindowFocused) newMsgSound.play();
  }

  /**
   * Scroll to the bottom of the messages box
   */
  function scrollBottom() {
    var chatEle = document.getElementById("chat");
    $('#messages').animate({ scrollTop: $('#messages')[0].scrollHeight }, 1);
  }

  // Helper functions

  /**
   * Cleans an array by removing undefined elememts
   * @param  {array} actual The actual array
   * @return {array} A new, "clean" array
   */
  function cleanArray(actual){
    var newArray = new Array();
    for(var i = 0; i<actual.length; i++){
        if (actual[i]){
          newArray.push(actual[i]);
      }
    }
    return newArray;
  }

  /**
   * Converts an array into a sentence
   *
   * Examples:
   * [John] => "John"
   * [John,Jane] => "John and Jane"
   * [John,Jane,Bob] => "John, Jane, and Bob"
   * 
   * @param  {array} source The source array
   * @return {string} A sentence formed from array
   */
  function array2Sentence(source) {
    var arr = cleanArray(source);
    var len = arr.length;
    if(len < 1) return;
    if(len === 1) return arr[0];
    if(len === 2) return arr[0] + ' and ' + arr[1];
    arr[len-1] = 'and '+arr[len-1];
    return arr.join(', ');
  }

  /**
   * Takes a string and converts special characters into their html entities
   * @param  {string} str A string
   * @return {string} String with special chars html entities
   */
  function htmlentities(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})(jQuery);