'use strict';

var express = require('express');
/* global Set b:true */

/**
 * Module dependencies
 */
var request = require('request');
var path = require('path'),
  mongoose = require('mongoose'),
  errorHandler = require(path.resolve(
    './modules/core/server/controllers/errors.server.controller')),
  _ = require('underscore'), // npm install underscore to install
  async = require('async'),
  moment = require('moment'),
  app = require('../../../../config/lib/app.js');

exports.flightStatus = function(req, res) {
  var options = {
    method: 'POST',
    url: 'https://www.ixigo.com/secure/smsParser/',
    headers: {
      'ixiSrc': 'iximapr',
      'appVersion': '77',
      'apiKey': 'iximapr!2$',
      'clientId': 'iximapr',
      'deviceId': 'eb82f5f629bb926f',
      'content-type': 'text/plain'
    },
    body: req.body
  };
  request(options, function(error, resp, body) {
    if (error) {
      return res.status(400).send({
        message: 'error occured'
      });
    } else if (!body) {
      return res.status(400).send({
        message: 'No data find'
      });
    } else {
      // res.send(resp.statusCode.toString());
      res.send(JSON.parse(body));
    }
  });

};

exports.flightawareflightstatus = function(req, res) {
  var carrierId = req.body.carrierId;
  var flightNumber = req.body.flightNumber;
  var identity;
  var arr = {
    '9W': 'JAI',
    'I5': 'IAD',
    'AI': 'AIC',
    'G8': 'GOW',
    '6E': 'IGO',
    'SG': 'SEJ',
    'UK': 'VTI'
  };

  identity = arr[carrierId] + flightNumber;

  var options = {
    method: 'GET',
    url: 'https://flightxml.flightaware.com/mapi/v4/TrackIdent?howMany=1&ident=' +
      identity
  };

  request(options, function(error, resp, body) {
    if (error) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(error)
      });
    } else if (!body) {
      return res.status(400).send({
        message: 'No data find'
      });
    } else {
      res.send(JSON.parse(body));
    }
  });
};
