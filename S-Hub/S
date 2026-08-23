# Supabase OTP Setup Guide

Your app uses a **cloud Supabase** instance (`https://ldyqkrrhnkkfmevpnyes.supabase.co`). The OTP verification codes are not being sent because the email/SMS authentication settings need to be configured on the **Supabase cloud dashboard**.

## Step 1: Enable Email Confirmations

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ldyqkrrhnkkfmevpnyes`
3. Navigate to **Authentication → Providers → Email**
4. Toggle **Confirm email** to **ON**
5. Click **Save**

## Step 2: Configure Email Delivery (for OTP codes)

### Option A: Use Supabase's built-in email (easiest, for testing)
- Supabase provides a built-in email service for development
- Emails are rate-limited (2-4 per hour on free tier)
- Go to **Authentication → Email Templates** to customize the OTP email
- The OTP code will be in the confirmation email sent to the user

### Option B: Use a custom SMTP server (for production)
1. Go to **Authentication → SMTP Settings**
2. Toggle **Enable custom SMTP** to **ON**
3. Configure your SMTP provider:
   - **Host**: e.g., `smtp.sendgrid.net`, `smtp.gmail.com`, `smtp.mailgun.org`
   - **Port**: e.g., `587`
   - **Username**: your SMTP username
   - **Password**: your SMTP password
   - **Sender email**: e.g., `noreply@yourdomain.com`
4. Click **Save**
5. Recommended providers: **SendGrid**, **Resend**, **Postmark**, **Amazon SES**

## Step 3: Enable Phone (SMS) Authentication (if using phone signup)

1. Go to **Authentication → Providers → Phone**
2. Toggle **Enable Phone provider** to **ON**
3. Configure an SMS provider:
   - Go to **Authentication → SMS Settings**
   - Choose a provider: **Twilio**, **MessageBird**, **Vonage**, or **TextLocal**
   - Enter your provider credentials (Account SID, Auth Token, etc.)
4. Click **Save**

> **Note**: SMS providers require a paid account and cost money per message. For development, use email signup instead of phone.

## Step 4: Test Email OTP

1. Sign up with a real email address in the app
2. Check the user's inbox for a confirmation email from Supabase
3. The email contains a 6-digit OTP code
4. Enter that code in the OTP verification screen

### View emails in development
If you're using Supabase's built-in email:
- Go to **Authentication → Users** to see registered users
- The confirmation email is sent to the user's email address
- You can also check the email logs in the dashboard

## Step 5: Configure Redirect URLs

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your app's URL (e.g., `http://localhost:8081` for Expo dev)
3. Add **Redirect URLs**:
   - `http://localhost:8081`
   - `exp://127.0.0.1:8081`
   - `shub://auth/callback`
   - Your production URL when deployed

## Quick Fix for Immediate Testing

If you just want to test the app flow without real email delivery:

### Option 1: Disable email confirmation temporarily
1. Go to **Authentication → Providers → Email**
2. Toggle **Confirm email** to **OFF**
3. Users will be logged in immediately after signup (no OTP needed)
4. The app already handles this — it checks for a session and redirects to home

### Option 2: Use the Supabase dashboard to manually confirm users
1. Sign up in the app
2. Go to **Authentication → Users** in the dashboard
3. Find the user and click **Confirm** to manually verify their email
4. The user can now sign in

## Environment Variables

Make sure your `.env` file has the correct values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://ldyqkrrhnkkfmevpnyes.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Common Issues

| Issue | Solution |
|-------|----------|
| No email received | Check spam folder, verify SMTP settings, check rate limits |
| "Email not confirmed" error | Enable email confirmations in dashboard, or disable for testing |
| SMS not received | Configure an SMS provider (Twilio, etc.) — requires paid account |
| Rate limit exceeded | Free tier limits: 2-4 emails/hour. Wait or upgrade plan |
| OTP expired | OTP codes expire after 1 hour by default. Resend a new code |