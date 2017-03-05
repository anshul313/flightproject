// var mongoose = require('mongoose'),
//   Device = mongoose.model('Device'),
//   modusers = mongoose.model('modusers');
//
// exports.userAuthenticate = function(req, res, next) {
//   var authKey = req.headers.authorization;
//   if (!authKey) return res.status(400).json({
//     'message': 'Authkey needed'
//   });
//   Device.find({
//     authToken: authKey
//   }).exec(function(err, device) {
//     if (err) return res.status(500).send('Unexpected authorization error');
//     if (!device || (device.length === 0)) {
//       return res.status(403).json({
//         message: 'User is not authorized'
//       });
//     }
//     req.device = device[0];
//     return next();
//   });
// };
//
// exports.moduserAuthenticate = function(req, res, next) {
//   // var authKey = req.headers.authorization;
//
//   var authKey = req.headers["authorization"];
//
//   if (!authKey) return res.status(400).json({
//     'message': 'Authkey needed'
//   });
//   modusers.findOne({
//     authToken: authKey
//   }, function(err, user) {
//     if (err) return res.status(500).send('Unexpected authorization error');
//     if (!user || (user.length === 0)) {
//       return res.status(403).json({
//         message: 'User is not authorized'
//       });
//     }
//
//     req.user = user;
//     return next();
//   });
// };
