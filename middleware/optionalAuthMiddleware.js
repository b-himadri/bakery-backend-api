const jwt = require("jsonwebtoken");

const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; 
    } catch (err) {
      // If token is invalid, ignore and proceed as guest
      console.warn("Invalid token, proceeding as guest");
    }
  }

  next(); 
};

module.exports = optionalAuthMiddleware;
