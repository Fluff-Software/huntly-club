const { createClient } = require("@supabase/supabase-js");

// Local Supabase connection
const supabaseUrl = "http://127.0.0.1:54321";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyCategoriesMigration() {
  try {
    console.log("Applying categories migration...");

    // First, let's check if the categories column already exists
    const { data: activities, error: checkError } = await supabase
      .from("activities")
      .select("*")
      .limit(1);

    if (checkError) {
      console.error("Error checking activities table:", checkError);
      return;
    }

    console.log("Activities table structure:", Object.keys(activities[0]));

    // Check if categories column exists
    if (activities[0].hasOwnProperty("categories")) {
      console.log("Categories column already exists!");
    } else {
      console.log(
        "Categories column does not exist. You may need to run the migration manually."
      );
      console.log(
        "Please run the following SQL in your Supabase dashboard or local database:"
      );
      console.log(`
        ALTER TABLE "public"."activities" 
        ADD COLUMN "categories" jsonb DEFAULT '[]'::jsonb;
        
        CREATE INDEX activities_categories_idx ON "public"."activities" USING GIN (categories);
        
        UPDATE "public"."activities" 
        SET categories = '["nature", "wildlife", "observation"]'::jsonb
        WHERE name = 'bird_spotting';
        
        UPDATE "public"."activities" 
        SET categories = '["nature", "photography", "creativity"]'::jsonb
        WHERE name = 'nature_photography';
        
        UPDATE "public"."activities" 
        SET categories = '["nature", "outdoor", "exploration"]'::jsonb
        WHERE name = 'outdoor_exploration';
      `);
    }

    // Let's also check what activities we have
    const { data: allActivities, error: activitiesError } = await supabase
      .from("activities")
      .select("id, name, title, categories");

    if (activitiesError) {
      console.error("Error fetching activities:", activitiesError);
      return;
    }

    console.log("Current activities:", allActivities);
  } catch (error) {
    console.error("Error applying migration:", error);
  }
}

applyCategoriesMigration();
