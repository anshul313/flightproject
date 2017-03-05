'use strict';

/**
 * Module dependencies
 */
var railwayPolicy = require('../policies/railway.server.policy');
var railway = require('../controllers/railway.server.controller');
var util = require('../../../../config/lib/util.js');

module.exports = function(app) {
  app.route('/tripmanager/traintracking/:pnrNumber')
    .get(railway.pnrStatus);

  // Single article routes
  app.route('/tripmanager/ixigopnrstatus/:pnrNumber')
    .get(railway.ixigopnrstatus);

  // Finish by binding the article middleware
  // app.param('deviceId', devices.deviceByID);
};
