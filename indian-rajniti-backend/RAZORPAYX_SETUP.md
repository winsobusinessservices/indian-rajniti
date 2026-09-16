# RazorpayX instant withdrawals

The wallet creates RazorpayX Payout Links. Contributors are redirected to the
link and can enter a bank account or UPI ID without sharing those details with
this application.

Add these values to the backend environment:

```env
RAZORPAYX_KEY_ID=
RAZORPAYX_KEY_SECRET=
RAZORPAYX_ACCOUNT_NUMBER=
RAZORPAYX_WEBHOOK_SECRET=
```

`RAZORPAYX_ACCOUNT_NUMBER` is the RazorpayX customer identifier/current account
number shown under **My Account & Settings → Banking**. It is not the
contributor's bank account number.

In the RazorpayX dashboard:

1. Allowlist the production backend's fixed outbound IP address for Payout Link APIs.
2. Add the public webhook URL:
   `https://YOUR_API_DOMAIN/api/wallet/razorpay/webhook`
3. Use the same webhook secret in `RAZORPAYX_WEBHOOK_SECRET`.
4. Enable payout status events, including processed, failed and reversed events.
5. Test the complete flow with RazorpayX test credentials before using live keys.

The application verifies webhook signatures against the raw request body. It
also reconciles active Payout Links when a contributor opens the wallet. A
failed, rejected, cancelled, expired or reversed payout restores the reserved
points exactly once.
