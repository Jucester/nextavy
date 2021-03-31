const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const AuthenticationException = require('../errors/AuthenticationException');
const ForbiddenException = require('../errors/ForbiddenException');
const { validationResult } = require('express-validator');
const controller = {};
require('dotenv').config();

controller.login = async (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AuthenticationException());
  }

  try {
    const user = await User.findOne({ where: { email: email } });

    if (!user) {
      return next(new AuthenticationException());
    } else {
      const match = await bcrypt.compareSync(password, user.password);

      if (!match) {
        return next(new AuthenticationException());
      }

      if (!user.email_verified) {
        return next(new ForbiddenException());
      }

      let validUser = { id: user.id, email: user.email, name: user.name };

      const token = jwt.sign({ ...validUser }, process.env.JWT_KEY, {
        expiresIn: '1h',
      });

      res.status(200).json({
        messaeg: 'User logged successfully',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(502).json({
      message: 'Something went wrong',
    });
  }
};

module.exports = controller;
