import mongooseAggregatePaginate from 
"mongoose-aggregate-paginate-v2";
import mongoose,{Schema} from "mongoose";
import { MongoGCPError } from "mongodb";

const playlist = new Schema({
    name: {
        Type: String,
        required:true
    },
    description: {
        type: String,
        required:true
    },
    videos: [
        {
            type:Schema.Types.ObjectId,
            ref: "Video"
        }
    ],

    owener: {
            type: Schema.Types.ObjectId,
            ref: "User"
    }


},{timestamps:true})


export const Playlist = mongoose.model("Playlist",playlist)