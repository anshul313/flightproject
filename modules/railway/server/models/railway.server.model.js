// 'use strict';

// /**
//  * Module dependencies
//  */
// var mongoose = require('mongoose'),
//   Schema = mongoose.Schema;
// require('mongoose-double')(mongoose);

// var SchemaTypes = mongoose.Schema.Types;

// /**
//  * Article Schema
//  */
// var DeviceSchema = new Schema({
//   dateCreated: {
//     type: Date,
//     default: Date.now
//   },

//   dateModified: {
//     type: Date,
//     default: Date.now
//   },

//   primaryEmail: {
//     type: String,
//     trim: true
//   },

//   secondaryEmail: {
//     type: String,
//     trim: true
//   },

//   firstName: {
//     type: String,
//     trim: true
//   },

//   lastName: {
//     type: String,
//     trim: true
//   },

//   googleLink: {
//     type: String,
//     trim: true
//   },

//   username: {
//     type: String,
//     trim: true
//   },

//   password: {
//     type: String,
//     trim: true
//   },

//   userId: {
//     type: String,
//     trim: true
//   },

//   mobileNumber: {
//     type: String,
//     trim: true
//   },

//   authToken: {
//     type: String,
//     trim: true
//   },

//   googleToken: {
//     type: String,
//     trim: true
//   },

//   smsCount: {
//     type: String,
//     trim: true
//   },

//   otp: {
//     type: Number
//   },

//   platform: {
//     type: String,
//     trim: true
//   },

//   launchDate: {
//     type: Date
//   },

//   pushToken: {
//     type: String,
//     trim: true
//   },

//   activated: {
//     type: String,
//     trim: true
//   },

//   smsShortCodes: [{
//     type: String,
//     trim: true
//   }],

//   syncDate: {
//     type: Date
//   },

//   passKey: {
//     type: Number
//   },

//   imei: {
//     type: String,
//     trim: true
//   },

//   batteryStatus: {
//     type: SchemaTypes.Double
//   },

//   charging: {
//     type: Boolean
//   },

//   sim1: {
//     type: String,
//     trim: true
//   },

//   sim2: {
//     type: String,
//     trim: true
//   },

//   model: {
//     type: String,
//     trim: true
//   },

//   sdk: {
//     type: Number,
//     trim: true
//   },

//   deviceId: {
//     type: String,
//     trim: true
//   },

//   deviceResolution: {
//     type: String,
//     trim: true
//   },

//   root: {
//     type: Boolean
//   },

//   wifi: {
//     type: Boolean
//   },

//   active: {
//     type: Boolean
//   },

//   ipAddress: {
//     type: String,
//     trim: true
//   },

//   location: {
//     type: String,
//     trim: true
//   }
// });

// mongoose.model('Device', DeviceSchema);
