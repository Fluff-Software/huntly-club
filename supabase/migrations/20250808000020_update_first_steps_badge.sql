-- Update the First Steps badge to use the local image
UPDATE "public"."badges" 
SET 
  local_image_path = '@/assets/images/first-steps-badge.png',
  uses_custom_image = true
WHERE id = 1 AND name = 'First Steps';
