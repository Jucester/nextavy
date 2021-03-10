const User = require('../models/User');
const bcrypt = require('bcrypt');
const controller = {};

controller.registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hashed,
  };
  const newUser = await User.create(user);
  if (newUser) return res.send({ message: 'User created successfully' });

  return res.status(400).send({ message: 'Something went wrong' });
};

module.exports = controller;
