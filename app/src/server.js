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
var moment = require('moment-timezone');
var production_database_url = 'https://data.ailment92.hasura-app.io/';
var development_database_url = 'https://data.stellar60.hasura-app.io/';
var production_authToken = 'Bearer 287vcpq6gu1p367t89czx66n0jroy4aa';
var development_authToken = 'Bearer 1bpdlrcrztryt2fiyts2tb9oeyzvav4z';
var _ = require('lodash');
let authUserId = '0';

// Express Logging Middleware
if (global.__DEVELOPMENT__)
  app.use(morgan('combined'));
else
  app.use(morgan(
    '[:date[clf]]: :method :url :status :res[content-length] - :response-time ms'
  ));

// Parse JSON bodies
app.use(bodyParser.json());
app.use('/static', Express.static('static'));

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
          is_liked: true
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
  const secret = 'b3fe1de6674a29c50b98837e030ec15a';
  // 3i7ca5ub8r6586ol5wpvyfm5b61om0hc live Token
  // b3fe1de6674a29c50b98837e030ec15a staging Token
  const hash = crypto.createHmac('sha256', secret).update(input.userToken).digest(
    'hex');

  const url =
    `https://graph.facebook.com/v2.8/${input.otherId}?fields=context.fields%28all_mutual_friends.limit%28100%29%29&access_token=${input.userToken}&appsecret_proof=${hash}`;
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + input.myToken
    }
  };
  request(url, options, res, (data) => {
    console.log(JSON.stringify(data));
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(data));
  });
});



// app.post('/flight-check', (req, res) => {
//
//   const input = req.body;
//   var flightCode = input.flight_number.substring(0, 2);
//   var flightNumber = input.flight_number.substring(2);
//   var d = new Date(input.tomorrow_date);
//   var departYear = d.getFullYear();
//   var departMonth = d.getMonth() + 1;
//   var departDay = d.getDate();
//
//   const getUrl =
//     'http://data.hasura/v1/template/get_flights?today_date=${input.today_date}&tomorrow_date=${input.tomorrow_date}&flight_number=${input.flight_number}';
//   const getFlightOpts = {
//     method: 'GET',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': 'Bearer 6qusdur34ris9ar35aan9onkq7a3c383',
//       'X-Hasura-Role': 'admin',
//       'X-Hasura-User-Id': 1
//     }
//   };
//   request(getUrl, getFlightOpts, res, (resData) => {
//     if (resData.length < 1) {
//       const url1 =
//         `https://api.flightstats.com/flex/schedules/rest/v1/json/flight/${flightCode}/${flightNumber}/departing/${departYear}/${departMonth}/${departDay}?appId=7c7b6a76&appKey=40a9cba98bd34a470328391666ce9df8&utc=true`;
//       const options = {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       };
//       request(url1, options, res, (data) => {
//         var airline = data.appendix.airlines;
//         var flightName = "";
//         var airports = data.appendix.airports;
//         var flights = data.scheduledFlights;
//         if (flights.length == 1) {
//           var depCode = flights[0].departureAirportFsCode;
//           var destination = airports[0].city;
//           var depTime = flights[0].departureTime.substring(0,
//             flights[0].departureTime.indexOf('.'))
//           depTime = depTime + 'Z';
//
//           var origin = airports[airports.length - 1].city;
//
//           var arrCode = flights[0].arrivalAirportFsCode;
//           // var arrTime = new Date(flights[0].arrivalTime).toISOString();
//           var arrTime = flights[0].arrivalTime.substring(0, flights[
//             0].arrivalTime.indexOf('.'))
//           arrTime = arrTime + 'Z';
//
//           for (var i = 0; i < airline.length; i++) {
//             if (airline[i].fs == flightCode) {
//               flightName = airline[i].name;
//             }
//           }
//
//           const insertUrl =
//             'http://data.hasura/api/1/table/flights/insert';
//           const insertOpts = {
//             method: 'POST',
//             body: JSON.stringify({
//               objects: [{
//
//                 number: input.flight_number,
//                 airline: flightName,
//                 origin_code: depCode,
//                 destination_code: arrCode,
//                 departure: depTime,
//                 arrival: arrTime,
//                 origin: origin,
//                 destination: destination,
//                 op_days: "444"
//               }]
//             }),
//             headers: {
//               'Content-Type': 'application/json',
//               'Authorization': 'Bearer 6qusdur34ris9ar35aan9onkq7a3c383',
//               'X-Hasura-Role': 'admin',
//               'X-Hasura-User-Id': 1
//             }
//           };
//           request(insertUrl, insertOpts, res, (resData) => {
//             const getUrl =
//               'http://data.hasura/v1/template/get_flights?today_date=${input.today_date}&tomorrow_date=${input.tomorrow_date}&flight_number=${input.flight_number}';
//             const getFlightOpts = {
//               method: 'GET',
//               headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': 'Bearer 6qusdur34ris9ar35aan9onkq7a3c383',
//                 'X-Hasura-Role': 'user',
//                 'X-Hasura-User-Id': 1
//               }
//             };
//             request(getUrl, getFlightOpts, res, (resData) => {
//
//               res.send(resData);
//             })
//           });
//         } else if (flights.length == 2) {
//
//           var depCode = flights[0].departureAirportFsCode;
//           var arrCode = flights[0].arrivalAirportFsCode;
//           var depTime = flights[0].departureTime.substring(0,
//             flights[0].departureTime.indexOf('.'))
//           depTime = depTime + 'Z';
//           var arrTime = flights[0].arrivalTime.substring(0, flights[
//             0].arrivalTime.indexOf('.'))
//           arrTime = arrTime + 'Z';
//           var destination = airports[airports.length - 2].city;
//           var origin = airports[airports.length - 1].city;
//
//           var depCode1 = flights[1].departureAirportFsCode;
//           var arrCode1 = flights[1].arrivalAirportFsCode;
//           var depTime1 = flights[1].departureTime.substring(0,
//             flights[1].departureTime.indexOf('.'))
//           depTime1 = depTime + 'Z';
//           var arrTime1 = flights[1].arrivalTime.substring(0,
//             flights[1].arrivalTime.indexOf('.'))
//           arrTime1 = arrTime + 'Z';
//           var destination1 = airports[0].city;
//           var origin1 = airports[airports.length - 2].city;
//
//
//           for (var i = 0; i < airline.length; i++) {
//             if (airline[i].fs == flightCode) {
//               flightName = airline[i].name;
//             }
//           }
//
//           const insertUrl =
//             'http://data.hasura/api/1/table/flights/insert';
//           const insertOpts = {
//             method: 'POST',
//             body: JSON.stringify({
//               objects: [{
//
//                 number: input.flight_number,
//                 airline: flightName,
//                 origin_code: depCode,
//                 destination_code: arrCode,
//                 departure: depTime,
//                 arrival: arrTime,
//                 origin: origin,
//                 destination: destination,
//                 op_days: "444"
//               }, {
//
//                 number: input.flight_number,
//                 airline: flightName,
//                 origin_code: depCode1,
//                 destination_code: arrCode1,
//                 departure: depTime1,
//                 arrival: arrTime1,
//                 origin: origin1,
//                 destination: destination1,
//                 op_days: ""
//               }]
//             }),
//             headers: {
//               'Content-Type': 'application/json',
//               'Authorization': 'Bearer 6qusdur34ris9ar35aan9onkq7a3c383',
//               'X-Hasura-Role': 'admin'
//             }
//           };
//           request(insertUrl, insertOpts, res, (resData) => {
//             const getUrl =
//               'http://data.hasura/v1/template/get_flights?today_date=${input.today_date}&tomorrow_date=${input.tomorrow_date}&flight_number=${input.flight_number}';
//             const getFlightOpts = {
//               method: 'GET',
//               headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': 'Bearer 6qusdur34ris9ar35aan9onkq7a3c383',
//                 'X-Hasura-Role': 'user'
//               }
//             };
//             request(getUrl, getFlightOpts, res, (resData) => {
//
//               res.send(resData);
//             })
//           });
//
//
//
//         } else {
//           res.send({
//             msg: 'No Flight Found'
//           });
//         }
//
//       });
//     } else {
//       res.send(resData);
//     }
//   });
// });


app.post('/flight-check', (req, res) => {

  const input = req.body;
  input.flight_number = input.flight_number.toUpperCase();
  var flightCode = (input.flight_number.substring(0, 2)).toUpperCase();
  var flightNumber = input.flight_number.substring(2);
  var check = moment(input.today_date.toString(), 'YYYY/MM/DD');
  var departMonth = check.format('M')
  var departDay = check.format('D')
  var departYear = check.format('YYYY');
  var today_date = input.today_date;
  var tomorrow_date = input.tomorrow_date;

  // console.log('input.flight_number : ', input.flight_number);
  //
  // var getUrl = development_database_url +
  //   'v1/template/get_flights?today_date=' +
  //   today_date + '&tomorrow_date=' +
  //   tomorrow_date + '&flight_number=' +
  //   input.flight_number;
  // var getFlightOpts = {
  //   method: 'GET',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': development_authToken,
  //     'X-Hasura-Role': 'admin',
  //     'X-Hasura-User-Id': 1
  //   }
  // };
  // request(getUrl, getFlightOpts, res, (resData) => {
  //   if (resData.length < 1) {
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



  request(url1, options, res, (data) => {
    // console.log('resData : ', data);
    var airline = data.appendix.airlines;
    var flightName = "";
    var airports = data.appendix.airports;
    var flights = data.scheduledFlights;

    if (flights.length == 1) {
      var depCode = flights[0].departureAirportFsCode;
      var origin = airports[airports.length - 2].city;
      var destination = airports[airports.length - 1].city;
      var arrCode = flights[0].arrivalAirportFsCode;
      for (var i = 0; i < airline.length; i++) {
        if (airline[i].fs == flightCode || airline[i].fs == (
            flightCode + '*')) {
          flightName = airline[i].name;
        }
      }

      for (var i = 0; i < airports.length; i++) {
        if (airports[i].fs == arrCode) {
          destination = airports[i].city;
        }
      }

      for (var i = 0; i < airports.length; i++) {
        if (airports[i].fs == depCode) {
          origin = airports[i].city;
        }
      }

      //
      // console.log('origin : ', origin);
      // console.log('destination : ', destination);

      var depTime = moment.utc(data.scheduledFlights[0].departureTime)
        .format();

      var arrTime = moment.utc(data.scheduledFlights[0].arrivalTime)
        .format();


      var depTimeX = moment.tz(data.scheduledFlights[0].departureTime,
        data.appendix.airports[0].timeZoneRegionName.toString()
      ).format("YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      var arrTimeX = moment.tz(data.scheduledFlights[0].arrivalTime,
        data.appendix.airports[1].timeZoneRegionName.toString()
      ).format("YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      console.log('depTimeX : ', depTimeX);
      // console.log('arrTimeX : ', arrTimeX);

      var result_depTime = moment.utc(depTimeX).format(
        "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");
      var result_arrTime = moment.utc(arrTimeX).format(
        "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      // console.log('result_depTime : ', result_depTime);
      // console.log('result_arrTime : ', result_arrTime);

      const connectionCheckData = {
        columns: ['*'],
        where: {
          number: input.flight_number,
          airline: flightName,
          origin_code: depCode,
          destination_code: arrCode,
          origin: origin,
          destination: destination,
          departure: result_depTime,
          arrival: result_arrTime,
        }
      };

      const connectionCheckUrl = development_database_url +
        'api/1/table/flights/select';
      const connectionCheckOpts = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': development_authToken,
          'X-Hasura-Role': 'admin',
          'X-Hasura-User-Id': 1
        },
        body: JSON.stringify(connectionCheckData)
      };

      request(connectionCheckUrl, connectionCheckOpts, null, (
        checkResult) => {
        if (checkResult.length != 0) {
          for (var i = 0; i < checkResult.length; i++) {
            delete checkResult[i].eff_from;
            delete checkResult[i].eff_till;
            delete checkResult[i].op_days;
          }
          res.send(checkResult);
        } else {
          var insertUrl = development_database_url +
            'api/1/table/flights/insert';
          var insertOpts = {
            method: 'POST',
            body: JSON.stringify({
              objects: [{
                number: input.flight_number,
                airline: flightName,
                origin_code: depCode,
                destination_code: arrCode,
                departure: result_depTime,
                arrival: result_arrTime,
                origin: origin,
                destination: destination,
                op_days: "444"
              }],
              "returning": ["id"]
            }),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': development_authToken,
              'X-Hasura-Role': 'admin',
              'X-Hasura-User-Id': 1
            }
          };

          request(insertUrl, insertOpts, res, (resData) => {

            var getUrl = development_database_url +
              'v1/template/get_flights?today_date=' +
              today_date + '&tomorrow_date=' +
              tomorrow_date + '&flight_number=' +
              input.flight_number
            var getFlightOpts = {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': development_authToken,
                'X-Hasura-Role': 'admin',
                'X-Hasura-User-Id': 1
              }
            };

            var result = [{
              id: resData.returning[0].id,
              number: input.flight_number,
              airline: flightName,
              origin_code: depCode,
              destination_code: arrCode,
              departure: result_depTime,
              arrival: result_arrTime,
              origin: origin,
              destination: destination
            }];
            request(getUrl, getFlightOpts, res, (
              resData) => {
              res.send(result);
            });
          });
        }
      });
    } else if (flights.length == 2) {

      var depCode = (flights[0].departureAirportFsCode).toUpperCase();
      var arrCode = (flights[0].arrivalAirportFsCode).toUpperCase();
      // var destination = airports[1].city;
      // var origin = airports[0].city;
      var origin = "";
      var destination1 = "";
      for (var i = 0; i < airline.length; i++) {
        if (airline[i].fs == flightCode) {
          flightName = airline[i].name;
        }
      }

      for (var i = 0; i < airports.length; i++) {
        if (airports[i].fs == arrCode)
          destination = airports[i].city
        if (airports[i].fs == depCode)
          origin = airports[i].city
      }

      var depTime = moment.utc(data.scheduledFlights[0].departureTime)
        .format();

      var arrTime = moment.utc(data.scheduledFlights[0].arrivalTime)
        .format();

      var depTimeX = moment.tz(data.scheduledFlights[0].departureTime,
        data.appendix.airports[0].timeZoneRegionName.toString()
      ).format("YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      var arrTimeX = moment.tz(data.scheduledFlights[0].arrivalTime,
        data.appendix.airports[1].timeZoneRegionName.toString()
      ).format("YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      // console.log('2depTimeX : ', depTimeX);
      // console.log('2arrTimeX : ', arrTimeX);

      var result_depTime = moment.utc(depTimeX).format(
        "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");
      var result_arrTime = moment.utc(arrTimeX).format(
        "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      // console.log('2result_depTime : ', result_depTime);
      // console.log('2result_arrTime : ', result_arrTime);


      var depCode1 = (flights[1].departureAirportFsCode).toUpperCase();
      var arrCode1 = (flights[1].arrivalAirportFsCode).toUpperCase();
      // var origin1 = airports[1].city;
      // var destination1 = airports[2].city;

      var origin1 = "";
      var destination1 = "";

      for (var i = 0; i < airports.length; i++) {
        if (airports[i].fs == arrCode1)
          destination1 = airports[i].city;
        if (airports[i].fs == depCode1)
          origin1 = airports[i].city;
      }

      var depTime1 = moment.utc(data.scheduledFlights[1].departureTime)
        .format();

      var arrTime1 = moment.utc(data.scheduledFlights[1].arrivalTime)
        .format();

      var depTimeX1 = moment.tz(data.scheduledFlights[1].departureTime,
        data.appendix.airports[2].timeZoneRegionName.toString()
      ).format("YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      var arrTimeX1 = moment.tz(data.scheduledFlights[1].arrivalTime,
        data.appendix.airports[2].timeZoneRegionName.toString()
      ).format("YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      console.log('2depTimeX1 : ', depTimeX1);
      // console.log('2arrTimeX1 : ', arrTimeX1);

      var result_depTime1 = moment.utc(depTimeX).format(
        "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");
      var result_arrTime1 = moment.utc(arrTimeX).format(
        "YYYY-MM-DD" + 'T' + "HH:mm:ss" + "Z");

      // console.log('2result_depTime1 : ', result_depTime1);
      // console.log('2result_arrTime1 : ', result_arrTime1);
      // console.log(flightName);

      const connectionCheckData = {
        columns: ['*'],
        where: {
          number: input.flight_number,
          airline: flightName,
          $and: [{
            $or: [{
              departure: result_depTime
            }, {
              departure: result_depTime
            }],
            $or: [{
              arrival: result_arrTime
            }, {
              arrival: result_arrTime1
            }]
          }]
        }
      };

      const connectionCheckUrl = development_database_url +
        'api/1/table/flights/select';
      const connectionCheckOpts = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': development_authToken,
          'X-Hasura-Role': 'admin',
          'X-Hasura-User-Id': 1
        },
        body: JSON.stringify(connectionCheckData)
      };

      request(connectionCheckUrl, connectionCheckOpts, null, (
        checkResult) => {
        // console.log('checkResult : ', checkResult);
        if (checkResult.length != 0) {
          for (var i = 0; i < checkResult.length; i++) {
            delete checkResult[i].eff_from;
            delete checkResult[i].eff_till;
            delete checkResult[i].op_days;
          }
          res.send(checkResult);
        } else {
          var insertUrl = development_database_url +
            'api/1/table/flights/insert';
          var insertOpts = {
            method: 'POST',
            body: JSON.stringify({
              objects: [{
                number: input.flight_number,
                airline: flightName,
                origin_code: depCode,
                destination_code: arrCode,
                departure: result_depTime,
                arrival: result_arrTime,
                origin: origin,
                destination: destination
              }, {
                number: input.flight_number,
                airline: flightName,
                origin_code: depCode1,
                destination_code: arrCode1,
                departure: result_depTime1,
                arrival: result_arrTime1,
                origin: origin1,
                destination: destination1
              }],
              "returning": ["id"]
            }),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': development_authToken,
              'X-Hasura-Role': 'admin'
            }
          };
          request(insertUrl, insertOpts, res, (resData) => {
            var result = [{
              id: resData.returning[0].id,
              number: input.flight_number,
              airline: flightName,
              origin_code: depCode,
              destination_code: arrCode,
              departure: result_depTime,
              arrival: result_arrTime,
              origin: origin,
              destination: destination
            }, {
              id: resData.returning[1].id,
              number: input.flight_number,
              airline: flightName,
              origin_code: depCode1,
              destination_code: arrCode1,
              departure: result_depTime1,
              arrival: result_arrTime1,
              origin: origin1,
              destination: destination1
            }];
            // console.log('result : ', result);
            res.send(result);
          });
        }
      });
    } else {
      res.send({
        msg: 'No Flight Found'
      });
    }
  });
  //   } else {
  //     console.log('exit');
  //     res.send(resData);
  //   }
  // });
});


app.get('/frequent-fliers', (req, res) => {

  var finalresult = [];
  var ids = [];
  var getUrl = production_database_url + 'v1/query';
  var getoptions = {
    method: 'POST',
    headers: {
      'x-hasura-role': 'admin',
      'authorization': production_authToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      type: 'run_sql',
      args: {
        sql: 'SELECT count(c.user_id) AS count, c.user_id  FROM user_flight c  GROUP BY c.user_id  ORDER BY count DESC LIMIT 10'
      }
    })
  };

  request(getUrl, getoptions, res, (resData) => {
    var result = [];
    for (var i = 1; i < resData.result.length; i++) {
      var object = {};
      for (var j = 0; j < resData.result[i].length; j++) {
        object[resData.result[0][j]] = resData.result[i][j];
      }
      result.push(object);
      ids.push(parseInt(object.user_id));
    }

    var getoptions = {
      method: 'POST',
      headers: {
        'x-hasura-role': 'admin',
        'authorization': production_authToken,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        "type": "select",
        "args": {
          "table": "user",
          "columns": ["*"],
          "where": {
            "id": {
              '$in': ids
            }
          }
        }
      })
    };
    console.
    request(getUrl, getoptions, res, (resData1) => {
      for (var i = 0; i < resData1.length; i++) {
        finalresult.push({
          userId: parseInt(result[i].user_id),
          total_flights_count: result[i].count,
          userDetail: resData1[i]
        });
      }
      res.send(finalresult);
    });
  });
});

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

  if (socket.handshake.headers['x-hasura-user-role'] === 'anonymous') {
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

      request(connectionCheckUrl, connectionCheckOpts, null, (
        checkResult) => {
        if (checkResult === 0) {
          socket.emit('chat message',
            'You don\'t have a connection with user');
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

          request(messageInsertUrl, messageInsertOpts, null, () => {
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
                columns: ['device_token', 'device_type'],
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

              request(getTokenUrl, getTokenOpts, null, (
                tokenResult) => {
                const receiver = tokenResult[0];
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
                if (receiver.device_type === 'ios') {
                  message.notification = {
                    title: senderUsername,
                    body: msg,
                    sound: 'default',
                    badge: 1
                  };
                }

                fcm.send(message, (err, res) => {
                  if (err) {
                    console.log('err: ', err);
                    console.log('res: ', res);
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
      console.error('Some error in the "chat message" event');
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
    console.info('----\n==> ✅  %s is running, talking to API server.',
      config.app.title);
    console.info(
      '==> 💻  Open http://%s:%s in a browser to view the app.',
      config.host, config.port);
  });
} else {
  console.error(
    '==>     ERROR: No PORT environment variable has been specified');
}
