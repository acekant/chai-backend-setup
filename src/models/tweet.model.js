import mongooseAggregatePaginate from 
"mongoose-aggregate-paginate-v2";
import mongoose,{Schema} from "mongoose";

const tweetSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        owner: {
            Type: Schema.Types.ObjectId,
            ref: "User"
        },
    }
    ,{timestamps:true})

export const Tweet = mongoose.model("Tweet",tweetSchema)