-- Project Thumbnail Setup
-- This file adds thumbnail support to the projects table
-- Run this in your Supabase SQL Editor

-- Add thumbnail_key column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS thumbnail_key TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_thumbnail_key ON projects(thumbnail_key);

-- Add comment to explain the column
COMMENT ON COLUMN projects.thumbnail_key IS 'S3 key for the project thumbnail image';

-- Update existing projects to have a thumbnail (optional)
-- This will set the thumbnail to the most recent image in each project
UPDATE projects 
SET thumbnail_key = (
  SELECT i.s3_key 
  FROM images i 
  WHERE i.project_id = projects.id 
  ORDER BY i.created_at DESC 
  LIMIT 1
)
WHERE thumbnail_key IS NULL 
AND EXISTS (
  SELECT 1 FROM images i2 WHERE i2.project_id = projects.id
);

-- Create a function to automatically update thumbnails when images are added
CREATE OR REPLACE FUNCTION update_project_thumbnail()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if this is a new image and the project doesn't have a thumbnail
  IF TG_OP = 'INSERT' THEN
    UPDATE projects 
    SET thumbnail_key = NEW.s3_key
    WHERE id = NEW.project_id 
    AND thumbnail_key IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set thumbnails
DROP TRIGGER IF EXISTS trigger_update_project_thumbnail ON images;
CREATE TRIGGER trigger_update_project_thumbnail
  AFTER INSERT ON images
  FOR EACH ROW
  EXECUTE FUNCTION update_project_thumbnail();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON projects TO authenticated;

-- Enable RLS if not already enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to include thumbnail_key
-- (This assumes you already have RLS policies for projects)

-- Create a function to get project thumbnail URL
CREATE OR REPLACE FUNCTION get_project_thumbnail_url(project_id UUID)
RETURNS TEXT AS $$
DECLARE
  thumbnail_key TEXT;
BEGIN
  SELECT p.thumbnail_key INTO thumbnail_key
  FROM projects p
  WHERE p.id = project_id;
  
  RETURN thumbnail_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_project_thumbnail_url(UUID) TO authenticated;

-- Test the setup
-- SELECT 
--   p.id,
--   p.name,
--   p.thumbnail_key,
--   CASE 
--     WHEN p.thumbnail_key IS NOT NULL THEN 'Has Thumbnail'
--     ELSE 'No Thumbnail'
--   END as thumbnail_status
-- FROM projects p
-- LIMIT 5;
