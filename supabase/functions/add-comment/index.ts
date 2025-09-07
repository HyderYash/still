import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        // Create Supabase client with service role key (bypasses RLS)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Get the authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401
                }
            )
        }

        // Verify the user token
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401
                }
            )
        }

        // Parse request body
        const { imageId, content, timeMarker, replyTo } = await req.json()

        if (!imageId || !content) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        // Insert comment using raw SQL to bypass ALL triggers and constraints
        const { data: insertedComment, error: insertError } = await supabaseClient
            .rpc('raw_insert_comment', {
                p_image_id: imageId,
                p_user_id: user.id,
                p_content: content.trim(),
                p_time_marker: timeMarker || null,
                p_is_reply_to: replyTo || null,
            })

        if (insertError) {
            console.error('Error inserting comment via raw SQL:', insertError)

            // FALLBACK: Try direct insert with explicit schema
            console.log('Trying fallback direct insert...')
            const { data: fallbackComment, error: fallbackError } = await supabaseClient
                .from('public.image_comments')
                .insert({
                    image_id: imageId,
                    user_id: user.id,
                    content: content.trim(),
                    time_marker: timeMarker || null,
                    is_reply_to: replyTo || null,
                })
                .select('*')
                .single()

            if (fallbackError) {
                console.error('Fallback also failed:', fallbackError)
                return new Response(
                    JSON.stringify({ error: 'Failed to insert comment', details: fallbackError.message }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 500
                    }
                )
            }

            // Use fallback data
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('first_name, last_name, avatar_url')
                .eq('id', user.id)
                .single()

            const formattedComment = {
                id: fallbackComment.id,
                image_id: fallbackComment.image_id,
                user_id: fallbackComment.user_id,
                content: fallbackComment.content,
                time_marker: fallbackComment.time_marker,
                is_reply_to: fallbackComment.is_reply_to,
                created_at: fallbackComment.created_at,
                updated_at: fallbackComment.updated_at,
                author_name: profile
                    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Anonymous"
                    : "Anonymous",
                author_avatar: profile?.avatar_url,
            }

            return new Response(
                JSON.stringify(formattedComment),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                }
            )
        }

        // Get user profile for author info
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', user.id)
            .single()

        // Format the response
        const formattedComment = {
            id: insertedComment.id,
            image_id: insertedComment.image_id,
            user_id: insertedComment.user_id,
            content: insertedComment.content,
            time_marker: insertedComment.time_marker,
            is_reply_to: insertedComment.is_reply_to,
            created_at: insertedComment.created_at,
            updated_at: insertedComment.updated_at,
            author_name: profile
                ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Anonymous"
                : "Anonymous",
            author_avatar: profile?.avatar_url,
        }

        return new Response(
            JSON.stringify(formattedComment),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('Edge function error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
