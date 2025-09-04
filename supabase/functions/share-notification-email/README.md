
# Project Share Email Notification System

This module is part of a notification system that sends emails when projects are shared with users.

## Overview

The system consists of:

1. A PostgreSQL trigger function (`notify_project_share`) that fires when a new project is shared
2. A notification channel (`project_share_emails`) that broadcasts the share details
3. This edge function that demonstrates how notifications could be processed

## Current Implementation

The current implementation is a simple proof of concept:

- The PostgreSQL trigger function is set up and working
- The edge function demonstrates the concept but doesn't actually connect to the notification system

## Production Implementation Options

For a full implementation, you would need one of the following:

### Option 1: Webhook Integration

Configure a Supabase Database Webhook to call an external email service API directly when a project share is created.

### Option 2: Dedicated Listener Service

Create a service that:
1. Connects to the PostgreSQL database
2. Listens for notifications on the `project_share_emails` channel
3. Processes these notifications to send emails

### Option 3: Enhanced Edge Function

Upgrade this edge function to:
1. Use a proper PostgreSQL listener connection
2. Integrate with an email service provider like Resend, SendGrid, etc.

## Next Steps

To implement a complete solution:

1. Choose an email service provider
2. Configure the necessary API keys
3. Implement the chosen approach from the options above

