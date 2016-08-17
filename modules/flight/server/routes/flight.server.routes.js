'use strict';

/**
 * Module dependencies
 */
var flightPolicy = require('../policies/flight.server.policy');
var flight = require('../controllers/flight.server.controller');
var util = require('../../../../config/lib/util.js');

module.exports = function(app) {
  app.route('/api2/flightstatus')
    .post(flight.flightStatus);

	// Single article routes
  app.route('/api2/flightawareflightstatus')
	.post(flight.flightawareflightstatus);

	// Finish by binding the article middleware
	// app.param('deviceId', devices.deviceByID);
};
