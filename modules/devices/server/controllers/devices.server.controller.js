'use strict';

/* global Set b:true */
var path = require('path'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  errorHandler = require(path.resolve(
    './modules/core/server/controllers/errors.server.controller')),
  _ = require('lodash'), // npm install underscore to install
  async = require('async'),
  moment = require('moment'),
  app = require('../../../../config/lib/app.js'),
  crypto = require('crypto'),
  nodemailer = require('nodemailer'),
  smtpTransport = require('nodemailer-smtp-transport'),
  db = app.db();
// var redis = redisClient(6379,
//   'qykly-micro.kfrrkn.0001.apse1.cache.amazonaws.com');
var mongo = require('mongodb');

exports.data = function(req, res) {
  if (!(req.body.deviceId)) {
    return res.status(400).send({
      message: 'deviceId invalid'
    });
  }
  db.collection('User').findOne({
    deviceId: req.body.deviceId
  }, function(err, docs) {
    if (err) {
      return res.status(400).send({
        message: 'error occured'
      });
    } else if (docs) {
      return res.status(400).send({
        message: 'deviceId exists'
      });
    } else {
      db.collection('User').insert(req.body, function(error, succcess) {
        if (error) {
          return res.status(400).send({
            message: 'error occured'
          });
        }
        res.json({
          error: false,
          message: "user created successfully"
        });
      })
    }
  });
};
