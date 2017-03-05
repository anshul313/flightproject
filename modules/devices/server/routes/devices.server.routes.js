'use strict';

var devicesPolicy = require('../policies/devices.server.policy');
var devices = require('../controllers/devices.server.controller');
var util = require('../../../../config/lib/util.js');

module.exports = function(app) {

  app.route('/tripmanager/login')
    .post(devices.login);
  app.route('/tripmanager/data')
    .post(devices.data);
};
