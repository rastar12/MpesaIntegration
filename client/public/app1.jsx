import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const apiBaseUrl = 'http://localhost:8080/api/stk';

  const initiateStkPush = async (e) => {
    e.preventDefault();

    if (!phone.match(/^2547\d{8}$/) || !amount || amount <= 0) {
      setStatus({ message: 'Invalid phone number or amount', type: 'error' });
      return;
    }

    setStatus({ message: 'Initiating payment...', type: 'pending' });

    try {
      const response = await axios.post(`${apiBaseUrl}/push`, { phone, amount });
      const data = response.data;

      if (data.ResponseCode === '0') {
        setStatus({ message: 'STK Push sent to your phone. Enter PIN to complete.', type: 'pending' });
        checkTransactionStatus(data.CheckoutRequestID);
      } else {
        setStatus({ message: `Failed to initiate payment: ${data.ResponseDescription}`, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  const checkTransactionStatus = (checkoutRequestID) => {
    const maxAttempts = 10;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const response = await axios.get(`${apiBaseUrl}/query/${checkoutRequestID}`);
        const data = response.data;

        if (data.ResultCode === '0') {
          clearInterval(interval);
          setStatus({ message: `Transaction Successful! Receipt: ${data.ResultDesc}`, type: 'success' });
        } else if (data.ResultCode) {
          clearInterval(interval);
          setStatus({ message: `Transaction Failed: ${data.ResultDesc}`, type: 'error' });
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setStatus({ message: 'Transaction timed out. Please try again.', type: 'error' });
        } else {
          setStatus({ message: 'Waiting for transaction completion...', type: 'pending' });
        }
      } catch (error) {
        clearInterval(interval);
        setStatus({ message: `Error checking status: ${error.message}`, type: 'error' });
      }
    }, 5000); // Poll every 5 seconds
  };

  return (
    <div className="App">
      <h1>M-Pesa STK Push Payment</h1>
      <form onSubmit={initiateStkPush}>
        <div className="form-group">
          <label htmlFor="phone">Phone Number (2547...):</label>
          <input
            type="text"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="254712345678"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">Amount (KES):</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            min="1"
            required
          />
        </div>
        <button type="submit">Pay Now</button>
      </form>
      <div className={`status ${status.type}`}>
        {status.message}
      </div>
    </div>
  );
};

export default App;