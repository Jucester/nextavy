const nodemailer = require('nodemailer');
const transporter = require('../../config/email');

const sendActivationEmail = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'Nextavy <info@nextavy.com>',
    to: email,
    subject: 'Account Activation',
    html: `
    <div>
        <b> Please click the link below to activate your account </b>
    </div>
    <div>
      <a href="http://localhost:3000/api/v1.0/users/token/${token}"> Activate </a>
    </div>`,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('Url: ' + nodemailer.getTestMessageUrl(info));
  }
};

module.exports = { sendActivationEmail };
