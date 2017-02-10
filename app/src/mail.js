import nodemailer from 'nodemailer';
// create reusable transporter object using SMTP transport
// const to = 'anil@getlevo.com';
//  const msg = 'It woorks!';
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: 'anil@getlevo.com',
    pass: 'diana2016'
  }
});
/* const mailOptions = {
  from: 'name <mamidianilkumar@gmail.com>',
  to: to,
  subject: 'Feedback ',
  text: msg
}; */
module.exports = {
  sendmail(tom, msg) {
    const mailOptions = {
      from: 'anil@getlevo.com',
      to  : 'connect@getlevo.com',
      subject: 'Feedback from ' + tom,
      text: msg
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return error;
      }
      console.log('Message sent: ' + info.response);
      return info.response;
    });
  }
};
