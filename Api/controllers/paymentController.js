import axios from "axios";
import Transaction from "../models/Transaction.js";

export const generateAccessToken = async (req, res, next) => {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_SECRET_KEY;
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { authorization: `Basic ${auth}` } }
    );
    req.token = response.data.access_token;
    next();
  } catch (err) {
    console.error("Failed to generate access token:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to generate access token" });
  }
};

export const stkPush = async (req, res) => {
  const { phone, amount } = req.body;
  const shortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!phone.match(/^2547\d{8}$/) || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid phone number or amount" });
  };


  const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" });
  const timestamp = new Date(now)
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: "EUGENECHANZU",
        TransactionDesc: "STK Payment",
      },
      { headers: { Authorization: `Bearer ${req.token}` } }
    );
    console.log("STK Push Response:", response.data);

    await new Transaction({
      checkoutRequestID: response.data.CheckoutRequestID,
      phone,
      amount,
      status: "Pending"
    }).save();

    res.status(200).json(response.data);
  } catch (error) {
    console.error("STK Push Error:", error.response?.data || error.message);
    res.status(400).json({ error: "STK Push failed" });
  };
};

export const stkCallback = async (req, res) => {
  console.log("Callback Received:", JSON.stringify(req.body, null, 2));

  const result = req.body.Body?.stkCallback;
  if (!result) {
    console.error("Invalid callback data:", req.body);
    return res.status(400).json({ error: "Invalid callback data" });
  };

  const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = result;

  let transactionData = {
    checkoutRequestID: CheckoutRequestID,
    merchantRequestID: MerchantRequestID,
    resultCode: ResultCode,
    resultDesc: ResultDesc,
    status: ResultCode === 0 ? "Success" : "Failed"
  };

  if (CallbackMetadata) {
    const data = CallbackMetadata.Item;
    transactionData.amount = data.find((i) => i.Name === "Amount")?.Value;
    transactionData.phone = data.find((i) => i.Name === "PhoneNumber")?.Value;
    transactionData.mpesaReceipt = data.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
    transactionData.transactionDate = data.find((i) => i.Name === "TransactionDate")?.Value;
    console.log("Transaction Success:", transactionData);
  } else {

    console.log("Transaction Failed:", ResultDesc);

  }

  try {
    await Transaction.findOneAndUpdate(
      { checkoutRequestID: CheckoutRequestID },
      transactionData,
      { upsert: true, new: true }
    );
    console.log("Transaction Saved to DB:", transactionData);
  } catch (error) {
    console.error("Error Saving to DB:", error.message);
  }

  req.io.emit('transactionUpdate', transactionData);

  res.status(200).json("ok");
};

export const home = (req, res) => {
  res.send("Daraja API Server Running...");
};
