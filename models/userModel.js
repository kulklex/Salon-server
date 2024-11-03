const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    name: {
        type:String,
        required:[true, 'Name is required']
    }, 
    email: {
        type:String,
        required:[true, 'Email is required']
    },
    password:{
        type:String,
        required: false
    }
})


const User = mongoose.model("User", userSchema)

module.exports = User;