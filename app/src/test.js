var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'levotheapp@gmail.com', // Your email id
    pass: 'levitate' // Your password
  }
});

// setup e-mail data with unicode symbols
var mailOptions = {
  from: '"Fred Foo ?" <foo@blurdybloop.com>', // sender address
  to: 'bnvinay92@gmail.com', // list of receivers
  subject: 'Hello ✔', // Subject line
  text: 'Hello world ?', // plaintext body
  html: '<b>Hello world ?</b>' // html body
};

// send mail with defined transport object
transporter.sendMail(mailOptions, function(error, info){
  if(error){
    return console.log(error);
  }
  console.log('Message sent: ' + info.response);
});