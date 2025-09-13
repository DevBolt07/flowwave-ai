import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetectionResult {
  bounding_boxes: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
    lane: number;
  }>;
  lane_counts: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  total_vehicles: number;
  confidence: number;
  processing_time_ms: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const formData = await req.formData()
    const frame = formData.get('frame') as File
    const intersectionId = formData.get('intersection_id') as string
    const model = formData.get('model') as string || 'yolov8'

    if (!frame || !intersectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing frame or intersection_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Mock AI detection for demo purposes
    // In production, this would integrate with actual AI models
    const mockResult: DetectionResult = {
      bounding_boxes: [
        { x: 100, y: 100, width: 80, height: 120, confidence: 0.92, class: 'car', lane: 1 },
        { x: 200, y: 150, width: 90, height: 110, confidence: 0.88, class: 'truck', lane: 1 },
        { x: 50, y: 200, width: 70, height: 100, confidence: 0.85, class: 'bike', lane: 2 },
        { x: 300, y: 80, width: 60, height: 90, confidence: 0.94, class: 'car', lane: 3 },
        { x: 450, y: 180, width: 100, height: 140, confidence: 0.89, class: 'bus', lane: 4 },
      ],
      lane_counts: {
        north: Math.floor(Math.random() * 20) + 5,
        south: Math.floor(Math.random() * 15) + 3,
        east: Math.floor(Math.random() * 25) + 8,
        west: Math.floor(Math.random() * 18) + 4,
      },
      total_vehicles: 0,
      confidence: 0.91,
      processing_time_ms: Math.floor(Math.random() * 100) + 30,
    }

    mockResult.total_vehicles = mockResult.lane_counts.north + 
                               mockResult.lane_counts.south + 
                               mockResult.lane_counts.east + 
                               mockResult.lane_counts.west

    // Check for emergency vehicles (random simulation)  
    const hasEmergency = Math.random() < 0.1 // 10% chance
    if (hasEmergency) {
      mockResult.bounding_boxes.push({
        x: 250, y: 120, width: 120, height: 150,
        confidence: 0.96, class: 'ambulance', lane: 2
      })
      
      // Update lane with emergency vehicle
      const { error: laneError } = await supabase
        .from('lanes')
        .update({ has_emergency: true })
        .eq('intersection_id', intersectionId)
        .eq('lane_no', 2)

      if (laneError) {
        console.error('Error updating lane emergency status:', laneError)
      }
    }

    // Update lane counts in database
    const lanes = ['north', 'south', 'east', 'west']
    for (let i = 0; i < lanes.length; i++) {
      const direction = lanes[i]
      const count = mockResult.lane_counts[direction as keyof typeof mockResult.lane_counts]
      
      const { error } = await supabase
        .from('lanes')
        .update({ 
          current_count: count,
          vehicle_count: count 
        })
        .eq('intersection_id', intersectionId)
        .eq('lane_no', i + 1)

      if (error) {
        console.error(`Error updating lane ${i + 1}:`, error)
      }
    }

    // Log detection event
    const { error: logError } = await supabase
      .from('logs')
      .insert([{
        intersection_id: intersectionId,
        event_type: 'ai_detection',
        message: `AI detected ${mockResult.total_vehicles} vehicles using ${model}`,
        metadata: {
          model,
          confidence: mockResult.confidence,
          processing_time_ms: mockResult.processing_time_ms,
          lane_counts: mockResult.lane_counts
        }
      }])

    if (logError) {
      console.error('Error logging detection:', logError)
    }

    return new Response(
      JSON.stringify(mockResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Detection error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})