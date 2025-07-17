import mongoose,{ Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userschema = new Schema ({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    avatar: {
        type: String, //cloudinary url
        required: true,
    },
    coverimage: {
        type: String, //cloudinary url
    },
    watchhistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Video',
    }],
    password: {
        type: String,
        required: [true, 'Password is required'],
        trim: true,
    },
    refreshToken: {
        type: String,
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

//Before saving, hash the password only if it was modified
userschema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next()
})

//// Compare entered password with the hashed one in the database
userschema.methods.ispasswordcorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

// Generate a short-lived access token with user details
userschema.methods.generateAccessToken = function () {
    //short lived access token
    return jwt.sign({ 
    _id: this._id ,
    email: this.email,
    username: this.username },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    );
}

// Generate a long-lived refresh token with user ID only
userschema.methods.generaterefreshToken = function () {
    return jwt.sign({ 
    _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    );
}
//access Token stored in Memory, localStorage, or cookie
//Refresh Token stored in HttpOnly cookie or secure DB



export const User = mongoose.model('User', userschema);
