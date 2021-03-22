const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const header = req.headers['x-auth-token'];
    
}