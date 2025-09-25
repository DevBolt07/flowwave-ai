
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase URL or Service Key in .env.local');
  process.exit(1);
}

// Create a Supabase client with the service_role key for admin privileges
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const intersectionsData = []; // No intersections

async function seedDatabase() {
  console.log('Starting to seed database with admin privileges...');

  // Clear existing data using the admin client
  console.log('Clearing existing data...');
  const { error: deleteLanesError } = await supabaseAdmin.from('lanes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteLanesError) {
    console.error('Error clearing lanes:', deleteLanesError.message);
    return;
  }
  const { error: deleteIntersectionsError } = await supabaseAdmin.from('intersections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteIntersectionsError) {
    console.error('Error clearing intersections:', deleteIntersectionsError.message);
    return;
  }

  console.log('Existing data cleared.');

  for (const intersection of intersectionsData) {
    const { data: intersectionData, error: intersectionError } = await supabaseAdmin
      .from('intersections')
      .insert({ name: intersection.name })
      .select()
      .single();

    if (intersectionError) {
      console.error(`Error inserting intersection ${intersection.name}:`, intersectionError.message);
      continue;
    }

    console.log(`Inserted intersection: ${intersectionData.name} (ID: ${intersectionData.id})`);

    const lanesToInsert = intersection.lanes.map((lane) => ({
      ...lane,
      intersection_id: intersectionData.id,
      signal_state: 'red',
      vehicle_count: 0,
      gst_time: 60,
    }));

    const { error: lanesError } = await supabaseAdmin.from('lanes').insert(lanesToInsert);

    if (lanesError) {
      console.error(`Error inserting lanes for ${intersection.name}:`, lanesError.message);
    } else {
      console.log(`- Inserted ${intersection.lanes.length} lanes for ${intersection.name}`);
    }
  }

  console.log('\nDatabase seeding completed successfully!');
}

seedDatabase().catch((error) => {
  console.error('An unexpected error occurred during seeding:', error);
  process.exit(1);
});
