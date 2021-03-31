module.exports = function AuthenticationException() {
  this.message = 'authentication_error';
  this.status = 401;
};
