-- Add 'captain' to the campfire_component_type enum so captain components
-- can be persisted independently of audio components.
ALTER TYPE campfire_component_type ADD VALUE IF NOT EXISTS 'captain';
