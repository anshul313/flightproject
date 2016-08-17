'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
require('mongoose-double')(mongoose);

var SchemaTypes = mongoose.Schema.Types;

var UserSchema = new Schema({
  dateCreated: {
    type: Date,
    default: Date.now()
  },
  primaryEmail: {
    type: String,
    trim: true
  },
  deviceId: {
    type: String,
    trim: true
  }
});

mongoose.model('User', UserSchema);
