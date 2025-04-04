import React, { useState } from "react";
import axios from "axios";

const MpesaPayment = () => {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checkoutRequestID, setCheckoutRequestID] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState(null);

  const handlePayment = async () => {
    setMessage("");
    setTransactionStatus(null);
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:8080/api/stkpush", { phone, amount });
      if (response.data.success) {
        setMessage("STK Push Sent! Please check your phone.");
        setCheckoutRequestID(response.data.checkoutRequestID);
        checkPaymentStatus(response.data.checkoutRequestID);
      } else {
        setMessage(response.data.message || "STK Push Failed!");
      }
    } catch (error) {
      console.error("❌ Payment Error:", error);
      setMessage("Failed to initiate payment.");
    }
    setLoading(false);
  };

  const checkPaymentStatus = (checkoutRequestID) => {
    let attempts = 0;
    const maxAttempts = 10; // Poll for ~50 seconds
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`http://localhost:8080/api/transaction-status/${checkoutRequestID}`);
        const status = response.data;
        console.log("Frontend Status Update:", status); // Debug log
        setTransactionStatus(status);

        if (status.status === "Success" || status.status === "Failed" || status.status === "Cancelled") {
          clearInterval(interval); // Stop polling on completion or cancellation
        }
      } catch (error) {
        console.error("❌ Error Fetching Transaction:", error);
        setTransactionStatus({ status: "Pending", message: "Checking..." });
      }

      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setTransactionStatus({ status: "Timeout", message: "Transaction took too long" });
      }
    }, 5000); // Check every 5 seconds
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto", textAlign: "center" }}>
      <h2>Pay with M-Pesa</h2>
      <input
        type="text"
        placeholder="Enter Phone Number (2547xxxxxxxx)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "10px", padding: "10px" }}
      />
      <input
        type="number"
        placeholder="Enter Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "10px", padding: "10px" }}
      />
      <button onClick={handlePayment} disabled={loading} style={{ padding: "10px", width: "100%" }}>
        {loading ? "Processing..." : "Pay Now"}
      </button>
      {message && <p style={{ marginTop: "10px", fontWeight: "bold" }}>{message}</p>}
      {transactionStatus && (
        <div style={{ marginTop: "20px", padding: "10px", border: "1px solid gray", borderRadius: "5px" }}>
          <h3>Transaction Status</h3>
          <p><strong>Status:</strong> {transactionStatus.status}</p>
          <p><strong>Receipt:</strong> {transactionStatus.mpesaReceipt || "N/A"}</p>
          <p><strong>Amount:</strong> {transactionStatus.amountPaid ? `KES ${transactionStatus.amountPaid}` : "N/A"}</p>
          <p><strong>Date:</strong> {transactionStatus.transactionDate || "N/A"}</p>
          {transactionStatus.errorMessage && (
            <p><strong>Error:</strong> {transactionStatus.errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MpesaPayment;