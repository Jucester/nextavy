const User = require('../models/User');
const bcrypt = require('bcrypt');
const controller = {};
const { validationResult } = require('express-validator');

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
    };
    const newUser = await User.create(user);
    if (newUser) {
      return res.json({
        message: req.t('user_created'),
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: req.t('something_wrong') });
  }
};

controller.findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

module.exports = controller;
