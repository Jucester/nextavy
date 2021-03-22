const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuthenticationException = require('../errors/AuthenticationException');
const controller = {};
require('dotenv').config();

controller.login = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email: email } });

    if (!user) {
      /*
      return res.status(401).json({
        message: 'User doest not exists',
      });*/
      next(new AuthenticationException);
    } else {
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
