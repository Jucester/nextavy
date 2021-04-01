// This middleware to handle basic authorization check in our routes

const bcrypt = require('bcrypt');
const User = require('../models/User');

const basicAuthorization = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const [email, password] = decoded.split(':');
    const user = await User.findOne({ where: { email: email } });

    if (user && user.email_verified) {
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        req.authenticatedUser = user;
      }
    }

    // eslint-disable-next-line eqeqeq
    /*
    if (user.id != req.params.id) {
      return next(new ForbiddenException('unauthorized_user_update'));
    }
    if (!user.email_verified) {
      return next(new ForbiddenException('unauthorized_user_update'));
    } */
  }
  next();
};

module.exports = basicAuthorization;
