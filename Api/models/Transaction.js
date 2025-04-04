import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  checkoutRequestID: { type: String, required: true, unique: true },
  merchantRequestID: String,
  resultCode: Number,
  resultDesc: String,
  amount: Number,
  phone: String,
  mpesaReceipt: String,
  transactionDate: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Transaction", transactionSchema);