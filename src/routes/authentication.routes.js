const { Router } = require('express');
const router = Router();
const { check } = require('express-validator');
const { login } = require('../controllers/auth.controller');

router.post('/login', check('email').isEmail(), login);

module.exports = router;
