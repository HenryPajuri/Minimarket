import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  price:      { type: Number, required: true },
  category:   { type: String, enum: ["clothing", "shoes", "accessories"], required: true },
  owner:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt:  { type: Date, default: Date.now },

 
  image:      { type: String },            // keep for backward compatibility
  images:     [String],                    // array for full gallery
  description:{ type: String, default: "" },
  sold:       { type: Boolean, default: false }
});

export default mongoose.model("Product", productSchema);
