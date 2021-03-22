const express = require('express');
const morgan = require('morgan');
const i18n = require('i18next');
const i18nBackend = require('i18next-fs-backend');
const i18nMiddleware = require('i18next-http-middleware');

i18n
  .use(i18nBackend)
  .use(i18nMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

const app = express();

// Middlewares
app.use(morgan('dev', { skip: (req, res) => process.env.NODE_ENV === 'test' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(i18nMiddleware.handle(i18n));

// Routes
app.use('/api/v1.0/auth', require('./routes/authentication.routes'));
app.use('/api/v1.0/users', require('./routes/users.routes'));

// Error handler with Exceptions
app.use(require('./errors/ErrorHandler'));

console.log('Environment: ' + process.env.NODE_ENV);
module.exports = app;
