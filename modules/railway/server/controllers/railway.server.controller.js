'use strict';

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

exports.pnrStatus = function(req, res) {

  var pnrNumber = req.params.pnrNumber;

  request('http://pnr.railyatri.in/api/pnr/journey/' + pnrNumber +
    '/null/null/null/null/null.json?user_id=123456',
    function(err, resp, body) {


      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      } else if (!body) {
        return res.status(200).send({
          message: 'No data find'
        });
      } else {
        res.json({
          data: JSON.parse(body),
          pingTime: Date.now()
        });
      }
    });
};

exports.ixigopnrstatus = function(req, res) {
  var options = {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/json',
      'Accept-Language': 'en-US'
    },
    url: 'www.indianrail.gov.in',
    body: {
      'lccp_pnrno1': req.params.pnrNumber
    },
    method: 'POST',
    json: true
  };
  request(options, function(error, resp, body) {
    if (error) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(error)
      });
    } else if (!body) {
      return res.status(200).send({
        message: 'No data find'
      });
    } else {
      res.json({
        data: body
      });
    }
  });
};
