import Express from 'express';
import http from 'http';
import morgan from 'morgan';
import fetch from 'node-fetch';
import FCM from 'fcm-push';
import bodyParser from 'body-parser';
import _io from 'socket.io';
import config from './config';
import mail from './mail.js';
import nodemailer from 'nodemailer'
var crypto = require('crypto');
// const fcm = new FCM(process.env.FCM_KEY);
const fcm = new FCM('AIzaSyAlEs8Uag-FVRJ-mSjqJIqZbg5x4vc5Tx0');
const app = new Express();
const server = new http.Server(app);
const io = _io(server);
const androidversion = process.env.ANDROID_VERSION;
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'levotheapp@gmail.com', // Your email id
    pass: 'levitate' // Your password
  }
});


// var moment = require('moment');
var async = require('async');
var multer = require('multer');
var routesVersioning = require('express-routes-versioning')();
var moment = require('moment-timezone');
var production_database_url = 'https://data.ailment92.hasura-app.io/';
var development_database_url = 'https://data.stellar60.hasura-app.io/';
var production_authToken = 'Bearer 0aig5rjoomehkdy3zo48ndr8a9atkwqv';
var development_authToken = 'Bearer j7shr2w5vf30069tegl4qn5vz7ii91lm';
var _ = require('lodash');
var fs = require('fs');
let authUserId = '0';
var AWS = require("aws-sdk");
var schedule = require('node-schedule');

// Express Logging Middleware
if (global.__DEVELOPMENT__)
  app.use(morgan('combined'));
else
  app.use(morgan(
    '[:date[clf]]: :method :url :status :res[content-length] - :response-time ms'
  ));

// Parse JSON bodies
app.use('/static', Express.static('static'));
app.use(bodyParser.json({
  limit: '50mb'
}));
app.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true
}));

const headers = {
  'Content-Type': 'application/json'
};
let url = 'http://data.hasura';
if (global.__DEVELOPMENT__) {
  headers.Authorization = 'Bearer ' + process.env.API_TOKEN;
  // url = 'http://data.earthly58.hasura-app.io';
  url = 'https://data.ailment92.hasura-app.io/';
} else {
  headers['X-Hasura-Role'] = 'admin';
  headers['X-Hasura-User-Id'] = 1;
}

const request = (url, options, res, cb) => {
  fetch(url, options)
    .then(
      (response) => {
        if (response.ok) {
          response
            .text()
            .then(d => {
              (cb(JSON.parse(d)));
            })
            .catch(e => {
              console.error(url, response.status, response.statusText);
              console.error(e, e.stack);
              res.status(500).send('Internal error');
            });
          return;
        }
        console.error(url, response.status, response.statusText);
        response.text().then(t => (console.log(t)));
        if (res) {
          res.status(500).send('Internal error');
        }
      }, (e) => {
        console.error(url, e);
        if (res) {
          res.status(500).send('Internal error');
        }
      })
    .catch(e => {
      console.error(url, e);
      console.error(e.stack);
      if (res) {
        res.status(500).send('Internal error');
      }
    });
};

const validate = (req) => {
  // Check if req.headers['X-Hasura-Role'] == 'user'
  const authHeader = req.get('X-Hasura-Role');
  authUserId = req.get('X-Hasura-User-Id');
  console.log('user Id = ', authUserId);
  if (authHeader === 'user') {
    return true;
  }
  return false;
};

app.use((req, res, next) => {
  if (validate(req)) {
    next();
  } else {
    // next();
    res.status(403).send('invalid-role');
  }
});

app.post('/checkin/request', (req, res) => {
  const chunk = req.body;
  const user1 = (chunk.from < chunk.to) ? chunk.from : chunk.to;
  const user2 = (chunk.from < chunk.to) ? chunk.to : chunk.from;
  const initiator = chunk.from;
  const receiver = chunk.to;
  const flight = chunk.flight_id;
  // const flightTime = chunk.flight_time;
  const initiatorUsername = chunk.from_username;

  const getUrl = url + '/api/1/table/flights/select';
  const getFlightOpts = {
    method: 'POST',
    body: JSON.stringify({
      columns: ['number'],
      where: {
        id: flight
      }
    }),
    headers
  };

  request(getUrl, getFlightOpts, res, (resData) => {
    if (resData.length !== 1) {
      console.error(getUrl, 'Invalid response: ', resData);
      res.status(500).send('Could not fetch flights. Internal error');
      return;
    }

    // const flightNo = resData[0].number;
    const insertUrl = url + '/api/1/table/checkin/insert';
    const insertOpts = {
      method: 'POST',
      body: JSON.stringify({
        objects: [{
          user1,
          user2,
          initiator,
          flight_id: flight,
            created: (new Date()).toISOString()
            // ,flight_time: flightTime
        }]
      }),
      headers
    };

    request(insertUrl, insertOpts, res, () => {
      const notificationUrl = url + '/api/1/table/user/select';
      const notificationOpts = {
        method: 'POST',
        body: JSON.stringify({
          columns: ['device_token', 'device_type'],
          where: {
            id: receiver
          }
        }),
        headers
      };

      request(notificationUrl, notificationOpts, res, (rdata) => {
        console.log('rdata ', rdata[0]);
        const receiver = rdata[0];
        console.log('receiver: ', receiver);

        const message = {
          to: receiver.device_token,
          collapse_key: 'my_collapse_key',
          priority: 'high',
          data: {
            from_user: initiator,
            from_username: initiatorUsername,
            type: 'checkin_req'
          }
        };
        if (receiver.device_type === 'ios') {
          message.notification = {
            body: initiatorUsername +
              ' has sent you a check-in request',
            sound: 'default',
            badge: 1
          };
        }
        fcm.send(message, (err, res_) => {
          if (err) {
            console.log('err: ', err);
            console.log('res: ', res_);
            console.log(
              'Data updated, but push notification failed'
            );
            res.status(200).send(
              'Data updated, but push notification failed'
            );
          } else {
            console.log(
              'Successfully sent notification with response: ' +
              res_ + ' to: ' + receiver.device_token);
            res.send('All done!');
          }
        });
      });
    });
  });
});

app.post('/checkin/update', (req, res) => {
  const chunk = req.body;
  const user1 = (chunk.from < chunk.to) ? chunk.from : chunk.to;
  const user2 = (chunk.from < chunk.to) ? chunk.to : chunk.from;
  const flight = chunk.flight_id;
  // const flightTime = chunk.flight_time;
  const from = chunk.from;
  const to = chunk.to;
  const initiatorUsername = chunk.from_username;
  const acceptStatus = (chunk.request_type === 'accepted');

  const updateData = JSON.stringify({
    $set: {
      accepted: acceptStatus
    },
    where: {
      user1,
      user2,
      flight_id: flight
        // ,flight_time: flightTime
    }
  });

  const updateUrl = url + '/api/1/table/checkin/update';
  const updateOpts = {
    method: 'POST',
    body: updateData,
    headers
  };

  request(updateUrl, updateOpts, res, () => {
    console.log('Check-in request: ' + acceptStatus.toString());
    res.send('Check-in request: ' + acceptStatus.toString());
    const notificationUrl = url + '/api/1/table/user/select';
    const notificationOpts = {
      method: 'POST',
      body: JSON.stringify({
        columns: ['device_token', 'device_type'],
        where: {
          id: to
        }
      }),
      headers
    };

    if (acceptStatus === true) {
      const mailOptions = {
        from: '"Hasura" <levotheapp@gmail.com>', // sender address
        to: 'checkin@getlevo.com', // list of receivers
        subject: 'Checkin confirmed', // Subject line
        text: 'User1: ' + user1 + ', User2: ' + user2 +
          ', FlightId: ' + flight, // plaintext body
        html: 'User1: ' + user1 + ', User2: ' + user2 +
          ', FlightId: ' + flight // html body
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          return console.log(error);
        }
        console.log('Email sent: ' + info.response);
      });
    }

    request(notificationUrl, notificationOpts, res, (d) => {
      const receiver = d[0];
      console.log('receiver data = ', receiver);
      if (acceptStatus === true) {
        const message = {
          to: receiver.device_token,
          collapse_key: 'my_collapse_key',
          priority: 'high',
          data: {
            from_user: from,
            from_username: initiatorUsername,
            type: 'checkin_update'
          }
        };
        if (receiver.device_type === 'ios') {
          message.notification = {
            body: initiatorUsername +
              ' has accepted your check-in request.',
            sound: 'default',
            badge: 1
          };
        }
        fcm.send(message, (err, res_) => {
          if (err) {
            console.log('err: ', err);
            console.log('res: ', res_);
            console.log(
              'Data updated, but push notification failed');
            res.status(200).send(
              'Data updated, but push notification failed');
          } else {
            console.log(
              'Successfully sent notification with response: ' +
              res_ + ' to: ' + receiver.device_token);
          }
        });
        console.log('All Done!');
      } else {
        const message = {
          to: receiver.device_token,
          collapse_key: 'my_collapse_key',
          priority: 'high',
          data: {
            from_user: from,
            from_username: initiatorUsername,
            type: 'checkin_req_declined'
          }
        };
        if (receiver.device_type === 'ios') {
          message.notification = {
            body: initiatorUsername +
              ' has declined your check-in request.',
            sound: 'default',
            badge: 1
          };
        }
        fcm.send(message, (err, res_) => {
          if (err) {
            console.log('err: ', err);
            console.log('res: ', res_);
            console.log(
              'Data updated, but push notification failed');
            res.status(200).send(
              'Data updated, but push notification failed');
          } else {
            console.log(
              'Successfully sent notification with response: ' +
              res_ + ' to: ' + receiver.device_token);
          }
        });
        console.log('All Done!');
      }
    });
  });
});

app.post('/like', (req, res) => {
  const chunk = req.body;
  const user = {
    from: chunk.from_user,
    to: chunk.to_user,
    from_username: chunk.from_username,
    to_username: chunk.to_username
  };

  const checkAlreadyLiked = JSON.stringify({
    columns: ['id', 'is_liked', 'timestamp'],
    where: {
      $and: [{
        user1: user.from
      }, {
        user2: user.to
      }]
    },
    order_by: [{
      column: 'timestamp',
      order: 'desc',
      nulls: 'last'
    }],
    limit: 1
  });
  const checkAlreadyLikedUrl = url + '/api/1/table/like/select';
  const checkAlreadyLikedOpts = {
    method: 'POST',
    headers,
    body: checkAlreadyLiked
  };

  request(checkAlreadyLikedUrl, checkAlreadyLikedOpts, res, (
    alreadyLikedResult) => {
    let upsertUrl;
    let likeUpsert;
    const alreadyLiked = (alreadyLikedResult.length !== 0) ? (
      alreadyLikedResult[0].is_liked) : false;
    console.log('alreadyLikedResult: ', alreadyLikedResult);
    if (alreadyLikedResult.length === 0) {
      console.log('inserting...');
      upsertUrl = url + '/api/1/table/like/insert';
      likeUpsert = JSON.stringify({
        objects: [{
          user1: user.from,
          user2: user.to,
          is_liked: true,
          timestamp: (new Date()).toISOString()
        }]
      });
    } else {
      console.log('updating...');
      upsertUrl = url + '/api/1/table/like/update';
      likeUpsert = JSON.stringify({
        $set: {
          is_liked: true,
          timestamp: (new Date()).toISOString()
        },
        where: {
          id: alreadyLikedResult[0].id
        }
      });
    }

    const upsertOpts = {
      method: 'POST',
      headers,
      body: likeUpsert
    };

    request(upsertUrl, upsertOpts, res, () => {
      const twoWayConnectionCheck = JSON.stringify({
        columns: ['is_liked', 'timestamp'],
        where: {
          $and: [{
            user1: user.to
          }, {
            user2: user.from
          }]
        },
        order_by: [{
          column: 'timestamp',
          order: 'desc',
          nulls: 'last'
        }],
        limit: 1
      });

      console.log(twoWayConnectionCheck);
      const twoWayConnectionCheckUrl = url +
        '/api/1/table/like/select';
      const twoWayConnectionCheckOpts = {
        method: 'POST',
        headers,
        body: twoWayConnectionCheck
      };

      request(twoWayConnectionCheckUrl, twoWayConnectionCheckOpts,
        res, (twoWayResult) => {
          let notificationType;

          const notificationTitleBody = {
            body: 'Click here to view',
            sound: 'default',
            badge: 1
          };

          if (twoWayResult.length === 0) {
            notificationType = 'conn_req';
            notificationTitleBody.body = user.from_username +
              ' has sent you a connection request.';
          } else if (twoWayResult[0].is_liked) {
            if (alreadyLiked) {
              notificationType = 'conn_req_existing';
              notificationTitleBody.body = user.from_username +
                ' is travelling at the same time as you';
            } else {
              notificationType = 'conn_estd';
              notificationTitleBody.body = user.from_username +
                ' is now a connection!';
              // body set where fcm.send is called
            }
          } else {
            notificationType = 'conn_req';
            notificationTitleBody.body = user.from_username +
              ' has sent you a connection request.';
          }

          const notificationData = {
            columns: ['device_token', 'device_type'],
            where: {
              id: user.to
            }
          };

          const notificationUrl = url +
            '/api/1/table/user/select';
          const notificationOpts = {
            method: 'POST',
            headers,
            body: JSON.stringify(notificationData)
          };

          request(notificationUrl, notificationOpts, res, (
            notificationRes) => {
            const receiver = notificationRes[0];
            const message = {
              to: receiver.device_token,
              collapse_key: 'my_collapse_key',
              priority: 'high',
              data: {
                from_user: user.from,
                from_username: user.from_username,
                type: notificationType
              }
            };

            if (receiver.device_type === 'ios') {
              if (notificationType === 'conn_req_existing') {
                notificationTitleBody.body = user.from_username +
                  ' is travelling the same time as you';
              }
              message.notification = notificationTitleBody;
            }

            fcm.send(message, (err, result) => {
              if (err) {
                console.log(
                  'Error in sending FCM notification: ',
                  err);
                console.log('Message to be sent: ', JSON.stringify(
                  message));
                console.log('res: ', result);
                return;
              }
              console.log(
                'Successfully sent notification with response: ' +
                res + 'to: ' + receiver.device_token);
            });

            if (notificationType === 'conn_estd') {
              notificationData.where.id = user.from;
              notificationOpts.body = JSON.stringify(
                notificationData);
              notificationTitleBody.body = user.from_username +
                ' is travelling the same time as you';

              request(notificationUrl, notificationOpts, res, (
                notification2Res) => {
                const receiver2 = notification2Res[0];
                const message2 = {
                  to: receiver2.device_token,
                  collapse_key: 'my_collapse_key',
                  priority: 'high',
                  data: {
                    from_user: user.to,
                    from_username: user.to_username,
                    type: notificationType
                  }
                };

                if (receiver2.device_type === 'ios') {
                  message.notification =
                    notificationTitleBody;
                }

                fcm.send(message2, (err, result) => {
                  if (err) {
                    console.log(
                      'Error in sending FCM notification: ',
                      err);
                    console.log(
                      'Message to be sent: ', JSON.stringify(
                        message2));
                    console.log('res: ', result);
                    res.status(500).send(
                      'Internal error');
                    return;
                  }
                  res.send(
                    'Succesfully sent notifications!'
                  );
                });
              });
            } else {
              res.send('Notifications sent!');
            }
          });
        });
    });
  });
});

app.get('/linkedin-profile/:token', (req, res) => {
  const profileUrl =
    'https://api.linkedin.com/v1/people/~:(positions,email-address,formatted-name,phone-numbers,picture-urls::(original))?format=json';
  const profileOpts = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + req.params.token
    }
  };
  request(profileUrl, profileOpts, res, (data) => {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(data));
  });
});

app.post('/mutual-friends', (req, res) => {
  const input = req.body;
  if (input.next != '') {
    var url = input.next;
    var options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + input.myToken
      }
    };
    request(url, options, res, (data) => {
      res.set('Content-Type', 'application/json');
      var finalData = data.data;
      var paging = data.paging;
      var totalFriends = data.summary.total_count;
      var next = '';
      var previous = '';
      if (paging.hasOwnProperty('next') && (paging[
            'next'] !=
          -1)) {
        next = paging['next'];
      }
      if (paging.hasOwnProperty('previous') && (paging[
            'previous'] !=
          -1)) {
        previous = paging['previous'];
      }
      res.json({
        data: {
          friends: finalData,
          next: next,
          previous: previous,
          total_friends: totalFriends
        },
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    });
  }
  if (input.previous != '') {
    var url = input.previous;
    var options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + input.myToken
      }
    };
    request(url, options, res, (data) => {
      res.set('Content-Type', 'application/json');
      var finalData = data.data;
      var paging = data.paging;
      var totalFriends = data.summary.total_count;
      var next = '';
      var previous = '';
      if (paging.hasOwnProperty('next') && (paging[
            'next'] !=
          -1)) {
        next = paging['next'];
      }
      if (paging.hasOwnProperty('previous') && (paging[
            'previous'] !=
          -1)) {
        previous = paging['previous'];
      }
      res.json({
        data: {
          friends: finalData,
          next: next,
          previous: previous,
          total_friends: totalFriends
        },
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    });
  }
  if (input.previous === '' && input.next === '') {
    const secret = 'b3fe1de6674a29c50b98837e030ec15a';
    // 3i7ca5ub8r6586ol5wpvyfm5b61om0hc live Token
    // b3fe1de6674a29c50b98837e030ec15a staging Token
    const hash = crypto.createHmac('sha256', secret).update(input.userToken)
      .digest(
        'hex');
    var url =
      `https://graph.facebook.com/v2.8/${input.otherId}?fields=context.fields%28all_mutual_friends.limit%28200%29%29&access_token=${input.userToken}&appsecret_proof=${hash}`;
    var options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + input.myToken
      }
    };
    request(url, options, res, (data) => {
      res.set('Content-Type', 'application/json');
      var finalData = data.context.all_mutual_friends.data;
      var paging = data.context.all_mutual_friends.paging;
      var totalFriends = data.context.all_mutual_friends.summary.total_count;
      var next = '';
      var previous = '';
      if (paging.hasOwnProperty('next') && (paging[
            'next'] !=
          -1)) {
        next = paging['next'];
      }
      if (paging.hasOwnProperty('previous') && (paging[
            'previous'] !=
          -1)) {
        previous = paging['previous'];
      }
      res.json({
        data: {
          friends: finalData,
          next: next,
          previous: previous,
          total_friends: totalFriends
        },
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    });
  }
});

var request_function = function(url, options, res, callback) {
  request(url, options, res, (data) => {
    return callback(null, data);
  });
}

var flightStat = function(flightCode, flightNumber, departYear, departMonth,
  departDay, res, callback) {

  const url1 =
    'https://api.flightstats.com/flex/schedules/rest/v1/json/flight/' +
    flightCode + '/' + flightNumber.toString() + '/departing/' +
    departYear.toString() + '/' + departMonth.toString() + '/' +
    departDay.toString() +
    '?appId=7c7b6a76&appKey=40a9cba98bd34a470328391666ce9df8&utc=true';
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  request_function(url1, options, res, function(err, flight_data) {
    if (err)
      return callback(true, null);
    return callback(null, flight_data);
  });
}

var changeTime = function(flight, originAirportObject, destinationAirportObject,
  callback) {

  // console.log('originAirportObject : ', originAirportObject.timeZoneRegionName
  //   .toString());
  //
  // console.log('destinationAirportObject : ', destinationAirportObject.timeZoneRegionName
  //   .toString());

  var depTime = moment.utc(flight.departureTime)
    .format();

  var arrTime = moment.utc(flight.arrivalTime)
    .format();

  // console.log('depTime : ', depTime)
  // console.log('arrTime : ', arrTime)

  var depTimeX = moment.tz(flight.departureTime,
    originAirportObject.timeZoneRegionName.toString()
  ).format("YYYY-MM-DD" + ' ' + "HH:mm:ss");

  var arrTimeX = moment.tz(flight.arrivalTime,
    destinationAirportObject.timeZoneRegionName.toString()
  ).format("YYYY-MM-DD" + ' ' + "HH:mm:ss");

  var depTimeX1 = moment.tz(flight.departureTime,
    originAirportObject.timeZoneRegionName.toString()
  ).format("YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

  var arrTimeX1 = moment.tz(flight.arrivalTime,
    destinationAirportObject.timeZoneRegionName.toString()
  ).format("YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

  // console.log('depTimeX : ', depTimeX)
  // console.log('arrTimeX : ', arrTimeX)

  var result_depTime = moment.utc(depTime).format(
    "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");
  var result_arrTime = moment.utc(arrTime).format(
    "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

  var utc_depTime = moment.utc(depTimeX1).format(
    "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

  var utc_arrTime = moment.utc(arrTimeX1).format(
    "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

  // console.log('result_depTime : ', result_depTime);
  // console.log('result_arrTime : ', result_arrTime);
  //
  // console.log('utc_depTime : ', utc_depTime);
  // console.log('utc_arrTime : ', utc_arrTime);

  var result_depTime_local = moment.utc(depTimeX).format(
    "YYYY-MM-DD" + ' ' + "HH:mm:ss");
  var result_arrTime_local = moment.utc(arrTimeX).format(
    "YYYY-MM-DD" + ' ' + "HH:mm:ss");

  // var result_depTime_local = moment.utc(depTimeX).format(
  //   "YYYY-MM-DD" + ' ' + "HH:mm:ss");
  // var result_arrTime_local = moment.utc(arrTimeX).format(
  //   "YYYY-MM-DD" + ' ' + "HH:mm:ss");

  var result_depTime_local = depTimeX;
  var result_arrTime_local = arrTimeX;

  callback(utc_depTime, utc_arrTime, result_arrTime, result_depTime,
    result_arrTime_local,
    result_depTime_local);

}

var find_data = function(flight_details_object, res, callback) {

  const checkData = {
    columns: ['*'],
    where: flight_details_object
  };

  const url = development_database_url +
    'api/1/table/flights/select';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': development_authToken,
      'X-Hasura-Role': 'admin',
      'X-Hasura-User-Id': 1
    },
    body: JSON.stringify(checkData)
  };
  request_function(url, options, res, function(err, database_flight_data) {
    if (err)
      return callback(true, err);
    // console.log('find_data : ', database_flight_data);
    if (database_flight_data.length > 0) {
      delete database_flight_data[0].eff_from;
      delete database_flight_data[0].eff_till;
      delete database_flight_data[0].op_days;
    }
    return callback(null, database_flight_data);
  });
};

var insert_data = function(flight_details_object, res, callback) {
  var insertUrl = development_database_url +
    'api/1/table/flights/insert';
  var insertOpts = {
    method: 'POST',
    body: JSON.stringify({
      objects: [flight_details_object],
      "returning": ["id"]
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': development_authToken,
      'X-Hasura-Role': 'admin'
    }
  };

  request_function(insertUrl, insertOpts, res, function(err, response) {
    // console.log(response);
    if (err)
      return callback(true, err);
    flight_details_object.id = response.returning[0].id;
    // console.log('flight_details_object : ',
    //   flight_details_object);
    // console.log(flight_details_object);
    return callback(null, flight_details_object);
  });
}


// app.post('/flight-check', routesVersioning({
//   "~1.0.0": flight_check_function,
//   "~2.0.0": flight_check_function
// }, NoMatchFoundCallback));
//
// function flight_check_function(req, res, next) {

app.post('/flight-check', (req, res) => {

  // console.log('flight-check');
  var finalresult = [];
  const input = req.body;
  input.flight_number = input.flight_number.toUpperCase();
  var flightCode = (input.flight_number.substring(0, 2)).toUpperCase();
  var flightNumber = input.flight_number.substring(2);
  if (flightNumber[0] === '0')
    flightNumber = flightNumber.substring(1);
  var finalFlightNumber = flightCode + flightNumber;
  // console.log('finalFlightNumber : ', finalFlightNumber);
  var check = moment(input.today_date.toString(), 'YYYY/MM/DD');
  var departMonth = check.format('M')
  var departDay = check.format('D')
  var departYear = check.format('YYYY');
  var today_date = input.today_date;
  var tomorrow_date = input.tomorrow_date;

  flightStat(flightCode, flightNumber, departYear, departMonth,
    departDay, res,
    function(err, flight_data) {
      // console.log('flight_data : ', flight_data);
      var flights = flight_data.scheduledFlights;
      var airline = flight_data.appendix.airlines;
      var airports = flight_data.appendix.airports;
      var flights_length = flights.length;
      var flightName = "";
      if (flights_length == 0) {
        res.send({
          msg: 'No Flight Found'
        });
      } else {
        var count = 0;
        while (flights_length) {
          // console.log('flights_length : ', flights_length);
          var depCode = flights[count].departureAirportFsCode;
          var arrCode = flights[count].arrivalAirportFsCode;
          var flightName = '';
          var originAirportObject = new Object;
          var destinationAirportObject = new Object;

          //getting Flight Name
          for (var i = 0; i < airline.length; i++) {
            if (airline[i].fs == flightCode || airline[i].fs == (
                flightCode + '*')) {
              flightName = airline[i].name;
            }
          }
          //Get Origin Airport Object
          for (var i = 0; i < airports.length; i++) {
            if (airports[i].fs == depCode)
              originAirportObject = Object.assign(originAirportObject,
                airports[i]);
          }
          //Get Destinatation Airport Object
          for (var i = 0; i < airports.length; i++) {
            if (airports[i].fs == arrCode)
              destinationAirportObject = Object.assign(
                destinationAirportObject, airports[i]);
          }
          // console.log('arrCode : ', arrCode);
          // console.log('depCode : ', depCode);
          // console.log('originAirportObject : ', originAirportObject);
          // console.log('destinationAirportObject : ',
          //   destinationAirportObject);

          var origin = originAirportObject.city;
          var destination = destinationAirportObject.city;

          changeTime(flights[count], originAirportObject,
            destinationAirportObject,
            function(utc_depTime, utc_arrTime, result_arrTime,
              result_depTime, result_arrTime_local,
              result_depTime_local) {

              // console.log('flightName : ', flightName);
              // console.log('origin : ', origin);
              // console.log('destination : ', destination);
              // console.log('result_arrTime : ', result_arrTime);
              // console.log('result_depTime : ', result_depTime);

              var flight_details_object = new Object({
                number: finalFlightNumber,
                airline: flightName,
                origin_code: depCode,
                destination_code: arrCode,
                departure: utc_depTime,
                arrival: utc_arrTime,
                origin: origin,
                destination: destination,
                arrival_local: result_arrTime_local,
                departure_local: result_depTime_local
              });

              // console.log('arrival_local : ', result_arrTime_local);
              // console.log('departure_local : ', result_depTime_local);

              find_data(flight_details_object, res, function(err,
                result) {
                // console.log('result : ', result);
                if (err) {
                  res.send({
                    error_msg: result
                  })
                }

                if (result.length > 0) {
                  finalresult.push(result[0]);
                  // console.log('finalresult : ', finalresult);
                  if (finalresult.length == flights.length)
                    res.send(finalresult);
                } else {
                  // console.log('insert data');
                  insert_data(flight_details_object, res, function(
                    err, result) {
                    finalresult.push(result);
                    // console.log('finalresult : ', finalresult);
                    if (finalresult.length == flights.length)
                    // res.json({
                    //   data: finalresult,
                    //   error: {
                    //     code: 200,
                    //     message: 'success',
                    //     errors: ""
                    //   }
                    // });
                      res.send(finalresult);
                  })
                }
              })
            });
          count++;
          flights_length = flights_length - 1;
        }
      }
    });
});


app.get('/frequent-fliers', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": frequent_fliers_function
}, NoMatchFoundCallback));

function frequent_fliers_function(req, res, next) {

  var finalresult = [];
  var ids = [];
  var getUrl = development_database_url + 'v1/query';
  // var getoptions = {
  //   method: 'POST',
  //   headers: {
  //     'x-hasura-role': 'admin',
  //     'authorization': development_authToken,
  //     'content-type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     type: 'run_sql',
  //     args: {
  //       sql: 'SELECT count(c.user_id) AS count, c.user_id  FROM user_flight c  GROUP BY c.user_id  ORDER BY count DESC LIMIT 10'
  //     }
  //   })
  // };
  //
  // request(getUrl, getoptions, res, (resData) => {
  //   var result = [];
  //   for (var i = 1; i < resData.result.length; i++) {
  //     var object = {};
  //     for (var j = 0; j < resData.result[i].length; j++) {
  //       object[resData.result[0][j]] = resData.result[i][j];
  //     }
  //     result.push(object);
  //     ids.push(parseInt(object.user_id));
  //   }
  var ids = [46, 565, 302, 206, 535, 95, 159, 50, 521, 215];
  var getoptions = {
    method: 'POST',
    headers: {
      'x-hasura-role': 'admin',
      'authorization': development_authToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      "type": "select",
      "args": {
        "table": "user",
        "columns": [
          "*", {
            "name": "education",
            "columns": ["*"]
          }, {
            "name": "experience",
            "columns": ["*"]
          }, {
            "name": "interests",
            "columns": ["*"]
          }
        ],
        "where": {
          "id": {
            '$in': ids
          }
        }
      }
    })
  };
  request(getUrl, getoptions, res, (resData1) => {
    // console.log(resData1);
    // res.send(resData1);
    // console.log('result :', result);
    // console.log('resData1 :', resData1[1]);
    // console.log('resData1 : ', resData1[1].);
    if (resData1.length > 0) {
      for (var i = 0; i < resData1.length; i++) {
        var user_interests = [];
        var user2_experience = [];
        var user2_education = [];
        var user2_companyName = [];
        var user2_designation = [];

        for (var j = 0; j < resData1[i].interests.length; j++) {
          // console.log('interest : ', resData1[i].interests[j].interest);
          user_interests.push(resData1[i].interests[j].interest);
        }

        for (var j = 0; j < resData1[i].experience.length; j++) {
          // console.log('interest : ', resData1[i].interests[j].interest);
          user2_companyName.push(resData1[i].experience[j].company_name);
          user2_designation.push(resData1[i].experience[j].designation);
        }

        for (var j = 0; j < resData1[i].education.length; j++) {
          var education = new Object({
            f1: resData1[i].education[j].institute_name,
            id: resData1[i].education[j].id,
            user_id: resData1[i].education[j].user_id,
            f2: resData1[i].education[j].qualification
          });
          user2_education.push(education);
        }
        for (var j = 0; j < resData1[i].experience.length; j++) {
          var experience = new Object({
            f1: resData1[i].experience[j].company_name,
            id: resData1[i].experience[j].id,
            user_id: resData1[i].experience[j].user_id,
            f2: resData1[i].experience[j].designation
          });
          user2_experience.push(experience);
        }

        var user_details = new Object({
          user2: parseInt(resData1[i].id),
          user2_name: resData1[i].name,
          user2_city: resData1[i].city,
          user2_profile_pic: resData1[i].profile_pic,
          user2_intent: resData1[i].intent,
          user2_education: user2_education,
          user2_experience: user2_experience,
          user2_interest: user_interests,
          user2_facebook_id: resData1[i].facebook_id
        });

        finalresult.push(user_details);
      }
      res.json({
        data: finalresult,
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    } else {
      res.json({
        data: [],
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    }
  });
  // });
}

var update_data = function(updateData, url, res, callback) {

  const updateUrl = development_database_url + url;
  const updateOpts = {
    method: 'POST',
    body: updateData,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': development_authToken,
      'X-Hasura-Role': 'admin'
    }
  };

  request_function(updateUrl, updateOpts, res, function(err, response) {
    if (err)
      return callback(true, err);
    return callback(null, response);
  });
}


app.post('/image-upload', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": image_upload_function
}, NoMatchFoundCallback));

function image_upload_function(req, res, next) {
  // console.log('userId :', req.body.userId);
  var filename = "";
  var image_url = '';
  var storage = multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, "./")
    },
    filename: function(req, file, callback) {
      // console.log("file", file.originalname)
      // console.log('userid : ', req.body.userid);
      filename = 'a.png'
      callback(null, filename)
    }
  });
  var uploadfile = multer({
    storage: storage,
    size: 1024 * 1024 * 1024 * 10
  }).single('file');
  uploadfile(req, res, function(err) {
    if (err) {
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    } else {
      if (filename == "") {
        // console.log('no filename1 : ', filename);
        res.send({
          message: "image not found",
          error: false
        });
      } else {
        // console.log('filename : ', filename);
        var readStream = fs.createReadStream('./' +
          filename);
        filename = 'profile_id=' + req.body.userid + 'time=' + new Date()
          .getTime() + ".png";
        // console.log('filename : ', filename);
        s3Upload(readStream, filename, req, res);
      }
    }
  });
}

var s3Upload = function(readStream, fileName, req, res) {
  var bucket_name = 'levoprofilepics';
  console.log('ACCESS_KEY : ', process.env.ACCESS_KEY);
  console.log("SECRET_KEY : ", process.env.SECRET_KEY);
  var s3 = new AWS.S3({
    region: 'ap-northeast-1',
    apiVersion: '2017-02-08',
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY
  });
  var params = {
    Bucket: bucket_name,
    Key: fileName,
    ACL: 'public-read',
    Body: readStream
  };
  s3.putObject(params, function(err, data) {
    if (err) {
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    }
    var filePath = './a.png';
    fs.unlinkSync(filePath);
    var image_url =
      'https://s3-ap-northeast-1.amazonaws.com/levoprofilepics/' +
      fileName;

    const updateData = JSON.stringify({
      $set: {
        profile_pic: image_url
      },
      where: {
        id: parseInt(req.body.userid)
      }
    });

    var upadteUrl = 'api/1/table/user/update';
    update_data(updateData, upadteUrl, res, function(err,
      data) {
      if (err)
        res.json({
          data: [],
          error: {
            code: 500,
            message: 'Backend Error',
            errors: err
          }
        });
      // res.send({
      //   message: "image uploaded successfully",
      //   error: false
      // });

      res.json({
        data: {
          image_url: image_url
        },
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    });
  });
};

var find = function(checkData, url, res, callback) {

  var req_url = development_database_url + url;
  console.log('req_url : ', req_url);
  var options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': development_authToken,
      'X-Hasura-Role': 'admin',
      'X-Hasura-User-Id': 1
    },
    body: JSON.stringify(checkData)
  };
  request_function(req_url, options, res, function(err, response) {
    if (err)
      return callback(true, err);
    // console.log('find_data : ', database_flight_data);
    return callback(null, response);
  });
};



app.get('/all-airports', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": all_airports_function
}, NoMatchFoundCallback));

function all_airports_function(req, res, next) {
  const checkData = {
    columns: ['*']
  };
  var url = 'api/1/table/airport/select';

  find(checkData, url, res, function(err, data) {
    if (err)
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    res.json({
      data: data,
      error: {
        code: 200,
        message: 'success',
        errors: err
      }
    });
  });
}

function versionavailable(req, res, next) {
  res.json({
    data: [],
    error: {
      code: 700,
      message: 'force update',
      errors: ''
    }
  });
}

function NoMatchFoundCallback(req, res, next) {
  res.json({
    data: [],
    error: {
      code: 404,
      message: 'version not found',
      errors: ''
    }
  });
}


app.get('/airport-by-code', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": airport_by_code_function
}, NoMatchFoundCallback));

function airport_by_code_function(req, res, next) {

  var user_id = parseInt(req.query.user_id);
  console.log('user_id : ', user_id);
  var airport_code = req.query.airport_code.toUpperCase();
  var finalresult = [];
  var asyncTasks = [];
  var today = new Date();
  var day = today.getUTCDate();
  var startTime = moment.utc().format();
  var timestring1 = moment(startTime);
  timestring1 = timestring1.add(moment.duration(2, 'hours'));
  var endTime = moment.utc(timestring1).format();
  var flight_user_ids = [];
  var airport_user_ids = [];
  var airport_id;

  const checkData = {
    columns: ['*'],
    where: {
      airport_code: req.query.airport_code.toUpperCase()
    }
  };
  var url = 'api/1/table/airport/select';

  find(checkData, url, res, function(err, airportdata) {

    if (err) {
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    }
    if (airportdata.length > 0) {
      airport_id = airportdata[0].id;
      url = 'api/1/table/airport_user/select';
      const checkData = {
        columns: ['*'],
        where: {
          airport_id: airportdata[0].id
        }
      };
      find(checkData, url, res, function(err, airport_user_data) {
        if (err)
          res.json({
            data: [],
            error: {
              code: 500,
              message: 'Backend Error',
              errors: err
            }
          });

        var checkData = {
          "columns": [
            "*", {
              "name": "user_flight",
              "columns": ["*"]
            }
          ],
          where: {
            origin_code: airport_code,
            "$and": [{
              departure: {
                "$gte": startTime
              }
            }, {
              departure: {
                "$lte": endTime
              }
            }]
          }
        };

        var url = 'api/1/table/flights/select';

        find(checkData, url, res, function(err, data) {
          // console.log('data : ', data);
          if (err) {
            res.json({
              data: [],
              error: {
                code: 500,
                message: 'Backend Error',
                errors: err
              }
            });
          }
          if ((data.length > 0) && (data[0].user_flight.length >
              0)) {
            for (var i = 0; i < data[0].user_flight.length; i++) {
              flight_user_ids.push(data[0].user_flight[i].user_id)
            }
          }
          // console.log('flight_ids :', flight_user_ids);
          var checkData = {
            "columns": ["*"],
            where: {
              airport_id: airport_id
            }
          };
          var url = 'api/1/table/airport_user/select';

          find(checkData, url, res, function(err,
            airportUserData) {

            if (airportUserData.length > 0) {
              for (var i = 0; i < airportUserData.length; i++) {
                airport_user_ids.push(
                  airportUserData[i].user_id)
              }
            }
            // console.log('airport_user_ids :',
            //   airport_user_ids);
            var other = _.concat(airport_user_ids,
              flight_user_ids);

            var temp = [];
            temp.push(user_id);
            other = _.differenceBy(other, temp);

            var finaldata = new Object({
              long: airportdata[0].long,
              time: airportdata[0].time,
              lat: airportdata[0].lat,
              city: airportdata[0].city,
              id: airportdata[0].id,
              airport_name: airportdata[0].airport_name,
              airport_code: airportdata[0].airport_code,
              total_user: other.length
            });
            finalresult.push(finaldata);
            res.json({
              data: finalresult,
              error: {
                code: 200,
                message: 'success',
                errors: err
              }
            });
          });
        });
      });
    } else {
      res.json({
        data: [],
        error: {
          code: 200,
          message: 'success',
          errors: err
        }
      });
    }
  });
}


app.post('/airport-user-enter', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": airport_user_enter_function
}, NoMatchFoundCallback));

function airport_user_enter_function(req, res, next) {

  var airport_code = req.body.airport_code.toUpperCase();
  var userid = req.body.user_id;

  const checkData = {
    columns: ['*'],
    where: {
      airport_code: airport_code.toUpperCase()
    }
  };
  var url = 'api/1/table/airport/select';

  find(checkData, url, res, function(err, data1) {
    if (err) {
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    }
    var getUrl = development_database_url + 'v1/query';
    var getoptions = {
      method: 'POST',
      headers: {
        'x-hasura-role': 'admin',
        'authorization': development_authToken,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        "type": "delete",
        "args": {
          "table": "airport_user",
          "where": {
            user_id: userid
          },
          "returning": ["id"]
        }
      })
    };
    request(getUrl, getoptions, res, (resData6) => {
      // console.log('response data 6 : ', resData6);
      var insertUrl = development_database_url +
        'api/1/table/airport_user/insert';

      var user_airport_details_object = new Object({
        user_id: userid,
        airport_id: data1[0].id,
        entry_time: new Date().getTime()
      });

      var insertOpts = {
        method: 'POST',
        body: JSON.stringify({
          objects: [user_airport_details_object],
          "returning": ["id"]
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': development_authToken,
          'X-Hasura-Role': 'admin'
        }
      };

      request_function(insertUrl, insertOpts, res, function(
        err,
        response) {
        if (err) {
          res.json({
            data: [],
            error: {
              code: 500,
              message: 'Backend Error',
              errors: err
            }
          });
        }
        // console.log(response);
        const checkData = {
          columns: ['*'],
          where: {
            id: response.returning[0].id
          }
        };
        var url = 'api/1/table/airport_user/select';

        find(checkData, url, res, function(err, data2) {
          if (err) {
            res.json({
              data: [],
              error: {
                code: 500,
                message: 'Backend Error',
                errors: err
              }
            });
          }
          res.json({
            data: data1,
            error: {
              code: 200,
              message: 'success',
              errors: err
            }
          });
        });
      });
    });
  });
}


app.post('/airport-user-exit', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": airport_user_exit_function
}, NoMatchFoundCallback));

function airport_user_exit_function(req, res, next) {

  var userid = req.body.user_id;
  var airport_code = req.body.airport_code.toUpperCase();
  const checkData = {
    columns: ['*'],
    where: {
      airport_code: airport_code
    }
  };
  var url = 'api/1/table/airport/select';
  find(checkData, url, res, function(err, data) {
    if (err) {
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    }
    if (data.length > 0) {
      var getUrl = development_database_url + 'v1/query';
      var getoptions = {
        method: 'POST',
        headers: {
          'x-hasura-role': 'admin',
          'authorization': development_authToken,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          "type": "delete",
          "args": {
            "table": "airport_user",
            "where": {
              "user_id": userid,
              airport_id: data[0].id
            },
            "returning": ["id"]
          }
        })
      };
      request(getUrl, getoptions, res, (resData1) => {
        res.json({
          data: data,
          error: {
            code: 200,
            message: 'success',
            errors: ""
          }
        });
      });
    } else {
      res.json({
        data: [],
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    }
  });
}


app.post('/airport-user-profile', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": airport_user_profile_function
}, NoMatchFoundCallback));

function airport_user_profile_function(req, res, next) {
  // console.log('airport_user_profile_function');
  var airport_code = req.body.airport_code.toUpperCase();
  var userid = req.body.user_id;
  var ids = [];
  var finalresult = [];
  var asyncTasks = [];
  var today = new Date();
  var day = today.getUTCDate();
  var startTime = moment.utc().format();
  var timestring1 = moment(startTime);
  timestring1 = timestring1.add(moment.duration(4, 'hours'));
  var timestring2 = moment(startTime);
  timestring1 = timestring2.subtract(moment.duration(4, 'hours'));
  var endTime = moment.utc(timestring1).format();
  var startTime1 = moment.utc(timestring2).format();
  var flight_user_ids = [];
  var airport_user_ids = [];
  // console.log('startTime : ', startTime);
  // console.log('endTime : ', endTime);

  var checkData = {
    "columns": [
      "*", {
        "name": "user_flight",
        "columns": ["*"]
      }
    ],
    where: {
      "$or": [{
        "$and": [{
          departure: {
            "$gte": startTime
          }
        }, {
          departure: {
            "$lte": endTime
          }
        }, {
          origin_code: airport_code
        }]
      }, {
        "$and": [{
          arrival: {
            "$gte": startTime1
          }
        }, {
          arrival: {
            "$lte": endTime
          }
        }, {
          destination_code: airport_code
        }]
      }]
    }
  };

  var url = 'api/1/table/flights/select';

  find(checkData, url, res, function(err, data) {
    // console.log('data : ', data);
    if (err) {
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    }
    if ((data.length > 0) && (data[0].user_flight.length > 0)) {
      for (var i = 0; i < data[0].user_flight.length; i++) {
        flight_user_ids.push(data[0].user_flight[i].user_id)
      }
    }
    console.log('flight_ids :', flight_user_ids);
    var checkData = {
      "columns": ["*"],
      where: {
        airport_code: airport_code
      }
    };
    var url = 'api/1/table/airport/select';

    find(checkData, url, res, function(err, airportData) {
      console.log('airportData :', airportData);
      if (airportData.length > 0) {
        var airport_id = airportData[0].id;
        var checkData = {
          "columns": ["*"],
          where: {
            airport_id: airport_id
          }
        };
        var url = 'api/1/table/airport_user/select';

        find(checkData, url, res, function(err, airportUserData) {

          if (airportUserData.length > 0) {
            for (var i = 0; i < airportUserData.length; i++) {
              airport_user_ids.push(airportUserData[i].user_id)
            }
            console.log('airport_user_ids :', airport_user_ids);
            var other = _.concat(airport_user_ids,
              flight_user_ids);
            console.log('other :', other);
            if (other.length > 0) {
              checkData = {
                "columns": ["*"],
                "where": {
                  user1: userid,
                  user2: {
                    '$in': other
                  },
                  is_liked: false
                }
              };
              var url = 'api/1/table/like/select';

              find(checkData, url, res, function(err, data1) {
                if (err) {
                  res.json({
                    data: [],
                    error: {
                      code: 500,
                      message: 'Backend Error',
                      errors: err
                    }
                  });
                }
                var unlike_ids = [];
                if (data1.length > 0) {
                  for (var i = 0; i < data1.length; i++) {
                    unlike_ids.push(data1[i].user2)
                  }
                }
                var temp = [];
                temp.push(req.body.user_id)
                var final_ids = _.differenceBy(other,
                  unlike_ids);
                final_ids = _.differenceBy(other, temp);

                var getUrl = development_database_url +
                  'v1/query';

                var getoptions = {
                  method: 'POST',
                  headers: {
                    'x-hasura-role': 'admin',
                    'authorization': development_authToken,
                    'content-type': 'application/json'
                  },
                  body: JSON.stringify({
                    "type": "select",
                    "args": {
                      "table": "user",
                      "columns": [
                        "*", {
                          "name": "education",
                          "columns": ["*"]
                        }, {
                          "name": "experience",
                          "columns": ["*"]
                        }, {
                          "name": "interests",
                          "columns": ["*"]
                        }
                      ],
                      "where": {
                        "id": {
                          '$in': final_ids
                        }
                      }
                    }
                  })
                };
                request(getUrl, getoptions, res, (
                  resData1) => {
                  // console.log('resData1 : ', resData1);

                  _.forEach(resData1, function(data) {
                    asyncTasks.push(function(
                      callback) {
                      var user_interests = [];
                      var user2_experience = [];
                      var user2_education = [];
                      var user2_companyName = [];
                      var user2_designation = [];

                      for (var j = 0; j <
                        data.interests
                        .length; j++) {
                        user_interests.push(
                          data.interests[
                            j]
                          .interest);
                      }

                      for (var j = 0; j <
                        data.experience
                        .length; j++) {
                        user2_companyName.push(
                          data.experience[
                            j].company_name
                        );
                        user2_designation.push(
                          data.experience[
                            j].designation);
                      }

                      for (var j = 0; j <
                        data.education
                        .length; j++) {
                        var education = new Object({
                          f1: data.education[
                            j].institute_name,
                          id: data.education[
                            j].id,
                          user_id: data.education[
                            j].user_id,
                          f2: data.education[
                            j].qualification
                        });
                        user2_education.push(
                          education);
                      }

                      for (var j = 0; j <
                        data.experience
                        .length; j++) {
                        var experience = new Object({
                          f1: data.experience[
                            j].company_name,
                          id: data.experience[
                            j].id,
                          user_id: data.experience[
                              j]
                            .user_id,
                          f2: data.experience[
                            j].designation
                        });
                        user2_experience.push(
                          experience);
                      }
                      checkData = {
                        "columns": ["*"],
                        "where": {
                          user1: userid,
                          user2: data.id,
                          is_liked: true
                        }
                      };
                      var url =
                        'api/1/table/like/select';
                      var liked_12 = null;
                      find(checkData, url,
                        res,
                        function(
                          err,
                          data2) {
                          if (data2.length >
                            0)
                            liked_12 =
                            data2[
                              0].is_liked;
                          checkData = {
                            "columns": [
                              "*"
                            ],
                            "where": {
                              user1: data
                                .id,
                              user2: userid,
                              is_liked: true
                            }
                          };
                          var url =
                            'api/1/table/like/select';
                          var liked_21 =
                            null;
                          find(checkData,
                            url,
                            res,
                            function(
                              err,
                              data3) {
                              if (data3.length >
                                0)
                                liked_21 =
                                data3[0].is_liked;
                              var
                                user_details =
                                new Object({
                                  user2: parseInt(
                                    data
                                    .id
                                  ),
                                  user2_name: data
                                    .name,
                                  user2_city: data
                                    .city,
                                  user2_profile_pic: data
                                    .profile_pic,
                                  user2_intent: data
                                    .intent,
                                  user2_education: user2_education,
                                  user2_experience: user2_experience,
                                  user2_interest: user_interests,
                                  user2_facebook_id: data
                                    .facebook_id,
                                  liked_21: liked_21,
                                  liked_12: liked_12,
                                });
                              finalresult
                                .push(
                                  user_details
                                );
                              callback(
                                null,
                                finalresult
                              )
                            });
                        });
                    });
                  });
                  async.parallel(asyncTasks, function(
                    err, result) {
                    res.json({
                      data: finalresult,
                      error: {
                        code: 200,
                        message: 'success',
                        errors: ""
                      }
                    });
                  });
                });
              });
            } else {
              res.json({
                data: finalresult,
                error: {
                  code: 200,
                  message: 'success',
                  errors: ""
                }
              });
            }
          } else {
            res.json({
              data: finalresult,
              error: {
                code: 200,
                message: 'success',
                errors: ""
              }
            });
          }
        });
      } else {
        res.json({
          data: finalresult,
          error: {
            code: 500,
            message: 'Backend Error',
            errors: "airport not found"
          }
        });
      }
    });
  });
}

var j = schedule.scheduleJob('30 * * * * *', function(req, res) {
  var currentTime = new Date().getTime() - (3600000 * 4);
  var getUrl = development_database_url + 'v1/query';
  var getoptions = {
    method: 'POST',
    headers: {
      'x-hasura-role': 'admin',
      'authorization': development_authToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      "type": "delete",
      "args": {
        "table": "airport_user",
        "where": {
          "entry_time": {
            '$lt': currentTime
          }
        },
        "returning": ["id"]
      }
    })
  };
  request(getUrl, getoptions, res, (resData1) => {
    console.log('response data : ', resData1);
  });
});


app.post('/send-notification', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": send_notification_function
}, NoMatchFoundCallback));

function send_notification_function(req, res, next) {
  var user_ids = [];
  var finalresult = [];
  var asyncTasks = [];

  var checkData = {
    "columns": ["*"],
    "where": {
      user2: req.body.user_id,
      is_liked: true
    }
  };
  var url = 'api/1/table/like/select';

  find(checkData, url, res, function(err, data1) {
    if (err) {
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    }

    for (var i = 0; i < data1.length; i++) {
      user_ids.push(data1[i].user1);
    }

    // console.log('data1 : ', data1);
    var getUrl = development_database_url + 'v1/query';

    var getoptions = {
      method: 'POST',
      headers: {
        'x-hasura-role': 'admin',
        'authorization': development_authToken,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        "type": "select",
        "args": {
          "table": "user",
          "columns": [
            "*", {
              "name": "education",
              "columns": ["*"]
            }, {
              "name": "experience",
              "columns": ["*"]
            }, {
              "name": "interests",
              "columns": ["*"]
            }, {
              "name": "flights",
              "columns": ["*"]
            }
          ],
          "where": {
            "id": req.body.user_id
          }
        }
      })
    };
    request(getUrl, getoptions, res, (resData1) => {
      if (resData1.length > 0) {
        if (resData1[0].flights.length > 0) {
          console.log('resData1 : ', resData1);
          var getoptions = {
            method: 'POST',
            headers: {
              'x-hasura-role': 'admin',
              'authorization': development_authToken,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              "type": "select",
              "args": {
                "table": "flights",
                "columns": ["*"],
                "where": {
                  "id": resData1[0].flights[0].flight_id
                }
              }
            })
          };

          request(getUrl, getoptions, res, (resData3) => {

            // console.log('resData3 : ', resData3);

            var user1_flight = resData3[0].id;
            var origin = resData3[0].origin;
            var destination = resData3[0].destination;
            var airline = resData3[0].airline;
            var user1_time = resData3[0].departure;
            var number = resData3[0].number;

            var getoptions = {
              method: 'POST',
              headers: {
                'x-hasura-role': 'admin',
                'authorization': development_authToken,
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                "type": "select",
                "args": {
                  "table": "user",
                  "columns": [
                    "*", {
                      "name": "education",
                      "columns": ["*"]
                    }, {
                      "name": "experience",
                      "columns": ["*"]
                    }, {
                      "name": "interests",
                      "columns": ["*"]
                    }, {
                      "name": "flights",
                      "columns": ["*"]
                    }
                  ],
                  "where": {
                    "id": {
                      '$in': user_ids
                    }
                  }
                }
              })
            };
            request(getUrl, getoptions, res, (resData2) => {

              // console.log('resData2 : ', resData2);

              _.forEach(resData2, function(data) {
                asyncTasks.push(function(callback) {

                  var getoptions = {
                    method: 'POST',
                    headers: {
                      'x-hasura-role': 'admin',
                      'authorization': development_authToken,
                      'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                      "type": "select",
                      "args": {
                        "table": "user",
                        "columns": [
                          "*", {
                            "name": "education",
                            "columns": ["*"]
                          }, {
                            "name": "experience",
                            "columns": ["*"]
                          }, {
                            "name": "interests",
                            "columns": ["*"]
                          }, {
                            "name": "flights",
                            "columns": ["*"]
                          }
                        ],
                        "where": {
                          "id": data.id
                        }
                      }
                    })
                  };
                  request(getUrl, getoptions, res, (
                    resData6) => {
                    // console.log('resData6 : ',
                    //   resData6);
                    if (resData6.length > 0 &&
                      resData6[0].flights.length >
                      0) {
                      var getoptions = {
                        method: 'POST',
                        headers: {
                          'x-hasura-role': 'admin',
                          'authorization': development_authToken,
                          'content-type': 'application/json'
                        },
                        body: JSON.stringify({
                          "type": "select",
                          "args": {
                            "table": "flights",
                            "columns": [
                              "*"
                            ],
                            "where": {
                              "id": resData6[
                                  0]
                                .flights[
                                  0].flight_id
                            }
                          }
                        })
                      };
                      request(getUrl,
                        getoptions,
                        res, (
                          resData5) => {
                          if (resData5.length >
                            0) {
                            // console.log('resData3 : ',
                            //   resData5);
                            // console.log(
                            //   'user2_flight : ',
                            //   resData5[0].id);
                            var user2_flight =
                              resData5[0].id;
                            var user2_origin =
                              resData5[0].origin;
                            var
                              user2_destination =
                              resData5[0].destination;
                            var user2_airline =
                              resData5[0]
                              .airline;
                            var user2_time =
                              resData5[
                                0].departure;
                            var user2_number =
                              resData5[0].number;
                          } else {
                            var user2_flight =
                              null;
                            var user2_origin =
                              '';
                            var
                              user2_destination =
                              '';
                            var user2_airline =
                              '';
                            var user2_time =
                              '';
                            var user2_number =
                              ''
                          }

                          var user_interests = [];
                          var user2_experience = [];
                          var user2_education = [];
                          var
                            user2_companyName = [];
                          var
                            user2_designation = [];
                          // var user2_flight = [];

                          // console.log(
                          //   'flight data : ',
                          //   data.flights);

                          for (var j = 0; j <
                            data.interests
                            .length; j++) {
                            user_interests.push(
                              data.interests[
                                j].interest
                            );
                          }
                          // console.log(data.experience);
                          for (var j = 0; j <
                            data.experience
                            .length; j++) {
                            user2_companyName
                              .push(
                                data.experience[
                                  j].company_name
                              );
                            user2_designation
                              .push(
                                data.experience[
                                  j].designation
                              );
                          }

                          for (var j = 0; j <
                            data.education
                            .length; j++) {
                            var education =
                              new Object({
                                f1: data.education[
                                  j].institute_name,
                                id: data.education[
                                  j].id,
                                user_id: data
                                  .education[
                                    j].user_id,
                                f2: data.education[
                                  j].qualification
                              });
                            user2_education.push(
                              education);
                          }

                          for (var j = 0; j <
                            data.experience
                            .length; j++) {
                            var experience =
                              new Object({
                                f1: data.experience[
                                  j].company_name,
                                id: data.experience[
                                  j].id,
                                user_id: data
                                  .experience[
                                    j].user_id,
                                f2: data.experience[
                                  j].designation
                              });
                            user2_experience.push(
                              experience);
                          }
                          checkData = {
                            "columns": ["*"],
                            "where": {
                              user1: req.body
                                .user_id,
                              user2: data.id,
                              is_liked: true
                            }
                          };
                          var url =
                            'api/1/table/like/select';
                          var liked_12 = null;
                          find(checkData, url,
                            res,
                            function(
                              err,
                              data2) {
                              if (data2.length >
                                0)
                                liked_12 =
                                data2[
                                  0].is_liked;
                              checkData = {
                                "columns": [
                                  "*"
                                ],
                                "where": {
                                  user1: data
                                    .id,
                                  user2: req
                                    .body
                                    .user_id,
                                  is_liked: true
                                }
                              };
                              var url =
                                'api/1/table/like/select';
                              var liked_21 =
                                null;
                              find(
                                checkData,
                                url,
                                res,
                                function(
                                  err,
                                  data3) {
                                  if (
                                    data3
                                    .length >
                                    0)
                                    liked_21 =
                                    data3[
                                      0].is_liked;
                                  var
                                    user_details =
                                    new Object({
                                      user2: parseInt(
                                        data
                                        .id
                                      ),
                                      user2_name: data
                                        .name,
                                      user2_city: data
                                        .city,
                                      user2_profile_pic: data
                                        .profile_pic,
                                      user2_intent: data
                                        .intent,
                                      user2_education: user2_education,
                                      user2_experience: user2_experience,
                                      user2_interest: user_interests,
                                      user2_facebook_id: data
                                        .facebook_id,
                                      liked_21: liked_21,
                                      liked_12: liked_12,
                                      user1_flight: user1_flight,
                                      origin: origin,
                                      destination: destination,
                                      airline: airline,
                                      user1_time: user1_time,
                                      number: number,
                                      user1: req
                                        .body
                                        .user_id,
                                      user2: data
                                        .id,
                                      user2_flight: user2_flight,
                                      user2_origin: user2_origin,
                                      user2_destination: user2_destination,
                                      user2_airline: user2_airline,
                                      user2_time: user2_time,
                                      user2_number: user2_number,
                                      city: origin
                                    });
                                  finalresult
                                    .push(
                                      user_details
                                    );
                                  callback
                                    (
                                      null,
                                      finalresult
                                    )
                                });
                            });

                        });
                    } else {
                      var user2_flight = null;

                      var user2_origin = '';

                      var user2_destination =
                        '';
                      var user2_airline = '';
                      var user2_time = '';
                      var user2_number = '';

                      var user_interests = [];
                      var user2_experience = [];
                      var user2_education = [];
                      var user2_companyName = [];
                      var user2_designation = [];
                      // var user2_flight = [];

                      // console.log(
                      //   'flight data : ',
                      //   data.flights);

                      for (var j = 0; j < data.interests
                        .length; j++) {
                        user_interests.push(
                          data.interests[
                            j].interest);
                      }
                      // console.log(data.experience);
                      for (var j = 0; j < data.experience
                        .length; j++) {
                        user2_companyName.push(
                          data.experience[
                            j].company_name);
                        user2_designation.push(
                          data.experience[
                            j].designation);
                      }

                      for (var j = 0; j < data.education
                        .length; j++) {
                        var education = new Object({
                          f1: data.education[
                            j].institute_name,
                          id: data.education[
                            j].id,
                          user_id: data.education[
                            j].user_id,
                          f2: data.education[
                            j].qualification
                        });
                        user2_education.push(
                          education);
                      }

                      for (var j = 0; j < data.experience
                        .length; j++) {
                        var experience = new Object({
                          f1: data.experience[
                            j].company_name,
                          id: data.experience[
                            j].id,
                          user_id: data.experience[
                            j].user_id,
                          f2: data.experience[
                            j].designation
                        });
                        user2_experience.push(
                          experience);
                      }
                      checkData = {
                        "columns": ["*"],
                        "where": {
                          user1: req.body.user_id,
                          user2: data.id,
                          is_liked: true
                        }
                      };
                      var url =
                        'api/1/table/like/select';
                      var liked_12 = null;
                      find(checkData, url, res,
                        function(
                          err,
                          data2) {
                          if (data2.length >
                            0)
                            liked_12 = data2[
                              0].is_liked;
                          checkData = {
                            "columns": ["*"],
                            "where": {
                              user1: data.id,
                              user2: req.body
                                .user_id,
                              is_liked: true
                            }
                          };
                          var url =
                            'api/1/table/like/select';
                          var liked_21 = null;
                          find(checkData, url,
                            res,
                            function(
                              err,
                              data3) {
                              if (data3.length >
                                0)
                                liked_21 =
                                data3[0].is_liked;
                              var
                                user_details =
                                new Object({
                                  user2: parseInt(
                                    data
                                    .id
                                  ),
                                  user2_name: data
                                    .name,
                                  user2_city: data
                                    .city,
                                  user2_profile_pic: data
                                    .profile_pic,
                                  user2_intent: data
                                    .intent,
                                  user2_education: user2_education,
                                  user2_experience: user2_experience,
                                  user2_interest: user_interests,
                                  user2_facebook_id: data
                                    .facebook_id,
                                  liked_21: liked_21,
                                  liked_12: liked_12,
                                  user1_flight: user1_flight,
                                  origin: origin,
                                  destination: destination,
                                  airline: airline,
                                  user1_time: user1_time,
                                  number: number,
                                  user1: req
                                    .body
                                    .user_id,
                                  user2: data
                                    .id,
                                  user2_flight: user2_flight,
                                  user2_origin: user2_origin,
                                  user2_destination: user2_destination,
                                  user2_airline: user2_airline,
                                  user2_time: user2_time,
                                  user2_number: user2_number,
                                  city: origin
                                });
                              finalresult.push(
                                user_details
                              );
                              callback(null,
                                finalresult
                              )
                            });
                        });
                    }
                  });
                });
              });
              async.parallel(asyncTasks, function(err,
                result) {
                res.json({
                  data: finalresult,
                  error: {
                    code: 200,
                    message: 'success',
                    errors: ""
                  }
                });
              });
            });
          });
        } else {
          res.json({
            data: finalresult,
            error: {
              code: 200,
              message: 'success',
              errors: ""
            }
          })
        }
      } else {
        res.json({
          data: finalresult,
          error: {
            code: 200,
            message: 'success',
            errors: ""
          }
        })
      }
    });
  });
}


app.post('/add-flight', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": add_flight_function
}, NoMatchFoundCallback));

function add_flight_function(req, res, next) {
  var finalresult = [];
  var asyncTasks = [];
  var userdata = req.body.flights;
  _.forEach(userdata, function(data) {
    asyncTasks.push(function(callback) {
      // console.log('flight_id : ', parseInt(data.flight_id));
      // console.log('user_id : ', parseInt(data.user_id));
      var getUrl = development_database_url + 'v1/query';
      var getoptions = {
        method: 'POST',
        headers: {
          'x-hasura-role': 'admin',
          'authorization': development_authToken,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          "type": "select",
          "args": {
            "table": "user_flight",
            "columns": ["*"],
            "where": {
              flight_id: parseInt(data.flight_id),
              user_id: parseInt(data.user_id)
            }
          }
        })
      };
      request(getUrl, getoptions, res, (resData1) => {
        // console.log('resData1', resData1);
        if (resData1.length > 0) {
          callback(null, finalresult);
        } else {

          var insertUrl = development_database_url +
            'api/1/table/user_flight/insert';
          var user_airport_details_object = new Object({
            user_id: parseInt(data.user_id),
            flight_id: parseInt(data.flight_id),
            pnr: data.pnr
          });

          var insertOpts = {
            method: 'POST',
            body: JSON.stringify({
              objects: [{
                user_id: parseInt(data.user_id),
                flight_id: parseInt(data.flight_id),
                pnr: data.pnr
              }]
            }),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': development_authToken,
              'X-Hasura-Role': 'admin'
            }
          };
          // console.log('user_airport_details',
          //   user_airport_details_object);
          request_function(insertUrl, insertOpts, res,
            function(
              err,
              response) {
              // console.log('err2 : ', err);
              if (err) {
                res.json({
                  data: [],
                  error: {
                    code: 500,
                    message: 'Backend Error',
                    errors: err
                  }
                });
              } else {
                finalresult.push(
                  user_airport_details_object);
                callback(null, finalresult);
              }
            });
        }
      });
    });
  });

  async.parallel(asyncTasks, function(err, result) {
    res.json({
      data: finalresult,
      error: {
        code: 200,
        message: 'success',
        errors: ""
      }
    });
  });
}

app.get('/get-user-flight', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": get_user_flight_function
}, NoMatchFoundCallback));

function get_user_flight_function(req, res, next) {
  var asyncTasks = [];
  var finalresult = [];
  var url = 'api/1/table/user_flight/select';
  var checkData = {
    "columns": ["*"],
    where: {
      user_id: parseInt(req.query.user_id)
    }
  };

  find(checkData, url, res, function(err, result) {
    if (err)
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    _.forEach(result, function(data) {
      asyncTasks.push(function(callback) {
        var getUrl = development_database_url + 'v1/query';
        var getoptions = {
          method: 'POST',
          headers: {
            'x-hasura-role': 'admin',
            'authorization': development_authToken,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            "type": "select",
            "args": {
              "table": "flights",
              "columns": ["*"],
              "where": {
                "id": parseInt(data.flight_id)
              }
            }
          })
        };

        request(getUrl, getoptions, res, (flight_details) => {
          var user_airport_details_object = new Object({
            flight_id: parseInt(data.flight_id),
            pnr: data.pnr,
            flights: flight_details[0]
          });
          finalresult.push(user_airport_details_object);
          callback(null, finalresult);
        });
      });
    });
    async.parallel(asyncTasks, function(err, result) {
      res.json({
        data: finalresult,
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    });
  });
}

app.post('/remove-user-flight', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": remove_user_flight_function
}, NoMatchFoundCallback));

function remove_user_flight_function(req, res, next) {
  var getUrl = development_database_url + 'v1/query';
  var getoptions = {
    method: 'POST',
    headers: {
      'x-hasura-role': 'admin',
      'authorization': development_authToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      "type": "delete",
      "args": {
        "table": "user_flight",
        "where": {
          user_id: parseInt(req.body.user_id),
          flight_id: parseInt(req.body.flight_id),
          pnr: req.body.pnr_number
        }
      }
    })
  };
  request(getUrl, getoptions, res, (resData6) => {
    res.json({
      data: {
        user_id: parseInt(req.body.user_id),
        flight_id: parseInt(req.body.flight_id),
        pnr: req.body.pnr
      },
      error: {
        code: 200,
        message: 'success',
        errors: ""
      }
    });
  });
}

app.post('/user-flight-exit', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": user_flight_exit_function
}, NoMatchFoundCallback));

function user_flight_exit_function(req, res, next) {

  var flightId = parseInt(req.body.flight_id);
  var userId = parseInt(req.body.user_id);
  var pnr = req.body.pnr;
  const checkData = {
    columns: ['*', {
      "name": "flights",
      "columns": ["*"]
    }],
    where: {
      flight_id: flightId,
      user_id: userId,
      pnr: pnr
    }
  };
  var url = 'api/1/table/user_flight/select';
  find(checkData, url, res, function(err, data) {
    if (err) {
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    }
    if (data.length > 0) {
      var getUrl = development_database_url + 'v1/query';
      var getoptions = {
        method: 'POST',
        headers: {
          'x-hasura-role': 'admin',
          'authorization': development_authToken,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          "type": "delete",
          "args": {
            "table": "user_flight",
            "where": {
              flight_id: flightId,
              user_id: userId,
              pnr: pnr
            }
          }
        })
      };
      request(getUrl, getoptions, res, (resData1) => {
        res.json({
          data: data[0].flights,
          error: {
            code: 200,
            message: 'success',
            errors: ""
          }
        });
      });
    } else {
      res.json({
        data: [],
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    }
  });
}

app.get('/get-user-details', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": get_user_detail_function
}, NoMatchFoundCallback));

function get_user_detail_function(req, res, next) {
  var getUrl = development_database_url +
    'v1/query';

  var getoptions = {
    method: 'POST',
    headers: {
      'x-hasura-role': 'admin',
      'authorization': development_authToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      "type": "select",
      "args": {
        "table": "user",
        "columns": [
          "*", {
            "name": "education",
            "columns": ["*"]
          }, {
            "name": "experience",
            "columns": ["*"]
          }, {
            "name": "interests",
            "columns": ["*"]
          }
        ],
        "where": {
          "id": parseInt(req.query.user_id)
        }
      }
    })
  };
  request(getUrl, getoptions, res, (
    userdata) => {
    if (userdata.length > 0) {
      var data = userdata[0];


      var user_interests = [];
      var user2_experience = [];
      var user2_education = [];
      // var user2_companyName = [];
      // var user2_designation = [];

      for (var j = 0; j < data.interests
        .length; j++) {
        user_interests.push(
          data.interests[
            j].interest);
      }

      for (var j = 0; j < data.education
        .length; j++) {
        var education = new Object({
          f1: data.education[
            j].institute_name,
          id: data.education[
            j].id,
          user_id: data.education[
            j].user_id,
          f2: data.education[
            j].qualification
        });
        user2_education.push(
          education);
      }

      for (var j = 0; j < data.experience
        .length; j++) {
        var experience = new Object({
          f1: data.experience[
            j].company_name,
          id: data.experience[
            j].id,
          user_id: data.experience[
            j].user_id,
          f2: data.experience[
            j].designation
        });
        user2_experience.push(
          experience);
      }
      var
        user_details =
        new Object({
          user_id: parseInt(
            data
            .id
          ),
          user_name: data
            .name,
          user_city: data
            .city,
          user_profile_pic: data
            .profile_pic,
          user_intent: data
            .intent,
          user_education: user2_education,
          user_experience: user2_experience,
          user_interest: user_interests,
          user_facebook_id: data
            .facebook_id
        });
      res.json({
        data: [user_details],
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    } else {
      res.json({
        data: [],
        error: {
          code: 200,
          message: 'success',
          errors: ""
        }
      });
    }
  });
}

app.get('/get-all-cities', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": get_all_cities_function
}, NoMatchFoundCallback));

function get_all_cities_function(req, res, next) {
  var getUrl = development_database_url +
    'v1/query';

  var getoptions = {
    method: 'POST',
    headers: {
      'x-hasura-role': 'admin',
      'authorization': development_authToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      "type": "select",
      "args": {
        "table": "airport",
        "columns": ["*"]
      }
    })
  };
  request(getUrl, getoptions, res, (data) => {
    var cities = [];
    for (var i = 0; i < data.length; i++)
      cities.push(data[i].city);

    res.json({
      data: cities,
      error: {
        code: 200,
        message: 'success',
        errors: ""
      }
    });
  });
}

app.get('/get-all-interest', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": get_all_interest_function
}, NoMatchFoundCallback));

function get_all_interest_function(req, res, next) {
  var getUrl = development_database_url +
    'v1/query';

  var getoptions = {
    method: 'POST',
    headers: {
      'x-hasura-role': 'admin',
      'authorization': development_authToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      "type": "select",
      "args": {
        "table": "user_interest",
        "columns": ["*"]
      }
    })
  };
  request(getUrl, getoptions, res, (data) => {
    var interests = [];
    for (var i = 0; i < data.length; i++) {
      if (interests.indexOf(data[i].interest) === -1)
        interests.push(data[i].interest);
    }
    res.json({
      data: interests,
      error: {
        code: 200,
        message: 'success',
        errors: ""
      }
    });
  });
}

app.get('/update-flight-time', routesVersioning({
  "~1.0.0": versionavailable,
  "~2.0.0": versionavailable,
  "~3.0.0": update_flight_time_function
}, NoMatchFoundCallback));

function update_flight_time_function(req, res, next) {
  var asyncTasks = [];
  var finalresult = [];
  var url = 'api/1/table/flight/select';
  var checkData = {
    "columns": ["*"]
  };

  find(checkData, url, res, function(err, result) {
    if (err)
      res.json({
        data: [],
        error: {
          code: 500,
          message: 'Backend Error',
          errors: err
        }
      });
    _.forEach(result, function(data) {
      asyncTasks.push(function(callback) {

        callback(null, finalresult);
      });
    });
  });
  async.parallel(asyncTasks, function(err, result) {
    res.json({
      data: finalresult,
      error: {
        code: 200,
        message: 'success',
        errors: ""
      }
    });
  });
}

app.post('/send-feedback', (req, res) => {
  const chunk = req.body;
  // const userid = chunk.user_id;
  const usermail = chunk.usermail;
  const feedbackmsg = chunk.feedback_msg;
  // console.log('response =', res);
  res.send(mail.sendmail(usermail, feedbackmsg));
});

app.post('/appversion', (req, res) => {
  // const appcurrentversion = '1.0';
  const version = req.body.version;
  const message = 'OK';
  console.log('version =', version);
  const response = {
    appversion: '1.0',
    msg: message
  };
  if (version === androidversion) {
    res.set('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(response));
  } else {
    response.msg = 'Force Update';
    res.set('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(response));
  }
});

const sockets = {};
io.on('connection', (socket) => {
  console.log('User connected: ' + socket.id);

  if (socket.handshake.headers['x-hasura-user-role'] ===
    'anonymous') {
    return;
  }

  const userId = socket.handshake.headers['x-hasura-user-id'];
  sockets[userId] = socket;
  console.log('Socket handshake accepted from: ' + userId.toString());

  socket.on('chat message', (_params) => {
    // DEBUG
    // console.log(socket.handshake.headers);
    try {
      const params = JSON.parse(_params);
      params.from = parseInt(userId, 10);

      const senderUsername = params.from_username;
      const msg = params.message;
      const user = {
        from: params.from,
        to: params.to
      };
      const chattimestamp = params.timeStamp;

      const connectionCheckData = {
        columns: ['*'],
        where: {
          $or: [{
            $and: [{
              user1: user.from
            }, {
              user2: user.to
            }]
          }, {
            $and: [{
              user1: user.to
            }, {
              user2: user.from
            }]
          }]
        }
      };

      const connectionCheckUrl = url +
        '/api/1/table/connections/select';
      const connectionCheckOpts = {
        method: 'POST',
        headers,
        body: JSON.stringify(connectionCheckData)
      };

      request(connectionCheckUrl, connectionCheckOpts,
        null, (
          checkResult) => {
          if (checkResult === 0) {
            socket.emit('chat message',
              'You don\'t have a connection with user'
            );
          } else {
            const user1 = (user.from < user.to) ? user.from :
              user.to;
            const user2 = (user.from < user.to) ? user.to :
              user.from;
            // const chattimestamp = (new Date()).toISOString();
            const messageInsertData = JSON.stringify({
              objects: [{
                user1,
                user2,
                sender: user.from,
                  text: msg,
                  timestamp: chattimestamp
              }]
            });

            const messageInsertUrl = url +
              '/api/1/table/message/insert';
            const messageInsertOpts = {
              method: 'POST',
              headers,
              body: messageInsertData
            };

            request(messageInsertUrl, messageInsertOpts,
              null, () => {
                console.log('message:' + msg);
                if (sockets[user.to]) {
                  const toSocket = sockets[user.to];
                  toSocket.emit('chat message', JSON.stringify({
                    from_user: user.from,
                    from_username: senderUsername,
                    message: msg,
                    timeStamp: chattimestamp
                  }));
                } else { // No socket for the to user active at the moment
                  const tokenData = {
                    columns: ['device_token',
                      'device_type'
                    ],
                    where: {
                      id: user.to
                    }
                  };
                  const getTokenUrl = url +
                    '/api/1/table/user/select';
                  const getTokenOpts = {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(tokenData)
                  };

                  request(getTokenUrl, getTokenOpts,
                    null, (
                      tokenResult) => {
                      const receiver = tokenResult[
                        0];
                      const message = {
                        to: receiver.device_token,
                        collapse_key: 'my_collapse_key',
                        priority: 'high',
                        data: {
                          from_user: user.from,
                          from_username: senderUsername,
                          message: msg,
                          type: 'chat-notif'
                        }
                      };
                      if (receiver.device_type ===
                        'ios') {
                        message.notification = {
                          title: senderUsername,
                          body: msg,
                          sound: 'default',
                          badge: 1
                        };
                      }

                      fcm.send(message, (err, res) => {
                        if (err) {
                          console.log('err: ',
                            err);
                          console.log('res: ',
                            res);
                          console.log(
                            'Something has gone wrong!'
                          );
                        } else {
                          console.log(
                            'Successfully sent with response: ',
                            res);
                        }
                      });
                    });
                }
              });
          }
        });
    } catch (e) {
      console.error(e);
      console.error(e.stack);
      console.error(
        'Some error in the "chat message" event');
    }
  });

  socket.on('disconnect', () => {
    if (userId) {
      sockets[userId] = null;
      console.log('User: ' + userId + ' disconnected');
    }
  });
});


// Listen at the server
if (config.port) {
  server.listen(config.port, config.host, (err) => {
    if (err) {
      console.error(err);
    }
    console.info(
      '----\n==> ✅  %s is running, talking to API server.',
      config.app.title);
    console.info(
      '==> 💻  Open http://%s:%s in a browser to view the app.',
      config.host, config.port);
  });
} else {
  console.error(
    '==>     ERROR: No PORT environment variable has been specified'
  );
}
