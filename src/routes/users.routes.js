const { Router } = require('express');
const routes = Router();
const { registerUser, findByEmail, emailHandler, getUsers, getUser } = require('../controllers/users.controller');
const { check } = require('express-validator');
const { pagination } = require('../middlewares/pagination');

routes.post(
  '/',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 3, max: 20 })
    .withMessage('username_size'),

  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const user = await findByEmail(email);
      if (user) {
        throw new Error('email_in_use');
      }
    }),

  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 8 })
    .withMessage('password_must_min')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_must'),
  registerUser
);

// Route to activate the account
routes.post('/token/:token', emailHandler);

// custom pagination middleware to handle the pagination here and in others functions
routes.get('/', pagination, getUsers);

routes.get('/:id', getUser);

module.exports = routes;
