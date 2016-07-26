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


app.post('/checkin',function(req,res){

	req.on('data',function(chunk){

		chunk=JSON.parse(chunk);
		
		var user1 = (chunk.from < chunk.to) ? chunk.from : chunk.to;
		var user2 = (chunk.from < chunk.to) ? chunk.to : chunk.from;
        var initiator = chunk.from;
        var receiver = chunk.to;
        var flight = chunk.flight_id;
        var flight_time = chunk.flight_time;
        var initiator_username = chunk.from_username;
        var request_type = chunk.request_type;

        if(request_type=="checkin_req"){

	        var flight_number = "";

	        var get_flight_number_data = '{"columns":["number"],"where":{"id":'+flight+'}}';
	        var get_flight_number_options = {
		       	host : 'data.earthly58.hasura-app.io',
		       	port : '80',
		       	path : '/api/1/table/flight/select',
		       	method : 'POST',
		       	headers : {
		       		'Content-Type' : 'application/json',
		       		'Content-Length' : Buffer.byteLength(get_flight_number_data),
		       		'Authorization' : 'Hasura '+auth_data.auth_token
		       	}	
	        };

	        var get_flight_number_req = httpm.request(get_flight_number_options,function(res){
	        	res.setEncoding('utf8');
	        	res.on('data',function(chunk){
	        		chunk=JSON.parse(chunk);
	        		if(chunk.length>0){
	        			flight_number += chunk[0].number;
	        		}

					var checkin_insert_data = JSON.stringify({objects:[{
			        	user1 : user1,
			        	user2 : user2,
			        	initiator : initiator,
			        	flight : flight,
			        	flight_number : flight_number,
			        	created : (new Date()).toISOString(),
			        	flight_time : flight_time
			        }]});

			        var checkin_insert_options = {
			        	host : 'data.earthly58.hasura-app.io',
			        	port : '80',
			        	path : '/api/1/table/checkin/insert',
			        	method : 'POST',
			        	headers : {
			        		'Content-Type' : 'application/json',
			        		'Content-Length' : Buffer.byteLength(checkin_insert_data),
			        		'Authorization' : 'Hasura '+auth_data.auth_token
			        	}
			        };

			        var checkin_insert_req = httpm.request(checkin_insert_options,function(res) {
			        	res.setEncoding('utf8');
			        	res.on('data',function(chunk){
			        		console.log('check-in insert response : ',chunk);
			        	});
			        });

			        checkin_insert_req.write(checkin_insert_data);
			        checkin_insert_req.end();
	       		});
	       	});

	       	get_flight_number_req.write(get_flight_number_data);
	       	get_flight_number_req.end();

			var receiver_token = null;
			var notification_data = '{"columns":["device_token","device_type"],"where":{"id":'+receiver+'}}';

			console.log("notification_data :",notification_data);
					
			var notification_options = {
				host : 'data.earthly58.hasura-app.io',
				port : '80',
				path : '/api/1/table/user/select',
				method: 'POST',
				headers : {
					'Content-Type' : 'application/json',
					'Content-Length': Buffer.byteLength(notification_data),
					'Authorization' : 'Hasura '+auth_data.auth_token
				}
			};

			var notification_req = httpm.request(notification_options,function(res){
				res.setEncoding('utf8');
				res.on('data',function(chunk){
					chunk=JSON.parse(chunk);
					receiver_token=chunk[0];

					var message = {
						to : receiver_token.device_token,
						collapse_key : 'my_collapse_key',
						data : {
							from_user : initiator,
							from_username : initiator_username,
							type : "checkin_req"
						}
					};

					if(receiver_token.device_type!="ios"){
						fcm.send(message,function(err,res){
							if(err){
								console.log('err : ',err);
								console.log('res : ',res);
							} else {
								console.log('Successfully sent notification with response : '+res+'to : '+receiver_token.device_token);
							}
						});	
					}
				});
			});

			notification_req.write(notification_data);
			notification_req.end();
        } else {
        	var accept_status=false;
        	if(request_type=="accepted"){
        		accept_status=true;
        	}

        	var update_data = JSON.stringify({
        		values : {
        			accepted : accept_status
        		},
        		where : {
        			user1 : user1,
        			user2 : user2,
        			initiator : initiator,
        			flight : flight,
        			flight_time : flight_time
        		}
        	});

        	var update_options = {
        		host : 'data.earthly58.hasura-app.io',
				port : '80',
				path : '/api/1/table/checkin/update',
				method: 'POST',
				headers : {
					'Content-Type' : 'application/json',
					'Content-Length': Buffer.byteLength(update_data),
					'Authorization' : 'Hasura '+auth_data.auth_token
				}
        	};

        	var update_req = httpm.request(update_options,function(res){
        		res.setEncoding('utf8');
        		res.on('data',function(chunk){
        			console.log(chunk);
        		});
        	});
        	update_req.write(update_data);
        	update_req.end();

        }
	});
	res.send("Successfully Executed !");
});

app.post('/like',function(req,res){

	var user = null;
	req.on('data',function(chunk){
		chunk=JSON.parse(chunk);
		user={from: chunk.from_user, to: chunk.to_user, from_username: chunk.from_username, to_username: chunk.to_username};

		var like_insert_data = JSON.stringify({objects:[{
	        user1: user.from,
	        user2: user.to,
	        is_liked: true
	    }]});

	    var like_insert_options = {
	    	host : 'data.earthly58.hasura-app.io',
	    	port : '80',
	    	path : '/api/1/table/like/insert',
	    	method: 'POST',
	    	headers : {
	    		'Content-Type' : 'application/json',
	    		'Content-Length': Buffer.byteLength(like_insert_data),
	    		'Authorization' : 'Hasura '+auth_data.auth_token
	    	}
	    }

	    var like_insert_req = httpm.request(like_insert_options,function(res){
	    	res.setEncoding('utf8');
	    	res.on('data',function(chunk){
	    		console.log('like_insert_response: '+chunk);
	    	});
	    });

	    like_insert_req.write(like_insert_data);
	    like_insert_req.end();

		var two_way_connection_check_data   = '{"columns":["is_liked"],"where":{"$and":[{"user1":'+user.to+'},{"user2":'+user.from+'}]}}';

		console.log(two_way_connection_check_data);

		var two_way_connection_check_options = {
			host : 'data.earthly58.hasura-app.io',
			port : '80',
			path : '/api/1/table/like/select',
			method: 'POST',
			headers : {
				'Content-Type' : 'application/json',
	    		'Content-Length': Buffer.byteLength(two_way_connection_check_data),
	    		'Authorization' : 'Hasura '+auth_data.auth_token
	    	}
		};

		var two_way_connection_check_req = httpm.request(two_way_connection_check_options,function(res){
			res.setEncoding('utf8');
			res.on('data',function(chunk){
				console.log("check : "+chunk);
				chunk=JSON.parse(chunk);
				var notification_type="";
				if(chunk.length==0) {
					notification_type = "conn_req";
				}
				else if (chunk[0].is_liked){
					notification_type = "conn_estd";
				}
				else {
					notification_type = "conn_req";
				}

				var receiver_token = null;
				var notification_data = '{"columns":["device_token","device_type"],"where":{"id":'+user.to+'}}';

				var notification_options = {
					host : 'data.earthly58.hasura-app.io',
					port : '80',
					path : '/api/1/table/user/select',
					method: 'POST',
					headers : {
						'Content-Type' : 'application/json',
						'Content-Length': Buffer.byteLength(notification_data),
						'Authorization' : 'Hasura '+auth_data.auth_token
					}
				};

				var notification_req = httpm.request(notification_options,function(res){
					res.setEncoding('utf8');
					res.on('data',function(chunk){
						chunk=JSON.parse(chunk);
						receiver_token=chunk[0];

						var message = {
							to : receiver_token.device_token,
							collapse_key : 'my_collapse_key',
							data : {
								from_user : user.from,
								from_username : user.from_username,
								type : notification_type
							}
						};

						if(receiver_token.device_type!="ios"){
							fcm.send(message,function(err,res){
								if(err){
									console.log('err : ',err);
									console.log('res : ',res);
								} else {
									console.log('Successfully sent notification with response : '+res+'to : '+receiver_token.device_token);
								}
							});	
						}
					});
				});

				notification_req.write(notification_data);
				notification_req.end();

				if(notification_type=="conn_estd") {

					var receiver2_token=null;
					var notification2_data = '{"columns":["device_token","device_type"],"where":{"id":'+user.from+'}}';

					var notification2_options = {
						host : 'data.earthly58.hasura-app.io',
						port : '80',
						path : '/api/1/table/user/select',
						method: 'POST',
						headers : {
							'Content-Type' : 'application/json',
							'Content-Length': Buffer.byteLength(notification2_data),
							'Authorization' : 'Hasura '+auth_data.auth_token
						}
					};

					var notification2_req = httpm.request(notification2_options,function(res){
						res.setEncoding('utf8');
						res.on('data',function(chunk){
							chunk=JSON.parse(chunk);
							receiver2_token=chunk[0];

							var message = {
								to : receiver2_token.device_token,
								collapse_key : 'my_collapse_key',
								data : {
									from_user : user.to,
									from_username : user.to_username,
									type : notification_type
								}
							};

							if(receiver2_token.device_type!="ios"){
								fcm.send(message,function(err,res){
									if(err){
										console.log('err : ',err);
										console.log('res : ',res);
									} else {
										console.log('Successfully sent notification with response : '+res+'to : '+receiver2_token.device_token);
									}
								});
							}
						});
					});

					notification2_req.write(notification2_data);
					notification2_req.end();
				}
			});
		});

		two_way_connection_check_req.write(two_way_connection_check_data);
		two_way_connection_check_req.end();
	});

	res.send("Successfully Executed :)");
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

      var sender_username = params.from_username;
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
              var token_data   = '{"columns":["device_token","device_type"],"where":{"id":'+user.to+'}}'

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

              //console.log("shdgfks:"+sender_username);

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
                      from_username : sender_username,
                      message : msg,
                      type : "chat-notif"
                    }
                    //notification : {
                      //title: 'Levo',
                      //body : user.from+':'+msg
                    //}
                  };
                  
                  console.log(message.to);
                  if(receiver_token.device_type!="ios"){
                  	fcm.send(message,function(err,res){
                  		if(err){
                  			console.log('err : ',err);
                  			console.log('res : ',res);
                  			console.log('Something has gone wrong !');
                  		} else {
                  			console.log('Successfully sent with response : ',res);
                  		}
                  	});	
                  } 
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
      sockets[user_id]=null;
      console.log("User "+user.me+" disconnected");
    }
  });
});

http.listen(3000,function(){
  console.log('Listening on *:3000');
});









	