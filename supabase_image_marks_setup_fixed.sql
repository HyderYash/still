-- Image Marks Database Schema Setup (Fixed Version)
-- This file sets up the tables and functions needed for the image marking system
-- 
-- IMPORTANT: Run this in your Supabase SQL Editor
-- This will create the image_marks table and enable real-time collaboration
-- 
-- Features:
-- - Users can draw circles, rectangles, and points on images
-- - All marks are saved to the database with author information
-- - Real-time updates so all users see changes instantly
-- - Row Level Security (RLS) for user safety

-- Drop existing table if it exists (for clean setup)
DROP TABLE IF EXISTS image_marks CASCADE;

-- Create the image_marks table
CREATE TABLE image_marks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    mark_type TEXT NOT NULL CHECK (mark_type IN ('circle', 'rectangle', 'point')),
    x_coordinate INTEGER NOT NULL,
    y_coordinate INTEGER NOT NULL,
    radius INTEGER, -- for circles
    width INTEGER,  -- for rectangles
    height INTEGER, -- for rectangles
    color TEXT NOT NULL CHECK (color IN ('blue', 'green', 'red', 'yellow', 'purple')),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_image_marks_image_id ON image_marks(image_id);
CREATE INDEX idx_image_marks_project_id ON image_marks(project_id);
CREATE INDEX idx_image_marks_author_id ON image_marks(author_id);
CREATE INDEX idx_image_marks_created_at ON image_marks(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_image_marks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_image_marks_updated_at
    BEFORE UPDATE ON image_marks
    FOR EACH ROW
    EXECUTE FUNCTION update_image_marks_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE image_marks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all image marks" ON image_marks;
DROP POLICY IF EXISTS "Users can create marks on accessible images" ON image_marks;
DROP POLICY IF EXISTS "Users can update their own marks" ON image_marks;
DROP POLICY IF EXISTS "Users can delete their own marks" ON image_marks;

-- RLS Policies for image_marks table

-- Policy: Users can view marks on any image (public read access)
CREATE POLICY "Users can view all image marks" ON image_marks
    FOR SELECT USING (true);

-- Policy: Users can create marks on images in projects they have access to
CREATE POLICY "Users can create marks on accessible images" ON image_marks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id
            AND (
                p.visibility = 'public' 
                OR p.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_shares ps
                    WHERE ps.project_id = p.id
                    AND ps.shared_with = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND ps.status = 'accepted'
                )
            )
        )
    );

-- Policy: Users can update their own marks
CREATE POLICY "Users can update their own marks" ON image_marks
    FOR UPDATE USING (author_id = auth.uid());

-- Policy: Users can delete their own marks
CREATE POLICY "Users can delete their own marks" ON image_marks
    FOR DELETE USING (author_id = auth.uid());

-- Create a function to get marks with author information
CREATE OR REPLACE FUNCTION get_image_marks_with_authors(p_image_id UUID)
RETURNS TABLE (
    id UUID,
    image_id UUID,
    project_id UUID,
    author_id UUID,
    author_name TEXT,
    mark_type TEXT,
    x_coordinate INTEGER,
    y_coordinate INTEGER,
    radius INTEGER,
    width INTEGER,
    height INTEGER,
    color TEXT,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        im.id,
        im.image_id,
        im.project_id,
        im.author_id,
        im.author_name,
        im.mark_type,
        im.x_coordinate,
        im.y_coordinate,
        im.radius,
        im.width,
        im.height,
        im.color,
        im.comment,
        im.created_at,
        im.updated_at
    FROM image_marks im
    WHERE im.image_id = p_image_id
    ORDER BY im.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON image_marks TO authenticated;
GRANT EXECUTE ON FUNCTION get_image_marks_with_authors(UUID) TO authenticated;

-- Enable real-time for the image_marks table
DO $$ 
BEGIN
    -- Try to add the table to the realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE image_marks;
EXCEPTION
    WHEN undefined_object THEN
        -- If the publication doesn't exist, create it
        CREATE PUBLICATION supabase_realtime FOR TABLE image_marks;
    WHEN duplicate_object THEN
        -- Table already in publication, ignore
        NULL;
END $$;
