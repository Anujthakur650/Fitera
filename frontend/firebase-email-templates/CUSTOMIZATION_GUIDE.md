# Firebase Email Template Customization Guide

This guide will help you implement custom, branded email templates for your Fitera app in Firebase.

## 📧 Email Templates Created

1. **Password Reset Email** (`password-reset-template.html`)
   - Professional design with Fitera branding
   - Clear call-to-action button
   - Security information included
   - Mobile-responsive design

2. **Email Verification** (`email-verification-template.html`)
   - Welcome message for new users
   - Benefits of email verification
   - Engaging design with icons
   - Clear instructions

## 🚀 How to Implement in Firebase Console

### Step 1: Access Email Templates
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **Fitera** project
3. Navigate to **Authentication** → **Templates**

### Step 2: Customize Password Reset Email

1. Click on **Password reset**
2. Click the **pencil icon** to edit
3. Update the following fields:

#### Subject Line:
```
Reset your Fitera password
```

#### Sender Name:
```
Fitera
```

#### Reply-to Email (optional):
```
support@fitera.app
```

#### Message Body:
In the Firebase Console, you'll see a basic editor. Unfortunately, Firebase doesn't support full HTML templates directly, but you can use a simplified version:

```
Hi there,

We received a request to reset the password for your Fitera account associated with %EMAIL%.

Click here to reset your password: %LINK%

If you didn't request this, you can safely ignore this email. Your password won't be changed until you click the link above and create a new one.

This link will expire in 1 hour for security reasons.

Best regards,
The Fitera Team

© 2025 Fitera. All rights reserved.
```

### Step 3: Customize Email Verification

1. Click on **Email address verification**
2. Click the **pencil icon** to edit
3. Update the following fields:

#### Subject Line:
```
Verify your Fitera email address
```

#### Message Body:
```
Welcome to Fitera! 🎉

Thanks for signing up! Please verify your email address %EMAIL% to unlock all features and keep your account secure.

Click here to verify your email: %LINK%

Why verify your email?
• Secure your account and protect your data
• Receive important updates about your workouts
• Enable password recovery options
• Get personalized fitness recommendations

This verification link will expire in 24 hours.

Happy training! 💪
The Fitera Team

© 2025 Fitera. All rights reserved.
```

### Step 4: Configure Email Settings

1. In **Authentication** → **Settings** → **User actions**
2. Configure the following:
   - **Email enumeration protection**: Enable for better security
   - **User account deletion**: Configure as needed

## 🎨 Advanced Customization Options

### Option 1: Use Custom SMTP (Recommended for Full HTML)

To use the full HTML templates created:

1. Set up a custom SMTP service (SendGrid, Mailgun, etc.)
2. Use Firebase Functions to send custom emails
3. Implement the HTML templates in your email service

### Option 2: Firebase Extensions

1. Install the **Trigger Email** extension
2. Configure with your SMTP provider
3. Use the HTML templates with dynamic content

### Example Firebase Function for Custom Emails:

```javascript
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Configure your SMTP
const transporter = nodemailer.createTransport({
  service: 'SendGrid', // or your SMTP service
  auth: {
    user: 'apikey',
    pass: 'your-sendgrid-api-key'
  }
});

// Send custom password reset email
exports.sendCustomPasswordReset = functions.auth.user().onCreate(async (user) => {
  const mailOptions = {
    from: 'noreply@fitera.app',
    to: user.email,
    subject: 'Reset your Fitera password',
    html: // Your HTML template here
  };
  
  await transporter.sendMail(mailOptions);
});
```

## 🔒 Security Best Practices

1. **Email Enumeration Protection**: Always enable this in Firebase
2. **Rate Limiting**: Firebase automatically rate-limits password reset requests
3. **Link Expiration**: Default is 1 hour, which is secure
4. **HTTPS Only**: Ensure all links use HTTPS

## 📱 Testing Your Email Templates

1. Create a test account in your app
2. Trigger password reset from the forgot password screen
3. Check email delivery and formatting
4. Test on multiple email clients (Gmail, Outlook, Apple Mail)
5. Verify mobile responsiveness

## 🌐 Custom Domain Setup (Optional)

To send emails from your own domain:

1. Verify your domain in Firebase Console
2. Add SPF records to your DNS
3. Configure DKIM for better deliverability
4. Update sender email to use your domain

### DNS Records Example:
```
TXT  @  v=spf1 include:_spf.firebasemail.com ~all
```

## 📊 Monitoring Email Delivery

1. Check Firebase Console for email sending statistics
2. Monitor bounce rates and spam reports
3. Use Firebase Analytics to track email engagement
4. Set up alerts for failed deliveries

## 🎯 Next Steps

1. ✅ Apply the email templates in Firebase Console
2. ✅ Test with real email addresses
3. ✅ Monitor delivery rates
4. 🔄 Consider implementing custom SMTP for full HTML support
5. 🔄 Set up email analytics tracking

## 💡 Tips

- Keep email content concise and clear
- Always include unsubscribe options for marketing emails
- Test across different email clients
- Use alt text for images (when using HTML)
- Include both HTML and plain text versions

---

Remember: The simplified versions in Firebase Console will work great for most users. The full HTML templates are available if you decide to implement custom email sending in the future!
