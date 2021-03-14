const transporter = require('../../config/email');

const sendActivationEmail = async (email, token) => {
  return await transporter.sendMail({
    from: 'Nextavy <info@nextavy.com>',
    to: email,
    subject: 'Account Activation',
    html: `Token is ${token}`,
  });
};

module.exports = { sendActivationEmail };
