const User = require('../models/User');
const bcrypt = require('bcrypt');
const controller = {};
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const sequelize = require('../config/database');

const EmailService = require('../services/email/EmailService');
const EmailException = require('../services/email/EmailException');

// To generate a token for email verification
const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

controller.registerUser = async (req, res) => {
  const errors = validationResult(req);

  // Check if express-validator found erros in our request body
  if (!errors.isEmpty()) {
    // Create an object that will save the errors for thests purposes
    const validationErrors = {};
    errors.array().forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
    return res.status(400).json({ validationErrors });
  }

  try {
    const { username, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);
    const user = {
      username,
      email,
      password: hashed,
      activation_token: generateToken(16),
    };
    const transaction = await sequelize.transaction();
    const newUser = await User.create(user, { transaction });

    try {
      await EmailService.sendActivationEmail(email, newUser.activation_token);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw new EmailException();
    }

    if (newUser) {
      return res.status(200).json({
        message: req.t('user_created'),
      });
    }
  } catch (err) {
    return res.status(502).send({ message: req.t(err.message) });
  }
};

controller.findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

module.exports = controller;
