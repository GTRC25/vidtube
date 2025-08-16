import mongoose, {Schema} from "mongoose";

const likeschema = new Schema({
video:{
    type: Schema.Types.ObjectId,
    ref: 'video'
},
comment:{
    type: Schema.Types.ObjectId,
    ref: 'comment'
},
tweet: {
    type: Schema.Types.ObjectId,
    ref: "tweet"
},
likedby: {
     type: Schema.Types.ObjectId,
     ref: 'User'
},
}, {timestamps: true}
);

export const like = mongoose.model("like", likeschema)