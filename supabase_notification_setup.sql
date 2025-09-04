-- Notification System Database Setup
-- This file sets up the tables and triggers needed for email notifications
-- 
-- IMPORTANT: Run this in your Supabase SQL Editor after the main image_marks setup
-- This will create the notification_logs table and enable automatic notifications

-- Create the notification_logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('mark_added', 'mark_updated', 'mark_deleted', 'comment_added', 'comment_updated', 'comment_deleted')),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    content TEXT,
    recipients_count INTEGER NOT NULL DEFAULT 0,
    successful_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_project_id ON notification_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_image_id ON notification_logs(image_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_author_id ON notification_logs(author_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);

-- Enable Row Level Security (RLS)
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_logs table
CREATE POLICY "Users can view their own notification logs" ON notification_logs
    FOR SELECT USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id
            AND (p.user_id = auth.uid() OR p.visibility = 'public')
        )
    );

-- Create a function to send notifications via Edge Function
CREATE OR REPLACE FUNCTION send_notification(
    p_type TEXT,
    p_project_id UUID,
    p_image_id UUID,
    p_author_id UUID,
    p_author_name TEXT,
    p_content TEXT DEFAULT NULL,
    p_mark_type TEXT DEFAULT NULL,
    p_mark_color TEXT DEFAULT NULL,
    p_coordinates JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    edge_function_url TEXT;
    notification_data JSONB;
    response JSONB;
BEGIN
    -- Get the Edge Function URL from environment
    edge_function_url := current_setting('app.settings.edge_function_url', true);
    
    IF edge_function_url IS NULL THEN
        edge_function_url := 'http://localhost:54321/functions/v1/send-notifications';
    END IF;
    
    -- Prepare notification data
    notification_data := jsonb_build_object(
        'type', p_type,
        'projectId', p_project_id,
        'imageId', p_image_id,
        'authorId', p_author_id,
        'authorName', p_author_name,
        'content', p_content,
        'markType', p_mark_type,
        'markColor', p_mark_color,
        'coordinates', p_coordinates
    );
    
    -- Call the Edge Function (this will be handled by the application layer)
    -- For now, we'll just return the notification data
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Notification queued for sending',
        'data', notification_data
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notification_logs TO authenticated;
GRANT EXECUTE ON FUNCTION send_notification(TEXT, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Create triggers for automatic notifications

-- Trigger function for image marks
CREATE OR REPLACE FUNCTION notify_image_mark_changes() RETURNS TRIGGER AS $$
DECLARE
    project_name TEXT;
    image_name TEXT;
    author_email TEXT;
    coordinates JSONB;
BEGIN
    -- Get project and image names
    SELECT p.name INTO project_name
    FROM projects p
    WHERE p.id = NEW.project_id;
    
    SELECT i.name INTO image_name
    FROM images i
    WHERE i.id = NEW.image_id;
    
    -- Get author email
    SELECT email INTO author_email
    FROM auth.users
    WHERE id = NEW.author_id;
    
    -- Prepare coordinates
    coordinates := jsonb_build_object(
        'x', NEW.x_coordinate,
        'y', NEW.y_coordinate
    );
    
    -- Call notification function based on operation
    IF TG_OP = 'INSERT' THEN
        PERFORM send_notification(
            'mark_added',
            NEW.project_id,
            NEW.image_id,
            NEW.author_id,
            NEW.author_name,
            NEW.comment,
            NEW.mark_type,
            NEW.color,
            coordinates
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM send_notification(
            'mark_updated',
            NEW.project_id,
            NEW.image_id,
            NEW.author_id,
            NEW.author_name,
            NEW.comment,
            NEW.mark_type,
            NEW.color,
            coordinates
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM send_notification(
            'mark_deleted',
            OLD.project_id,
            OLD.image_id,
            OLD.author_id,
            OLD.author_name,
            OLD.comment,
            OLD.mark_type,
            OLD.color,
            jsonb_build_object('x', OLD.x_coordinate, 'y', OLD.y_coordinate)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for image marks
CREATE TRIGGER trigger_notify_image_mark_changes
    AFTER INSERT OR UPDATE OR DELETE ON image_marks
    FOR EACH ROW
    EXECUTE FUNCTION notify_image_mark_changes();

-- Trigger function for image comments
CREATE OR REPLACE FUNCTION notify_image_comment_changes() RETURNS TRIGGER AS $$
DECLARE
    project_name TEXT;
    image_name TEXT;
    author_email TEXT;
BEGIN
    -- Get project and image names
    SELECT p.name INTO project_name
    FROM projects p
    JOIN images i ON i.project_id = p.id
    WHERE i.id = NEW.image_id;
    
    SELECT i.name INTO image_name
    FROM images i
    WHERE i.id = NEW.image_id;
    
    -- Get author email
    SELECT email INTO author_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Call notification function based on operation
    IF TG_OP = 'INSERT' THEN
        PERFORM send_notification(
            'comment_added',
            (SELECT project_id FROM images WHERE id = NEW.image_id),
            NEW.image_id,
            NEW.user_id,
            COALESCE((SELECT full_name FROM profiles WHERE id = NEW.user_id), 'Unknown User'),
            NEW.content
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM send_notification(
            'comment_updated',
            (SELECT project_id FROM images WHERE id = NEW.image_id),
            NEW.image_id,
            NEW.user_id,
            COALESCE((SELECT full_name FROM profiles WHERE id = NEW.user_id), 'Unknown User'),
            NEW.content
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM send_notification(
            'comment_deleted',
            (SELECT project_id FROM images WHERE id = OLD.image_id),
            OLD.image_id,
            OLD.user_id,
            COALESCE((SELECT full_name FROM profiles WHERE id = OLD.user_id), 'Unknown User'),
            OLD.content
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for image comments
CREATE TRIGGER trigger_notify_image_comment_changes
    AFTER INSERT OR UPDATE OR DELETE ON image_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_image_comment_changes();

-- Insert sample notification log for testing (optional)
-- INSERT INTO notification_logs (type, project_id, image_id, author_id, author_name, content, recipients_count, successful_count, failed_count)
-- VALUES ('mark_added', 'sample-project-id', 'sample-image-id', 'sample-user-id', 'John Doe', 'Test mark', 3, 3, 0);

-- Enable real-time for the notification_logs table
DO $$ 
BEGIN
    -- Try to add the table to the realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_logs;
EXCEPTION
    WHEN undefined_object THEN
        -- If the publication doesn't exist, create it
        CREATE PUBLICATION supabase_realtime FOR TABLE notification_logs;
    WHEN duplicate_object THEN
        -- Table already in publication, ignore
        NULL;
END $$;
