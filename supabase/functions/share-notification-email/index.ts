import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.0";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Define types
interface RequestBody {
  project_id: string;
  shared_by: string;
  shared_with_email: string;
}

// Constants
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "");
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000";

// Improved error responses with consistent format
const errorResponse = (message: string, status = 400) => {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
};

// Success response helper
const successResponse = (data: any) => {
  return new Response(
    JSON.stringify({
      success: true,
      ...data,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
};

/**
 * Sends an email using Resend
 */
async function sendEmail(to: string, subject: string, html: string) {
  try {
    console.log(`Attempting to send email to: ${to}`);
    const { data, error } = await resend.emails.send({
      from: "Still Collab <notifications@stillcollab.com>",
      to,
      subject,
      html,
    });
    
    if (error) {
      console.error("Resend API Error:", {
        error: error.message,
        code: error.name,
        details: error
      });
      throw new Error(`Email sending failed: ${error.message}`);
    }
    
    console.log("Email sent successfully:", {
      to,
      subject,
      messageId: data?.id
    });
    return true;
  } catch (error) {
    console.error("Email sending failed with error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      to,
      subject
    });
    throw error;
  }
}

serve(async (req) => {
  const startTime = performance.now();
  console.log("Share notification endpoint called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    // Parse request body
    let body: RequestBody;
    try {
      const bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      
      if (!bodyText) {
        return errorResponse("Request body is empty", 400);
      }

      body = JSON.parse(bodyText);
      console.log("Request body parsed successfully:", {
        project_id: body.project_id,
        shared_by: body.shared_by,
        shared_with_email: body.shared_with_email
      });
    } catch (error) {
      console.error("Failed to parse request body:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
      return errorResponse(
        `Invalid JSON body: ${error instanceof Error ? error.message : "Unknown error"}`,
        400
      );
    }

    // Validate required fields
    const { project_id, shared_by, shared_with_email } = body;
    if (!project_id || !shared_by || !shared_with_email) {
      return errorResponse("Missing required fields: project_id, shared_by, and shared_with_email are required");
    }

    console.log("Fetching project and sharer details");
    // Fetch project and sharer concurrently
    const [{ data: project, error: projectError }, { data: sharer, error: sharerError }] =
      await Promise.all([
        supabase.from("projects").select("name").eq("id", project_id).single(),
        supabase.from("profiles").select("first_name, last_name").eq("id", shared_by).single(),
      ]);

    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      return errorResponse(projectError?.message || "Project not found", 404);
    }
    if (sharerError || !sharer) {
      console.error("Sharer fetch error:", sharerError);
      return errorResponse(sharerError?.message || "Sharer not found", 404);
    }

    console.log("Project and sharer details fetched successfully:", {
      projectName: project.name,
      sharerName: sharer.full_name
    });

    // Prepare email content
    const projectName = project.name || "a project";
    const sharerName = sharer.full_name || "Someone";
    const emailSubject = `You've been invited to collaborate on ${projectName}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Collaboration Invitation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f9; color: #333333;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 20px 0; text-align: center; background-color: #4f46e5;">
                <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 600;">Still Collab</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px 20px; background-color: white; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h2 style="color: #333; font-size: 24px; margin: 0 0 15px 0;">Project Collaboration Invitation</h2>
                  <div style="width: 60px; height: 4px; background-color: #4f46e5; margin: 0 auto;"></div>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hello,</p>
                
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  <strong style="color: #4f46e5;">${sharerName}</strong> has invited you to collaborate on 
                  <strong style="color: #333;">"${projectName}"</strong>.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${APP_URL}/share-requests" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">View Share Requests</a>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; margin-top: 30px; color: #666;">
                  Best regards,<br>
                  <strong>Still Collab Team</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px; text-align: center; color: #666; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Still Collab. All rights reserved.</p>
                <p style="margin: 0;">If you didn't request this invitation, please ignore this email.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    console.log("Prepared email content:", {
      to: shared_with_email,
      subject: emailSubject
    });

    // Send email
    try {
      await sendEmail(shared_with_email, emailSubject, emailHtml);
    } catch (emailError) {
      console.error("Failed to send share notification email:", {
        error: emailError instanceof Error ? emailError.message : "Unknown error",
        projectId: project_id,
        sharedBy: shared_by,
        sharedWithEmail: shared_with_email
      });
      return errorResponse("Failed to send notification email", 500);
    }

    const endTime = performance.now();
    console.log(`Share notification completed in ${endTime - startTime}ms`);

    return successResponse({
      message: "Invitation sent successfully",
      elapsed_ms: Math.round(endTime - startTime)
    });
  } catch (error) {
    const endTime = performance.now();
    console.error("Unhandled error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      elapsed_ms: Math.round(endTime - startTime)
    });
    return errorResponse(
      `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      500
    );
  }
});