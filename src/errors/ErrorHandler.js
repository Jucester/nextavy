// eslint-disable-next-line no-unused-vars
module.exports = function ErrorHandler(err, req, res, next) {
  //console.log(err);
  const { status, message, errors } = err;

  let validationErrors;

  if (errors) {
    validationErrors = {};
    errors.forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
  }

  res.status(status).json({
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: req.t(message),
    validationErrors,
  });
};
