import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// These are required to be present in the Vercel environment variables.
const ML_MODEL_ENDPOINT = Deno.env.get("ML_MODEL_ENDPOINT");
const ML_API_KEY = Deno.env.get("ML_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { frame, model } = await req.json();

    if (!frame || !model) {
      return new Response(JSON.stringify({ error: "Missing frame or model in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ML_MODEL_ENDPOINT || !ML_API_KEY) {
        console.error("ML model endpoint or API key is not configured in environment variables.");
        return new Response(JSON.stringify({ error: "AI model is not configured." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Forward the request to the real-world ML model API
    const mlResponse = await fetch(ML_MODEL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ML_API_KEY}`,
        },
        body: JSON.stringify({
            // The AI/ML service might expect the frame data in a specific format
            // For example, as a base64 string without the data URL prefix.
            image_data: frame.replace(/^data:image\/jpeg;base64,/, ""),
            model_id: model,
        }),
    });

    if (!mlResponse.ok) {
      const errorBody = await mlResponse.text();
      console.error(`ML model API error (${mlResponse.status}):`, errorBody);
      return new Response(JSON.stringify({ error: `Failed to get prediction: ${mlResponse.statusText}` }), {
        status: 502, // Bad Gateway
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const detectionResult = await mlResponse.json();

    // The AI/ML service will return a list of predictions.
    // We format it into the structure our frontend expects.
    const formattedResult = {
        bounding_boxes: detectionResult.predictions || [],
        vehicle_count: (detectionResult.predictions || []).length,
    };

    return new Response(JSON.stringify(formattedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
