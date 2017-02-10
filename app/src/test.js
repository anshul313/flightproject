var nodemailer = require('nodemailer');


var mail = require("nodemailer").mail;

mail({
  from: "Fred Foo ✔ <foo@blurdybloop.com>", // sender address
  to: "bnvinay92@gmail.com", // list of receivers
  subject: "Hello ✔", // Subject line
  text: "Hello world ✔", // plaintext body
  html: "<b>Hello world ✔</b>" // html body
}, function (error, info) {
  if (error) {
    return console.log(error);
  }
  console.log('Email sent: ' + info.response);
});