const JWT = require("jsonwebtoken")


module.exports = async (req, res, next) => {
   try {
    const token = req.headers['authorization'].split(" ")[1]
    JWT.verify(token, process.env.JWT_SECRET_KEY, (err, decode) => {
        if(err){
            return res.status(403).json({message: "Auth Error"})
        } else {
            req.body.userId = decode.id
            next()
        }
    })
   } catch (error) {
    console.log(error)
    res.status(401).json({message: "Auth Failed"})
   }
}