# 📧 Email Notification System Setup Guide

## Overview
This guide will help you set up automatic email notifications for when users add, update, or delete image marks and comments in your StillColab application.

## 🚀 Features
- **Automatic Notifications**: Emails sent when marks/comments are added, updated, or deleted
- **Smart Recipients**: Notifies project owners and shared users (excludes the author)
- **Professional Templates**: Beautiful HTML emails with project links
- **Multiple Email Services**: Support for Resend, SendGrid, AWS SES, and custom SMTP
- **Database Logging**: Track all notification attempts and results
- **Real-time Triggers**: Database triggers automatically fire notifications

## 🗄️ Database Setup

### Step 1: Run the Notification Database Schema
Copy and paste the contents of `supabase_notification_setup.sql` into your Supabase SQL Editor and run it.

This will create:
- `notification_logs` table for tracking sent notifications
- Database triggers for automatic notifications
- Functions for notification handling
- RLS policies for security

### Step 2: Verify the Setup
Check that the following were created:
- ✅ `notification_logs` table
- ✅ Database triggers on `image_marks` and `image_comments`
- ✅ `send_notification` function
- ✅ RLS policies enabled

## 🔧 Edge Function Setup

### Step 1: Deploy the Edge Function
1. Navigate to your Supabase project dashboard
2. Go to **Edge Functions** section
3. Create a new function called `send-notifications`
4. Copy the code from `supabase/functions/send-notifications/index.ts`
5. Deploy the function

### Step 2: Configure Environment Variables
In your Supabase Edge Function settings, add these environment variables:

```bash
# Required
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Service (choose one)
RESEND_API_KEY=your_resend_api_key

# Optional
FRONTEND_URL=https://yourdomain.com
```

## 📧 Email Service Configuration

### Option 1: Resend (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Set `RESEND_API_KEY` environment variable
4. Verify your domain for sending emails

### Option 2: SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get your API key
3. Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` environment variables

### Option 3: AWS SES
1. Configure AWS SES in your AWS account
2. Set AWS credentials and region environment variables
3. Verify your domain or email addresses

### Option 4: Custom SMTP
1. Configure your SMTP server details
2. Set SMTP environment variables
3. Test the connection

## 🔄 Frontend Integration

### Step 1: Install the Notification Service
The notification service is already integrated into your `imageMarkService.ts` file. It will automatically send notifications when:
- Adding new marks
- Updating existing marks
- Deleting marks

### Step 2: Test Notifications
1. Open an image in marking mode
2. Add a new mark with a comment
3. Check your email (and other project members' emails)
4. Verify the notification was sent

## 📋 How It Works

### 1. **User Action**
- User adds/updates/deletes a mark or comment
- Frontend saves the data to database

### 2. **Database Trigger**
- Database trigger automatically fires
- Calls the `send_notification` function
- Prepares notification data

### 3. **Edge Function**
- Receives notification request
- Fetches project and user details
- Determines recipients (project owner + shared users)
- Generates email content
- Sends emails via configured service

### 4. **Email Delivery**
- Professional HTML email sent to all recipients
- Includes project link and action details
- Logs success/failure in database

## 🎨 Email Template Features

### **Professional Design**
- StillColab branding with your color scheme
- Responsive HTML layout
- Clear action descriptions
- Direct project links

### **Smart Content**
- Different templates for marks vs comments
- Includes mark type, color, and coordinates
- Shows project and image names
- Author attribution

### **Action Buttons**
- "View Project" button in emails
- Links directly to the relevant project
- Mobile-friendly design

## 🔐 Security Features

### **RLS Policies**
- Users can only view their own notification logs
- Project-based access control
- Secure data handling

### **User Privacy**
- Author is never notified of their own actions
- Only project members receive notifications
- No sensitive data exposed in emails

### **Rate Limiting**
- Built-in error handling
- Fallback mechanisms
- Graceful degradation

## 🐛 Troubleshooting

### **Notifications Not Sending**
1. Check Edge Function logs in Supabase dashboard
2. Verify environment variables are set correctly
3. Test email service credentials
4. Check database triggers are active

### **Email Service Issues**
1. Verify API keys are correct
2. Check email service quotas/limits
3. Test with simple email first
4. Check spam/junk folders

### **Database Errors**
1. Run the notification setup SQL again
2. Check RLS policies are enabled
3. Verify table permissions
4. Check trigger functions exist

## 📊 Monitoring & Analytics

### **Notification Logs**
- Track all notification attempts
- Monitor success/failure rates
- View recipient counts
- Analyze notification patterns

### **Performance Metrics**
- Email delivery times
- Success rates by email service
- User engagement with notifications
- System reliability metrics

## 🚀 Advanced Configuration

### **Custom Email Templates**
- Modify the `generateEmailContent` function
- Add your company branding
- Customize email styling
- Include additional information

### **Multiple Email Services**
- Configure fallback services
- Load balance between providers
- Monitor service health
- Automatic failover

### **Notification Preferences**
- User notification settings
- Frequency controls
- Content preferences
- Unsubscribe options

## 🎯 Next Steps

1. **Deploy the Edge Function** with your email service
2. **Test the system** with sample marks and comments
3. **Customize email templates** to match your branding
4. **Monitor performance** and adjust as needed
5. **Add user preferences** for notification control

## 📞 Support

If you encounter issues:
1. Check the Supabase Edge Function logs
2. Verify all environment variables are set
3. Test email service credentials separately
4. Review database trigger setup
5. Check browser console for frontend errors

---

**Need help?** The notification system is designed to be robust and self-healing. Most issues can be resolved by checking the configuration and logs.
