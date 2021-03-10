const { Router } = require('express');
const routes = Router();
const { registerUser } = require('../controllers/users.controller');

routes.post('/', registerUser);

module.exports = routes;
