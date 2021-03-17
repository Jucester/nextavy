module.exports = function EmailException() {
  this.message = 'email_sending_error';
  this.status = 502;
};
