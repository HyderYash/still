# 🚀 Complete Supabase Setup Guide for Frame-Sharer App

This guide will help you set up your new Supabase instance (`https://qbsnyrsolodragotgzps.supabase.co`) for the Frame-Sharer application.

## 📋 Prerequisites

- Access to your Supabase dashboard
- Basic understanding of SQL
- Your app's domain/URL for authentication setup

## 🗂️ Files to Execute

You have **4 SQL files** that need to be executed in order:

1. **`supabase_setup.sql`** - Main database schema
2. **`supabase_functions.sql`** - Database functions and triggers
3. **`supabase_rls_policies.sql`** - Row Level Security policies
4. **`supabase_final_setup.sql`** - Final permissions and configuration

## 🚀 Step-by-Step Setup

### Step 1: Execute Main Schema
1. Go to your Supabase dashboard → SQL Editor
2. Copy and paste the contents of `supabase_setup.sql`
3. Click "Run" to execute
4. ✅ **Expected**: Tables created, initial data inserted

### Step 2: Execute Functions
1. In the same SQL Editor, copy and paste `supabase_functions.sql`
2. Click "Run" to execute
3. ✅ **Expected**: Functions created, triggers set up

### Step 3: Execute RLS Policies
1. Copy and paste `supabase_rls_policies.sql`
2. Click "Run" to execute
3. ✅ **Expected**: RLS enabled, security policies created

### Step 4: Execute Final Setup
1. Copy and paste `supabase_final_setup.sql`
2. Click "Run" to execute
3. ✅ **Expected**: Permissions granted, realtime enabled

## 🗄️ Storage Bucket Setup

### Create Storage Buckets
1. Go to **Storage** → **Buckets** in your dashboard
2. Create these buckets:
   - `project-images` (for uploaded images)
   - `project-thumbnails` (for project thumbnails)
   - `user-avatars` (for profile pictures)

### Set Storage Policies
After creating buckets, run these commands in SQL Editor:
```sql
SELECT create_storage_policies('project-images');
SELECT create_storage_policies('project-thumbnails');
SELECT create_storage_policies('user-avatars');
```

## 🔐 Authentication Setup

### Configure Auth Settings
1. Go to **Authentication** → **Settings**
2. Set **Site URL**: Your app's domain (e.g., `http://localhost:3000` for development)
3. Add **Redirect URLs**: Your app's URLs for post-auth redirects

### Enable Providers
1. **Email**: Enable email authentication
2. **Google OAuth**: Add your Google OAuth credentials if needed
3. **Other providers**: Enable as needed

## 🔑 Environment Variables

Update your app's environment variables:

```env
VITE_SUPABASE_URL=https://qbsnyrsolodragotgzps.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**To find your anon key:**
1. Go to **Settings** → **API** in your dashboard
2. Copy the `anon` public key

## 🧪 Testing Your Setup

### Test Authentication
1. Try to create a user account
2. Verify a profile is automatically created
3. Check the `profiles` table for the new user

### Test Core Features
1. **Create a project**: Should work for authenticated users
2. **Upload images**: Should work if storage is set up
3. **Share projects**: Test the sharing functionality
4. **Comments**: Test adding/viewing comments

## 📊 Database Schema Overview

Your database now includes:

- **`profiles`** - User profiles and settings
- **`plans`** - Subscription tiers
- **`projects`** - User projects
- **`folders`** - Project organization
- **`images`** - Image metadata
- **`image_comments`** - Comments on images
- **`image_votes`** - Voting system
- **`project_shares`** - Project sharing
- **`subscribers`** - Subscription management

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **User isolation**: Users can only access their own data
- **Public projects**: Anyone can view public projects
- **Shared access**: Controlled project sharing system
- **Storage policies**: Secure file access

## 🚨 Troubleshooting

### Common Issues

1. **"Function not found" errors**
   - Ensure you ran all SQL files in order
   - Check that functions were created successfully

2. **"Permission denied" errors**
   - Verify RLS policies are created
   - Check that grants were executed

3. **"Table doesn't exist" errors**
   - Ensure `supabase_setup.sql` ran successfully
   - Check the Tables section in your dashboard

4. **Authentication issues**
   - Verify auth settings are configured
   - Check redirect URLs match your app

### Debug Steps

1. **Check SQL Editor logs** for execution errors
2. **Verify tables exist** in the Table Editor
3. **Check RLS status** in table settings
4. **Review auth logs** in Authentication → Logs

## 🎯 Next Steps

After successful setup:

1. **Test the app** with real authentication
2. **Create test data** to verify functionality
3. **Deploy your app** to production
4. **Monitor usage** in the Supabase dashboard

## 📞 Support

If you encounter issues:

1. Check the Supabase documentation
2. Review the SQL execution logs
3. Verify all steps were completed
4. Check that your app's environment variables are correct

---

## 🎉 Setup Complete!

Your Supabase instance is now ready for the Frame-Sharer application! 

**Remember**: Run the SQL files in the correct order, and don't skip any steps. The setup is designed to be comprehensive and error-free.

Happy coding! 🚀
