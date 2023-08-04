const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

module.exports = (req, res, next) => {
  //  Extract the JWT from the "Authorization" header
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    // If no "Authorization" header is present, the user is not authenticated
    req.isAuth = false;
    return next();
  }

  //  Verify the JWT
  const token = authHeader.split(" ")[1]; // The token is typically in the format "Bearer <token>"
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_TOKEN);
  } catch (err) {
    // If the token is invalid or expired, the user is not authenticated
    req.isAuth = false;
    return next();
  }

  // Set user authentication data if the token is valid
  if (!decodedToken) {
    // If the token is not decoded properly, the user is not authenticated
    req.isAuth = false;
    return next();
  }

  // If the token is valid and successfully verified, set user authentication data
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
