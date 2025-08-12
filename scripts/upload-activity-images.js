const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Initialize Supabase client
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = "activity-images";

async function uploadImage(imagePath, fileName) {
  try {
    console.log(`Uploading ${fileName}...`);

    const fileBuffer = fs.readFileSync(imagePath);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading ${fileName}:`, error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    console.log(`✅ Successfully uploaded ${fileName}`);
    console.log(`   URL: ${urlData.publicUrl}`);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Failed to upload ${fileName}:`, error);
    return null;
  }
}

async function uploadAllActivityImages() {
  console.log("🚀 Starting activity image upload...\n");

  const imagesDir = path.join(__dirname, "../assets/images");
  const images = [
    { file: "bird-spotting.png", name: "bird-spotting.png" },
    { file: "nature-photography.png", name: "nature-photography.png" },
    { file: "outdoor-exploration.png", name: "outdoor-exploration.png" },
  ];

  const results = {};

  for (const image of images) {
    const imagePath = path.join(imagesDir, image.file);

    if (fs.existsSync(imagePath)) {
      const url = await uploadImage(imagePath, image.name);
      if (url) {
        results[image.name] = url;
      }
    } else {
      console.error(`❌ Image file not found: ${imagePath}`);
    }
  }

  console.log("\n📊 Upload Summary:");
  console.log("==================");
  Object.entries(results).forEach(([name, url]) => {
    console.log(`${name}: ${url}`);
  });

  return results;
}

// Run the upload
uploadAllActivityImages()
  .then(() => {
    console.log("\n✅ Upload complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Upload failed:", error);
    process.exit(1);
  });
