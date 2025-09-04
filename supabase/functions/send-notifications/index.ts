import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
    type: 'mark_added' | 'mark_updated' | 'mark_deleted' | 'comment_added' | 'comment_updated' | 'comment_deleted'
    projectId: string
    projectName: string
    imageId: string
    imageName: string
    authorId: string
    authorName: string
    authorEmail: string
    content?: string
    markType?: string
    markColor?: string
    coordinates?: { x: number; y: number }
    recipients: Array<{
        id: string
        email: string
        name: string
    }>
}

interface EmailTemplate {
    subject: string
    html: string
    text: string
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { notificationData } = await req.json()

        if (!notificationData) {
            throw new Error('Notification data is required')
        }

        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get project details
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('name, user_id, visibility')
            .eq('id', notificationData.projectId)
            .single()

        if (projectError) {
            throw new Error(`Failed to fetch project: ${projectError.message}`)
        }

        // Get image details
        const { data: image, error: imageError } = await supabase
            .from('images')
            .select('name, file_path')
            .eq('id', notificationData.imageId)
            .single()

        if (imageError) {
            throw new Error(`Failed to fetch image: ${imageError.message}`)
        }

        // Get project owner details
        const { data: projectOwner, error: ownerError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', project.user_id)
            .single()

        if (ownerError) {
            throw new Error(`Failed to fetch project owner: ${ownerError.message}`)
        }

        // Get shared users for the project
        const { data: sharedUsers, error: sharedError } = await supabase
            .from('project_shares')
            .select(`
        shared_with,
        profiles!project_shares_shared_with_fkey(email, full_name)
      `)
            .eq('project_id', notificationData.projectId)
            .eq('status', 'accepted')

        if (sharedError) {
            throw new Error(`Failed to fetch shared users: ${sharedError.message}`)
        }

        // Build recipients list
        const recipients = [
            // Project owner
            {
                id: project.user_id,
                email: projectOwner.email,
                name: projectOwner.full_name || 'Project Owner'
            },
            // Shared users
            ...(sharedUsers?.map(share => ({
                id: share.shared_with,
                email: share.profiles.email,
                name: share.profiles.full_name || 'Shared User'
            })) || [])
        ].filter(recipient =>
            recipient.email &&
            recipient.email !== notificationData.authorEmail // Don't notify the author
        )

        // Generate email content
        const emailContent = generateEmailContent({
            ...notificationData,
            projectName: project.name,
            imageName: image.name,
            recipients
        })

        // Send emails to all recipients
        const emailPromises = recipients.map(recipient =>
            sendEmail(recipient.email, emailContent.subject, emailContent.html, emailContent.text)
        )

        const emailResults = await Promise.allSettled(emailPromises)

        // Log results
        const successful = emailResults.filter(result => result.status === 'fulfilled').length
        const failed = emailResults.filter(result => result.status === 'rejected').length

        console.log(`Email notifications sent: ${successful} successful, ${failed} failed`)

        // Store notification in database for tracking
        await storeNotification(notificationData, recipients, successful, failed)

        return new Response(
            JSON.stringify({
                success: true,
                message: `Notifications sent to ${successful} recipients`,
                totalRecipients: recipients.length,
                successful,
                failed
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('Error sending notifications:', error)

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

function generateEmailContent(data: NotificationData & { projectName: string; imageName: string }): EmailTemplate {
    const baseUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
    const projectUrl = `${baseUrl}/project/${data.projectId}`

    let actionText = ''
    let markInfo = ''

    switch (data.type) {
        case 'mark_added':
            actionText = 'added a new mark'
            markInfo = `${data.markType} mark in ${data.markColor} color at coordinates (${data.coordinates?.x}, ${data.coordinates?.y})`
            break
        case 'mark_updated':
            actionText = 'updated a mark'
            markInfo = `${data.markType} mark in ${data.markColor} color`
            break
        case 'mark_deleted':
            actionText = 'deleted a mark'
            markInfo = `${data.markType} mark in ${data.markColor} color`
            break
        case 'comment_added':
            actionText = 'added a new comment'
            markInfo = `Comment: "${data.content}"`
            break
        case 'comment_updated':
            actionText = 'updated a comment'
            markInfo = `Comment: "${data.content}"`
            break
        case 'comment_deleted':
            actionText = 'deleted a comment'
            markInfo = 'Comment was removed'
            break
    }

    const subject = `[${data.projectName}] ${data.authorName} ${actionText} on ${data.imageName}`

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16ad7c; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #16ad7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .mark-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #16ad7c; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>StillColab Notification</h1>
        </div>
        <div class="content">
          <h2>${data.authorName} ${actionText}</h2>
          <p><strong>Project:</strong> ${data.projectName}</p>
          <p><strong>Image:</strong> ${data.imageName}</p>
          
          <div class="mark-info">
            <strong>Details:</strong><br>
            ${markInfo}
          </div>
          
          <a href="${projectUrl}" class="button">View Project</a>
          
          <p>You're receiving this notification because you have access to this project.</p>
        </div>
        <div class="footer">
          <p>StillColab - Collaborative Image Review Platform</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `

    const text = `
StillColab Notification

${data.authorName} ${actionText}

Project: ${data.projectName}
Image: ${data.imageName}

Details: ${markInfo}

View Project: ${projectUrl}

You're receiving this notification because you have access to this project.

---
StillColab - Collaborative Image Review Platform
This is an automated notification. Please do not reply to this email.
  `

    return { subject, html, text }
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    try {
        // Use Resend for email delivery (you can replace with any email service)
        const resendApiKey = Deno.env.get('RESEND_API_KEY')

        if (resendApiKey) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'notifications@stillcolab.com',
                    to: [to],
                    subject,
                    html,
                    text,
                }),
            })

            if (!response.ok) {
                throw new Error(`Resend API error: ${response.statusText}`)
            }

            return true
        } else {
            // Fallback: Log email content for development
            console.log('=== EMAIL NOTIFICATION (Development Mode) ===')
            console.log('To:', to)
            console.log('Subject:', subject)
            console.log('Content:', text)
            console.log('============================================')
            return true
        }
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error)
        return false
    }
}

async function storeNotification(
    data: NotificationData,
    recipients: Array<{ id: string; email: string; name: string }>,
    successful: number,
    failed: number
): Promise<void> {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        await supabase
            .from('notification_logs')
            .insert({
                type: data.type,
                project_id: data.projectId,
                image_id: data.imageId,
                author_id: data.authorId,
                author_name: data.authorName,
                content: data.content || data.markType,
                recipients_count: recipients.length,
                successful_count: successful,
                failed_count: failed,
                created_at: new Date().toISOString()
            })
    } catch (error) {
        console.error('Failed to store notification log:', error)
    }
}
