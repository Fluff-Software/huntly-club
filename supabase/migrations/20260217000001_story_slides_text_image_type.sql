-- Update column comments to document the new text-image slide type
COMMENT ON COLUMN "public"."seasons"."story_slides" IS 'Ordered slides: array of { "type": "text", "value": string } | { "type": "image", "value": string } | { "type": "text-image", "text": string, "image": string }. Image values are storage URLs.';
COMMENT ON COLUMN "public"."chapters"."body_slides" IS 'Ordered slides: array of { "type": "text", "value": string } | { "type": "image", "value": string } | { "type": "text-image", "text": string, "image": string }. Image values are storage URLs.';
