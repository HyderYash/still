-- Simple Project Thumbnail Setup
-- This script only adds the essential thumbnail_key column
-- Run this in your Supabase SQL Editor

-- Add thumbnail_key column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS thumbnail_key TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_thumbnail_key ON projects(thumbnail_key);

-- Grant necessary permissions
GRANT ALL ON projects TO authenticated;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name = 'thumbnail_key';
