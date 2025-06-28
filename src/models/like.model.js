import mongooseAggregatePaginate from 
"mongoose-aggregate-paginate-v2";
import mongoose,{Schema} from "mongoose";
import { MongoGCPError } from "mongodb";


const likeSchema =  new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comments"
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
    },
    {timestamps:true})

    export const Like = mongoose.model("Like",likeSchema)