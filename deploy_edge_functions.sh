#!/bin/bash

echo "🚀 Deploying Supabase Edge Functions with CORS fixes..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Login to Supabase (will prompt for token)
echo "🔐 Logging into Supabase..."
supabase login

# Link to your project
echo "🔗 Linking to project..."
supabase link --project-ref xinnvfrdgirclrwgscnk

# Deploy all Edge Functions
echo "📦 Deploying Edge Functions..."

echo "📤 Deploying upload-image..."
supabase functions deploy upload-image

echo "📤 Deploying delete-image..."
supabase functions deploy delete-image

echo "📤 Deploying delete-folder-images..."
supabase functions deploy delete-folder-images

echo "📤 Deploying ensure-storage-bucket..."
supabase functions deploy ensure-storage-bucket

echo "📤 Deploying send-notifications..."
supabase functions deploy send-notifications

echo "📤 Deploying share-notification-email..."
supabase functions deploy share-notification-email

echo "📤 Deploying check-subscription..."
supabase functions deploy check-subscription

echo "📤 Deploying create-checkout..."
supabase functions deploy create-checkout

echo "✅ All Edge Functions deployed successfully!"
echo "🎯 Now test image upload - CORS errors should be resolved!"
