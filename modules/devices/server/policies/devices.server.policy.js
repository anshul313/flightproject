'use strict';

/**
 * Module dependencies
 */
var acl = require('acl'),
  mongoose = require('mongoose'),
  User = mongoose.model('User');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Articles Permissions
 */
exports.invokeRolesPolicies = function() {
  acl.allow([{
    roles: ['admin'],
    allows: [{
      resources: '/api/devices',
      permissions: '*'
    }, {
      resources: '/api/devices/:deviceId',
      permissions: '*'
    }]
  }, {
    roles: ['user'],
    allows: [{
      resources: '/api/devices',
      permissions: '*'
    }, {
      resources: '/api/devices/:deviceId',
      permissions: '*'
    }]
  }, {
    roles: ['guest'],
    allows: [{
      resources: '/api/devices',
      permissions: '*'
    }, {
      resources: '/api/devices/:deviceId',
      permissions: '*'
    }]
  }]);
};

exports.userAuthenticate = function(req, res, next) {
  var authKey = req.headers.authorization;
  Device.find({
    authToken: authKey
  }).exec(function(err, device) {
    if (err) res.status(500).send('Unexpected authorization error');
    if (!device) {
      return res.status(403).json({
        message: 'User is not authorized'
      });
    }
  });
  return next();
};
exports.isAllowed = function(req, res, next) {
  return next();
};
