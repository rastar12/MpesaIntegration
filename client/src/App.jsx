import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:8080', { transports: ['websocket'], reconnection: true });

const App = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [checkoutRequestID, setCheckoutRequestID] = useState(null);
  const apiBaseUrl = 'http://localhost:8080/api';

  useEffect(() => {
    socket.on('connect', () => console.log('✅ WebSocket Connected'));
    socket.on('connect_error', (err) => console.error('❌ WebSocket Error:', err));

    socket.on('transactionUpdate', (data) => {
      console.log('📥 Received transactionUpdate:', data);
      if (data.checkoutRequestID === checkoutRequestID) {
        switch (data.resultCode) {
          case 0:
            setStatus({
              message: 'Transaction Successful!',
              type: 'success'
            });
            break;
          case 1032:
            setStatus({
              message: 'Transaction Cancelled by User',
              type: 'error'
            });
            break;
          case 1037:
            setStatus({
              message: 'Transaction Failed: Wrong PIN or Timeout',
              type: 'error'
            });
            break;
          default:
            setStatus({
              message: `Transaction Failed: ${data.resultDesc}`,
              type: 'error'
            });
            break;
        }
      }
    });

    return () => {
      socket.off('transactionUpdate');
      socket.off('connect');
      socket.off('connect_error');
    };
  }, [checkoutRequestID]);

  const initiateStkPush = async (e) => {
    e.preventDefault();

    if (!phone.match(/^2547\d{8}$/) || !amount || amount <= 0) {
      setStatus({ message: 'Invalid phone number or amount', type: 'error' });
      return;
    }

    setStatus({ message: 'Initiating payment...', type: 'pending' });

    try {
      const response = await axios.post(`${apiBaseUrl}/stk/push`, { phone, amount });
      const data = response.data;

      if (data.ResponseCode === "0") {
        setCheckoutRequestID(data.CheckoutRequestID);
        setStatus({ message: 'STK Push sent to your phone. Enter PIN to complete.', type: 'pending' });
      } else {
        setStatus({ message: `Failed to initiate payment: ${data.ResponseDescription}`, type: 'error' });
      }
    } catch (error) {
      console.error('❌ STK Push Error:', error);
      setStatus({ message: `Error: ${error.message}`, type: 'error' });
    }
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