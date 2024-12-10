import mongoose,{Schema} from "mongoose";


const subscriptionSchema = new Schema({
    subscrption:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
},{
    timestamps:true
})


export const Subscrption = mongoose.model("Subscrption",subscriptionSchema)