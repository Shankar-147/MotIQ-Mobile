# MOTIQ mobile app

React Native (Expo) app for customers.

## Screens

- **Login** - mobile number, then a 6-digit OTP.
- **Payments** - your payments, pull to refresh.
- **New payment** - amount + currency (INR / USD).
- **Payment detail** - status, reference, confirm a pending payment.
- **Profile** - your number and sign out.

The session token is kept in the device keychain/keystore (`expo-secure-store`),
so you stay signed in between launches.

## Running it

Start the API first (see `apps/api`), then:

```
cd apps/mobile
npm install
npx expo start
```

Press `a` for an Android emulator, scan the QR code with Expo Go on a phone,
or press `w` to open it in the browser.

### Pointing the app at the API

| Where the app runs | API URL |
|--------------------|---------|
| Browser / iOS simulator | `http://localhost:3001/api/v1` (default) |
| Android emulator | `http://10.0.2.2:3001/api/v1` (default on Android) |
| Real phone | `http://<your PC's LAN IP>:3001/api/v1` |

For a real phone, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
The phone and the PC must be on the same Wi-Fi.

### Logging in

There is no SMS provider yet. Enter any 10-digit number, then read the 6-digit
code from the API terminal (`[dev] OTP for ...`).

## Known gaps

- "Confirm payment" marks the payment succeeded directly. There is no Razorpay /
  Stripe checkout yet.
