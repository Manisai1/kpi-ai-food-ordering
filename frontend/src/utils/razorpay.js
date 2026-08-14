/**
 * Opens the Razorpay Checkout popup (loaded via checkout.js in index.html)
 * and resolves with the payment response, or rejects if the user cancels.
 *
 * In backend "test mode" (no real Razorpay keys configured), we skip the
 * real widget — which would reject a fake test order id — and simulate an
 * instant successful payment instead, so the full flow is demoable without
 * live keys.
 */
export function openRazorpayCheckout({ keyId, amount, currency, razorpayOrderId, name, email, contact, testMode }) {
  return new Promise((resolve, reject) => {
    if (typeof window.Razorpay === 'undefined') {
      reject(new Error('Razorpay checkout script did not load. Check your internet connection.'));
      return;
    }

    const options = {
      key: keyId,
      amount,
      currency,
      name: 'KPI Food',
      description: 'Food order payment',
      prefill: { name, email, contact },
      theme: { color: '#e23744' },
      handler: (response) => {
        if (testMode) {
          resolve({
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: response.razorpay_payment_id || `pay_test_${Math.random().toString(36).slice(2, 12)}`,
            razorpay_signature: 'test_mode_signature',
          });
        } else {
          resolve(response);
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    };

    // Only pass the order_id to Razorpay if we are NOT in test mode.
    // In test mode, the backend generates a fake 'order_test_xxx' ID which 
    // the real Razorpay script would reject as invalid.
    if (!testMode) {
      options.order_id = razorpayOrderId;
    }

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => reject(new Error(response.error?.description || 'Payment failed')));
    rzp.open();
  });
}
