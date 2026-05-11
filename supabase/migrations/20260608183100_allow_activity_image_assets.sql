-- Allow mission/activity-level image assets
-- (Needed for per-mission cover images in the season builder UI.)

ALTER TABLE image_assets
  DROP CONSTRAINT IF EXISTS image_assets_entity_type_check;

ALTER TABLE image_assets
  ADD CONSTRAINT image_assets_entity_type_check
  CHECK (
    entity_type IN (
      'season_hero',
      'chapter',
      'story_slide',
      'mission_step',
      'badge',
      'captain_pose',
      'activity'
    )
  );

