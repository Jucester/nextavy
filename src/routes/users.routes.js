const { Router } = require('express');
const routes = Router();
const { registerUser, findByEmail } = require('../controllers/users.controller');
const { check } = require('express-validator');

routes.post(
  '/',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null')
    .bail()
    .isLength({ min: 3, max: 20 })
    .withMessage('Unsername must have min 3 and max 20 characters'),

  check('email')
    .notEmpty()
    .withMessage('Email cannot be null')
    .bail()
    .isEmail()
    .withMessage('You entered and invalid email')
    .bail()
    .custom(async (email) => {
      const user = await findByEmail(email);
      if (user) {
        throw new Error('Email already exists');
      }
    }),

  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('Password must have at least 1 uppercase letter and 1 number'),
  registerUser
);

module.exports = routes;
