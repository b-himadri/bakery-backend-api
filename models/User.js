//models/User.js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name : {
        type: String,
        required: true, 
        trim: true,
        minlength : 2
    },
    email : {
        type: String, 
        required : true,
        unique: true,
        lowercase: true,
    },
    password :{
        type: String,
        required: true,
        minlength : 6,

    },

    role: {
        type: String,
        enum: ['user', 'admin'],  
        default: 'user',          
    },

    createdAt: {
        type: Date, 
        default : Date.now,
    },
})
module.exports = mongoose.model('User', userSchema);

