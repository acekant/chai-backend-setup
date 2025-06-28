import mongooseAggregatePaginate from 
"mongoose-aggregate-paginate-v2";
import mongoose,{Schema} from "mongoose";


const commentSchema = new Schema(
    {
        content: {
            Type: String,
            required: true
        },
        video: {
            Type: Schema.Types.ObjectId,
            ref: "Video"
        },
        owner: {
            Type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    
    {timestamps:true})

commentSchema.plugin(mongooseAggregatePaginate)

export const Comments = mongoose.model("Comments",commentSchema)