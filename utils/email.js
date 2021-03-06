/*jshint esversion: 6 */
/*jshint esversion: 8 */
/*jshint esversion: 9 */
/*
This email.js file
  is used by :  exports.forgotPassword
  as in :       router.post('/forgotPassword', authController.forgotPassword);
*/

const nodemailer = require('nodemailer'); //ref:  https://nodemailer.com/usage/
const pug = require('pug');
const htmlToText = require('html-to-text');

/* === Note for using this class to send Mail with app act as SMTP provider and send mail on your behalf ===

i. Usage of nodemailer:
  1) Use nodemailer obj and set up config for sending mail with .createTransport method:
        let transporter = nodemailer.createTransport(transport[, defaults])

  2) Use configured nodemailer obj with method ".sendMail" to send out email:
        transporter.sendMail(data[, callback]) // data as options for email content

ii. Usage of EmailWithNodeMailer class:
  1) To send welcome message to newly sign-upped user inside an async function:
      await new EmailWithNodeMailer(userData, url_EmbbedInEmail).sendWelcome();

    Example:
      await new EmailWithNodeMailer(newUser, url).sendWelcome();
      //for new user signing-up
      await new EmailWithNodeMailer(user, resetURL).sendPasswordReset();
      //for resetting password

iii. Explanation for EmailWithNodeMailer class:
  1) constuctor: for getting user data while creating new instance of class
  2) createNewTransporter() for making new transporter from nodemailer, will be called by c) send() method
  3) async send(pugTemplate, emailSubject): is used to be called by sendWelcome() or sendPasswordRest() to send out email by combining transporter ( from 2) ), sendMail() method (from tranporter's method) and email contents together
  4) async sendWelcome()
  5) async sendPasswordReset()

iv:   Checking if emails are successfully sent:
  1) In production environment:
  Use new user's real email to check mail (which sent by sendgrid). Or use https://mailsac.com/ to get a temporarily and disposable email address to register a new user and check email

  2) When not in production environment: User mailtrap to check email at https://mailtrap.io/inboxes/955214/messages
*/


module.exports = class EmailWithNodeMailer {

  constructor(userData, url_EmbbedInEmail) {
    this.to = userData.email;
    this.firstName = userData.name.split(' ')[0];
    this.url = url_EmbbedInEmail;
    this.from = `'Steve Chi-Yuan Leng' <${process.env.EMAIL_FROM}>`; //use the env variable in config.env
  }

  createNewTransporter() {
    // === Set up options ( nodemailer.createTransport() obj ) ===
    // for sending email with "nodemailer"
    // ===> ref: https://nodemailer.com/smtp/

    if (process.env.NODE_ENV === 'production') {
      // if server starts in production environment mode:
      // return a "nodemailer.createTransport()" obj for SendGrid app
      // ref for set up nodemailer:  https://nodemailer.com/smtp/testing/

      return nodemailer.createTransport({
        /* === set up manually for sendgrid ===
            host: 'smtp.sendgrid.net',
            port: 587,
                //25, 587	(for unencrypted/TLS connections)
                //465	(for SSL connections)
            secure: false, // true for 465, false for other ports
                //ref: https://app.sendgrid.com/guide/integrate/langs/smtp
        */
        // === set up AUTOMATICALLY for sendgrid ===
        service: 'SendGrid', // short-hand setup includes host, port and secure.
        auth: {
          user: process.env.EMAIL_USERNAME_SENDGRID,
          pass: process.env.EMAIL_PASSWORD_SENDGRID
        }
      });
    }

    // if NOT in production environment, use setup for using
    // mailtrap smtp service (at localhost as http://127.0.0.1:3000/  )
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST_mailtrap,
      port: process.env.EMAIL_PORT_mailtrap,
      auth: {
        user: process.env.EMAIL_USERNAME_mailtrap,
        pass: process.env.EMAIL_PASSWORD_mailtrap,
      }
      // Note: Check mail on mailtrap@ https://mailtrap.io/inboxes/955214/messages

      /* To change set up, go to config.env
         ref: https://nodemailer.com/smtp/#1-single-connection
      */
    });

  }


  // Send the actual mail in HTML format with 'pug'
  async send(pugTemplate, emailSubject) {

    // 1) Render HTML based on a pug template received as parameter "pugTemplate". Will be used in mail_OptionsAndContent obj as the argument in sendMail() method)
    const html_rendered_with_Pug = pug.renderFile(
      //first argument: The path to the Pug file to render
      `${__dirname}/../views/email/${pugTemplate}.pug`,
      //Second argument: An options object, also used as the locals object (the variable can be accessed by pug template)
      {
        firstName: this.firstName,
        url: this.url,
        subject: emailSubject
      },
      //third arguments: (optional) callback function

      // => ref:  https://pugjs.org/api/reference.html#pugrenderfilepath-options-callback
    );

    // 2) Define email content (for the sendMail() method below)
    const mail_OptionsAndContent = {
      // ref:  https://nodemailer.com/message/#common-fields

      //key and value as properties (mail options)
      from: this.from, //'Steve Leng <steve.leng@test.com>',
      to: this.to,
      subject: emailSubject,
      html: html_rendered_with_Pug, // when reading email in HTML format
      text: htmlToText.fromString(html_rendered_with_Pug), // Use "htmlToText" from package "html-to-text" to convert html file to text for reading email in pure text format.

      // ref:  https://nodemailer.com/message/#common-fields
    };

    // 3) Note:
    /* this.send() will call this.createNewTransporter() to get returned Object as "transporter"
     (which is nodemailer obj with SMTP set up) and then the object's method .sendMail() with argument ojb "mail_OptionsAndContent" to send out email
     */
    await this.createNewTransporter().sendMail(mail_OptionsAndContent);
    //which is acutally like this : transporter.sendMail(obj with properties for email)

    //ref: https://nodemailer.com/about/#example

  }

  // ==========================================
  /*// 2) Use sendWelcome() or sendPasswordReset()
    //    to call .send() method with different pug template and email subject
    //   after creating new transport with the code:
    //   new EmailWithNodeMailer(userData, url_EmbbedInEmail)
  */
  //// Used by exports.signup in authController.js

  // option A) --== Sending welcome message: ==--
  async sendWelcome() {
    await this.send( // send(pugTemplate, emailSubject)
      'welcome', // argument#1:  views/email/welcome.pug
      'Welcome to Natours!' // argument#2:  string as email subject
    );
  }

  // option B) --== Sending Pwd reset MESSAGE and URL for resetting Pwd: ==--
  async sendPasswordReset() {
    await this.send(
      'passwordReset', // argument#1:  views/email/passwordReset.pug
      'Your password reset token (valid for only 10 minutes)' // argument#2:  string as email subject
    );
  }

};
/*// in config.env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=62e7c5........
EMAIL_PASSWORD=2ac0c8........
*/
// ref: https://nodemailer.com/smtp/#1-single-connection


// Activate in gmail "less secure app" option
