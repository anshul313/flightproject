var app     = require('express')();
var httpm   = require('http');
var http    = httpm.Server(app);
var io      = require('socket.io')(http);
var url     = require('url');
var FCM     = require('fcm-push');
var util    = require('util');

var sockets     = {};
var auth_data   = null;
var serverKey   = 'AIzaSyAlEs8Uag-FVRJ-mSjqJIqZbg5x4vc5Tx0';
var fcm         = new FCM(serverKey);

var authentication_data   = '{"username":"admin","password":"assertively-scofflaw-elucidation"}';

var authentication_options  = {
  host  : 'auth.earthly58.hasura-app.io',
  port  : '80',
  path  : '/login',
  method: 'POST',
  headers : {
    'Content-Type'  : 'application/json',
    'Content-Length': Buffer.byteLength(authentication_data)
  } 
};

var authentication_req  = httpm.request(authentication_options,function(res){
  res.setEncoding('utf8');
  res.on('data', function(chunk){
    auth_data=JSON.parse(chunk);
  });
});

authentication_req.write(authentication_data);
authentication_req.end();

app.get('/',function(req,res){
  res.sendFile(__dirname+'/index.html');
});


io.on('connection',function(socket){
  console.log('User connected'+socket.id);
  var user = null;

  if (socket.handshake.headers['x-hasura-user-role']=='anonymous'){
     // send 403 message
     return;	
  }
  var user_id = socket.handshake.headers['x-hasura-user-id'];
  sockets[user_id] = socket;

  //socket.on('init', function(params){
  //  console.log(params);
  //  try{
  //    params = JSON.parse(params);
  //    sockets[params.from]=socket;
  //  }
  //  catch (e){
  //    console.log("Some error in User credentials");
  //  }   
  //});

  socket.on('chat message',function(params){
    // DEBUG
    console.log(socket.handshake.headers);
    
    try {
      params = JSON.parse(params);
      params.from = parseInt(user_id, 10);

      var msg = params.message;
      user = {from: params.from, to: params.to};

      var connection_check_data = '{"columns":["*"],"where":{"$or":[{"$and":[{"user1":'+user.from+'},{"user2":'+
      user.to+'}]},{"$and":[{"user1":'+user.to+'},{"user2":'+user.from+'} ]}]}}'

      var connection_check_options  = {
        host  : 'data.earthly58.hasura-app.io',
        port  : '80',
        path  : '/api/1/table/connections/select',
        method: 'POST',
        headers : {
          'Content-Type'  : 'application/json',
          'Content-Length': Buffer.byteLength(connection_check_data),
          'Authorization' : 'Hasura '+auth_data.auth_token
        } 
      };

      var connection_check_req  = httpm.request(connection_check_options,function(res){
        res.setEncoding('utf8');
        res.on('data', function(chunk){
          chunk=JSON.parse(chunk);
          var flag = chunk.length;

          if (flag==0) {
            socket.emit('chat message',"You don't have a connection with user");
          } else {

            var user1 = (user.from < user.to) ? user.from : user.to;
            var user2 = (user.from < user.to) ? user.to : user.from;
            var message_insert_data = JSON.stringify({objects:[{
              user1: user1,
              user2: user2,
              sender: user.from,
              text: msg,
              timestamp: (new Date()).toISOString()
            }]});

            var message_insert_options  = {
              host  : 'data.earthly58.hasura-app.io',
              port  : '80',
              path  : '/api/1/table/message/insert',
              method: 'POST',
              headers : {
                'Content-Type'  : 'application/json',
                'Content-Length': Buffer.byteLength(message_insert_data),
                'Authorization' : 'Hasura '+auth_data.auth_token
              }
            };

            var message_insert_req  = httpm.request(message_insert_options,function(res){
              res.setEncoding('utf8');
              res.on('data', function(chunk){
                console.log('msg_chunk: '+chunk);
              });
            });

            message_insert_req.write(message_insert_data);
            message_insert_req.end();

            console.log('message :'+msg);

            var toSocket = null;

            try {
             toSocket=sockets[user.to];
             //console.log('test :',toSocket);
             toSocket.emit('chat message','{"message":"'+msg+'"}');
            }
            catch(e) {
              var receiver_token = null;
              var token_data   = '{"columns":["device_token","name"],"where":{"id":'+user.to+'}}'

              //console.log('connection_check_data : '+connection_check_data);

              var token_options  = {
                host  : 'data.earthly58.hasura-app.io',
                port  : '80',
                path  : '/api/1/table/user/select',
                method: 'POST',
                headers : {
                  'Content-Type'  : 'application/json',
                  'Content-Length': Buffer.byteLength(token_data),
                  'Authorization' : 'Hasura '+auth_data.auth_token
                } 
              };

              var token_req  = httpm.request(token_options,function(res){
                res.setEncoding('utf8');
                res.on('data', function(chunk){
                 // chunk=JSON.stringify(chunk);
                  console.log(chunk);
                  chunk=JSON.parse(chunk);
                  receiver_token = chunk[0];

                  var message = {
                    to : receiver_token.device_token,
                    collapse_key : 'my_collapse_key',
                    data : {
                      from_user : user.from,
                      from_username : "Vedant",
                      message : msg,
                      type : "chat-notif"
                    }
                    //notification : {
                      //title: 'Levo',
                      //body : user.from+':'+msg
                    //}
                  };
                  
                  console.log(message.to);
                  fcm.send(message,function(err,res){
                    if(err){
                      console.log('err : ',err);
                      console.log('res : ',res);
                      console.log('Something has gone wrong !');
                    } else {
                      console.log('Successfully sent with response : ',res);
                    }
                  }); 
                });
              });

              token_req.write(token_data);
              token_req.end();

              /* */
              socket.emit('chat message','User not online');
            }
          }
        });
      });
      connection_check_req.write(connection_check_data);
      connection_check_req.end();      
    }
    catch(e){
      console.log("Some error in the 'chat message' event");
    }
  });

  socket.on('disconnect',function(){
    if(user){
      sockets[user.from]=null;
      console.log("User "+user.me+" disconnected");
    }
  });

});

http.listen(3000,function(){
  console.log('Listening on *:3000');
});
