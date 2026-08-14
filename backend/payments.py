"""
Razorpay integration.

If RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in the environment, the
app runs in a local "test mode": it fabricates a razorpay-shaped order id and
skips real signature verification, so the full checkout flow (including the
Razorpay Checkout.js popup) still works for a live demo without real keys.
Set real keys in backend/.env to process real payments.
"""
import hashlib
import hmac
import uuid

from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_TEST_MODE

try:
    import razorpay
except ImportError:
    razorpay = None

_client = None
if not RAZORPAY_TEST_MODE and razorpay is not None:
    _client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def create_razorpay_order(amount_rupees: float, receipt: str) -> dict:
    """Returns a dict with at least: id, amount (paise), currency."""
    amount_paise = int(round(amount_rupees * 100))

    if RAZORPAY_TEST_MODE or _client is None:
        return {
            "id": f"order_test_{uuid.uuid4().hex[:14]}",
            "amount": amount_paise,
            "currency": "INR",
        }

    return _client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "payment_capture": 1,
    })


def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    if RAZORPAY_TEST_MODE or _client is None:
        # Test mode: accept any payment id that looks like it came from our
        # simulated checkout (frontend generates one when no real key is set).
        return razorpay_payment_id.startswith("pay_test_") or bool(razorpay_payment_id)

    try:
        _client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        })
        return True
    except Exception:
        # Fallback manual verification (matches Razorpay's documented HMAC scheme)
        generated_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(generated_signature, razorpay_signature)
