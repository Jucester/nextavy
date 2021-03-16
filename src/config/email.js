const nodemailer = require('nodemailer');
const config = require('config');
//const nodemailer_stub = require('nodemailer-stub');

const emailConfig = config.get('email');

const transporter = nodemailer.createTransport({ ...emailConfig });

module.exports = transporter;
