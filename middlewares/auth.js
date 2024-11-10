const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  // Get the token from the Authorization header
  const token = req.headers.authorization?.split(" ")[1]; // Expects "Bearer <token>"
  
  
  if (!token) return res.status(403).json({ message: "Authorization required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Attach the user data from the token to the request object (e.g., user ID, email)
    req.user = { id: decoded.id, email: decoded.email };

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
