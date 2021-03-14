const nodemailer = require('nodemailer');
const nodemailer_stub = require('nodemailer-stub');

const transporter = nodemailer.createTransport(nodemailer_stub.stubTransport);

module.exports = transporter;
