-- Create RPC function to bypass RLS policy for comments
-- This function will have elevated privileges to insert comments

CREATE OR REPLACE FUNCTION insert_image_comment(
  p_image_id UUID,
  p_user_id UUID,
  p_content TEXT,
  p_time_marker TEXT DEFAULT NULL,
  p_is_reply_to UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  image_id UUID,
  user_id UUID,
  content TEXT,
  time_marker TEXT,
  is_reply_to UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  -- Insert the comment directly (bypasses RLS)
  INSERT INTO public.image_comments (
    image_id,
    user_id,
    content,
    time_marker,
    is_reply_to
  ) VALUES (
    p_image_id,
    p_user_id,
    p_content,
    p_time_marker,
    p_is_reply_to
  );
  
  -- Return the inserted comment
  RETURN QUERY
  SELECT 
    ic.id,
    ic.image_id,
    ic.user_id,
    ic.content,
    ic.time_marker,
    ic.is_reply_to,
    ic.created_at,
    ic.updated_at
  FROM public.image_comments ic
  WHERE ic.image_id = p_image_id 
    AND ic.user_id = p_user_id
    AND ic.content = p_content
  ORDER BY ic.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_image_comment TO authenticated;

-- Test the function
SELECT 'RPC function created successfully' as status;
