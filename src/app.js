const express = require('express');
const morgan = require('morgan');

const app = express();

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/v1.0/users', require('./routes/users.routes'));
console.log('env: ' + process.env.NODE_ENV);

module.exports = app;
