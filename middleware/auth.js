const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function(req,res,next){
  // Get token from ehader
  const token = req.header('x-auth-token');

  // Check if not token
  if(!token){
    // 401: not authorized
    return res.status(401).json({msg: 'No token, authorization denied'});
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    req.user = decoded.user; // user in a payload
    next();
  } catch (err) {
    res.status(401).json({msg: 'Token is not valid'});    
  }
}

