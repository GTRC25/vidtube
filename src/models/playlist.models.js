import mongoose,{Schema} from "mongoose";

const playlistSchema = new Schema({
 name: {
  type: String,
  required: true,
},
description: {
  type: String,
  required: true,
},
 videos: [{
  type: Schema.Types.ObjectId,
  ref: 'Video'
}],
 owner: {
  type: Schema.Types.ObjectId,
  ref: 'User'
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

export const Playlist = mongoose.model('Playlist', playlistSchema);