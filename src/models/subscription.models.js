import mongoose, {Schema} from "mongoose";

const subscriptionschema = new Schema({

    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
},
    { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionschema);