import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GST {
  lane_no: number;
  direction: string;
  vehicle_count: number;
  gst_time: number;
  density_status: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { intersection_id, lane_counts, config } = await req.json()

    if (!intersection_id || !lane_counts || !config) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const directions = ['north', 'south', 'east', 'west']
    const results: GST[] = []

    for (let i = 0; i < directions.length; i++) {
      const direction = directions[i]
      const count = lane_counts[direction] || 0
      
      // Calculate GST based on vehicle count
      let gstTime = config.base_time
      if (count > 0) {
        gstTime = Math.min(
          config.max_gst,
          Math.max(
            config.min_gst,
            config.base_time + (count * config.vehicle_factor)
          )
        )
      }

      // Determine density status
      let densityStatus: 'low' | 'medium' | 'high' = 'low'
      if (count > 15) densityStatus = 'high'
      else if (count > 8) densityStatus = 'medium'

      results.push({
        lane_no: i + 1,
        direction,
        vehicle_count: count,
        gst_time: Math.round(gstTime),
        density_status: densityStatus
      })

      // Update lane in database
      const { error } = await supabase
        .from('lanes')
        .update({ 
          gst_time: Math.round(gstTime),
          vehicle_count: count
        })
        .eq('intersection_id', intersection_id)
        .eq('lane_no', i + 1)

      if (error) {
        console.error(`Error updating lane ${i + 1} GST:`, error)
      }
    }

    // Log GST calculation
    const { error: logError } = await supabase
      .from('logs')
      .insert([{
        intersection_id,
        event_type: 'gst_calculation',
        message: `GST calculated for all lanes`,
        metadata: {
          results,
          config,
          total_vehicles: Object.values(lane_counts).reduce((sum: number, count: any) => sum + count, 0)
        }
      }])

    if (logError) {
      console.error('Error logging GST calculation:', logError)
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('GST calculation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})