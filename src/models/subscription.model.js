import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
subscriber :{
    typeof: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
},
channel :{
    typeof: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true  }
},{timestamps: true});

const Subscription = mongoose.model("Subscription", subscriptionSchema);


export default Subscription;