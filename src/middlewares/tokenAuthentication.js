// This middleware to handle authentication with JWT
const jwt = require('jsonwebtoken');

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.substring(7);

    if (!token) {
      return res.status(500).json({
        message: 'No authorized',
      });
    }
    try {
      const verify = jwt.verify(token, process.env.JWT_KEY);

      if (!verify) {
        return res.status(500).json({
          message: 'Invalid token',
        });
      }

      req.authenticatedUser = verify;
      next();
    } catch (error) {
      console.log(error);
    }
  }
  next();
};

module.exports = tokenAuthentication;
