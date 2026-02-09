const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get MIME type from file extension
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  return mimeTypes[ext] || "image/png";
}

async function uploadBadgeImage(badgeId, imagePath, fileName) {
  try {
    console.log(`Uploading ${fileName} for badge ${badgeId}...`);

    // Read the file
    const fileBuffer = fs.readFileSync(imagePath);
    const mimeType = getMimeType(fileName);

    // Upload to storage
    const { data, error } = await supabase.storage
      .from("badges")
      .upload(`${badgeId}/${fileName}`, fileBuffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: mimeType,
      });

    if (error) {
      console.error(`Error uploading ${fileName}:`, error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("badges")
      .getPublicUrl(`${badgeId}/${fileName}`);

    console.log(`✅ Successfully uploaded ${fileName}`);
    console.log(`   URL: ${urlData.publicUrl}`);

    // Update the badge record
    const { error: updateError } = await supabase
      .from("badges")
      .update({
        image_url: urlData.publicUrl,
        uses_custom_image: true,
      })
      .eq("id", badgeId);

    if (updateError) {
      console.error(`Error updating badge ${badgeId}:`, updateError);
    } else {
      console.log(`✅ Updated badge ${badgeId} with new image URL`);
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error processing ${fileName}:`, error);
    return null;
  }
}

async function main() {
  const imagesDir = path.join(__dirname, "../assets/images/badges");

  // Check if badges directory exists
  if (!fs.existsSync(imagesDir)) {
    console.log("Creating badges directory...");
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log("✅ Created badges directory");
    console.log("📁 Please add your badge images to:", imagesDir);
    return;
  }

  // Get all image files
  const files = fs
    .readdirSync(imagesDir)
    .filter((file) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file));

  if (files.length === 0) {
    console.log("📁 No badge images found in:", imagesDir);
    console.log("   Please add your badge images to this directory");
    return;
  }

  console.log(`Found ${files.length} badge image(s):`);
  files.forEach((file) => console.log(`   - ${file}`));
  console.log("");

  // Upload each image
  for (const file of files) {
    // Extract badge ID from filename (e.g., "1-first-steps.png" -> badge ID 1)
    const match = file.match(/^(\d+)-/);
    if (!match) {
      console.log(
        `⚠️  Skipping ${file} - filename should start with badge ID (e.g., "1-first-steps.png")`
      );
      continue;
    }

    const badgeId = parseInt(match[1]);
    const imagePath = path.join(imagesDir, file);

    await uploadBadgeImage(badgeId, imagePath, file);
    console.log("");
  }

  console.log("🎉 Badge image upload complete!");
}

main().catch(console.error);
