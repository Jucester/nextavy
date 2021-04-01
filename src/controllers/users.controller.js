const User = require('../models/User');
const bcrypt = require('bcrypt');
const controller = {};
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const sequelize = require('../config/database');

// Services
const EmailService = require('../services/email/EmailService');

// Error exceptions
const EmailException = require('../errors/EmailException');
const InvalidTokenException = require('../errors/InvalidTokenException');
const ValidationException = require('../errors/ValidationException');
const UserNotFoundException = require('../errors/UserNotFoundException');
const ForbiddenException = require('../errors/ForbiddenException');

// To generate a token for email verification
const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

controller.registerUser = async (req, res, next) => {
  const errors = validationResult(req);

  // Check if express-validator found erros in our request body
  if (!errors.isEmpty()) {
    // Create an object that will save the errors for thests purposes

    //const validationErrors = {};
    //errors.array().forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
    //return res.status(400).json({ validationErrors });

    return next(new ValidationException(errors.array()));
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
    //return res.status(502).send({ message: req.t(err.message) });
    next(err);
  }
};

controller.findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

controller.emailHandler = async (req, res, next) => {
  const token = req.params.token;

  try {
    const user = await User.findOne({ where: { activation_token: token } });
    user.email_verified = true;
    user.activation_token = null;
    await user.save();

    res.status(200).json({
      message: req.t('email_verification_success'),
    });
  } catch (err) {
    /*
    res.status(400).json({
      message: req.t('account_activation_failure'),
    });*/
    next(new InvalidTokenException());
  }
};

controller.getUsers = async (req, res) => {
  // get page and pageSize from the custom pagination middleware
  const { page, size } = req.pagination;
  // findAndCountAll can be used to receive also a "count" property that we can use to paginate
  const users = await User.findAndCountAll({
    where: { email_verified: true },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: page * size,
  });

  //const count = await User.count({ where: { email_verified: true } });

  return res.status(200).json({
    content: users.rows,
    page: page,
    size: size,
    totalPages: Math.ceil(users.count / size),
  });
};

controller.getUser = async (req, res, next) => {
  const id = req.params.id;

  // findAndCountAll can be used to receive also a "count" property that we can use to paginate

  try {
    const user = await User.findOne({
      where: { id: id, email_verified: true },
      attributes: ['id', 'username', 'email'],
    });

    if (user) {
      return res.status(200).json({
        user,
      });
    } else {
      next(new UserNotFoundException());
    }
  } catch (err) {
    return res.status(502).json({
      message: 'Something went wrong',
    });
  }
};

controller.updateUser = async (req, res, next) => {
  const authUser = req.authenticatedUser;

  // eslint-disable-next-line eqeqeq
  if (!authUser || authUser.id != req.params.id) {
    return next(new ForbiddenException('unauthorized_user_update'));
  }
  /*
  const authorization = req.headers.authorization;
  if (authorization) {
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const [email, password] = decoded.split(':');
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      return next(new ForbiddenException('unauthorized_user_update'));
    }
    // eslint-disable-next-line eqeqeq
    if (user.id != req.params.id) {
      return next(new ForbiddenException('unauthorized_user_update'));
    }
    if (!user.email_verified) {
      return next(new ForbiddenException('unauthorized_user_update'));
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return next(new ForbiddenException('unauthorized_user_update'));
    } */

  const user = await User.findOne({ where: { id: authUser.id } });
  user.username = req.body.username;
  user.save();

  return res.status(200).json({
    message: 'Updated',
  });
};

module.exports = controller;
