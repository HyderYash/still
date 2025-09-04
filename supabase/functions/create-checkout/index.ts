import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Parse request body
    let reqBody;
    try {
      reqBody = await req.json();
    } catch (e) {
      throw new Error("Invalid request body");
    }
    
    const { planId } = reqBody;
    if (!planId) throw new Error("Plan ID is required");
    logStep("Request data", { planId });

    // Create Supabase client for data operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get plan details from Supabase
    const { data: planData, error: planError } = await supabaseClient
      .from("plans")
      .select("id, name, price_cents, price_currency, stripe_price_id")
      .eq("id", planId)
      .single();

    if (planError) throw new Error(`Error fetching plan: ${planError.message}`);
    if (!planData) throw new Error("Plan not found");
    logStep("Plan data retrieved", { plan: planData });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Create a one-time payment session if no stripe_price_id
    // Otherwise create a subscription
    const isSubscription = !!planData.stripe_price_id;
    
    // Set success and cancel URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${origin}/settings?tab=subscription&success=true`;
    const cancelUrl = `${origin}/settings?tab=subscription&canceled=true`;

    let session;
    
    if (isSubscription && planData.stripe_price_id) {
      logStep("Creating subscription checkout session", { 
        priceId: planData.stripe_price_id 
      });
      
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: planData.stripe_price_id,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    } else {
      // One-time payment
      logStep("Creating one-time payment checkout session", { 
        amount: planData.price_cents,
        currency: planData.price_currency 
      });
      
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: planData.price_currency,
              product_data: { 
                name: `${planData.name} Plan` 
              },
              unit_amount: planData.price_cents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    }

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Use service role key to update subscribers table
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Record the checkout session in the database
    await supabaseAdmin.from("subscribers").upsert({
      user_id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
