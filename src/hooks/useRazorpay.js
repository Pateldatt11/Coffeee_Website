import { useState } from 'react';
import { RAZORPAY_CONFIG, CURRENCY, PAYMENT_METHODS } from '../config/razorpay.config';

const useRazorpay = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Generate a unique order ID
  const generateOrderId = () => {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Initialize Razorpay checkout
  const initiatePayment = async ({
    amount,
    name = 'Customer',
    email = '',
    phone = '',
    orderId,
    onSuccess,
    onFailure
  }) => {
    if (!window.Razorpay) {
      setPaymentError('Razorpay SDK not loaded. Please check your internet connection.');
      onFailure?.({ error: 'SDK not loaded' });
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const options = {
      key: RAZORPAY_CONFIG.key_id,
      amount: amount * 100, // Razorpay expects amount in paise (multiply by 100)
      currency: CURRENCY,
      name: RAZORPAY_CONFIG.name,
      description: RAZORPAY_CONFIG.description,
      image: RAZORPAY_CONFIG.logo,

      // Pre-fill customer details
      prefill: {
        name: name,
        email: email,
        contact: phone
      },

      // Theme customization
      theme: RAZORPAY_CONFIG.theme,

      // Enable/disable payment methods
      config: {
        display: {
          blocks: {
            upi: {
              name: 'Pay via UPI',
              instruments: [
                { method: 'upi' }
              ]
            },
            cards: {
              name: 'Pay via Card',
              instruments: [
                { method: 'card' }
              ]
            },
            wallets: {
              name: 'Pay via Wallet',
              instruments: [
                { method: 'wallet' }
              ]
            },
            netbanking: {
              name: 'Pay via Netbanking',
              instruments: [
                { method: 'netbanking' }
              ]
            }
          },
          sequence: ['block.upi', 'block.cards', 'block.wallets', 'block.netbanking'],
          preferences: {
            show_default_blocks: false
          }
        }
      },

      // Payment methods configuration
      method: {
        upi: PAYMENT_METHODS.upi,
        card: PAYMENT_METHODS.card,
        netbanking: PAYMENT_METHODS.netbanking,
        wallet: PAYMENT_METHODS.wallet,
        emi: PAYMENT_METHODS.emi,
        paylater: PAYMENT_METHODS.paylater
      },

      // Success callback
      handler: function (response) {
        setIsProcessing(false);
        onSuccess?.({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
          amount: amount
        });
      },

      // Failure callback
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
          setPaymentError('Payment cancelled by user');
          onFailure?.({ error: 'Payment cancelled' });
        }
      },

      // Additional options
      notes: {
        merchant_order_id: orderId || generateOrderId()
      },

      // Callback URL for webhook (for production)
      // callback_url: 'https://your-backend.com/api/payment/verify',

      // Redirect after payment
      redirect: true
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setIsProcessing(false);
        setPaymentError(response.error.description || 'Payment failed');
        onFailure?.({
          error: response.error.description,
          code: response.error.code,
          source: response.error.source
        });
      });
      rzp.open();
    } catch (error) {
      setIsProcessing(false);
      setPaymentError(error.message);
      onFailure?.({ error: error.message });
    }
  };

  return {
    initiatePayment,
    isProcessing,
    paymentError,
    clearError: () => setPaymentError(null)
  };
};

export default useRazorpay;