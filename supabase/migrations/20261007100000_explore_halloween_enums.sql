-- Halloween event cards get their own rarity tier and category.
--
-- Split from the event migration because a new enum value can't be used in
-- the same transaction that adds it.

ALTER TYPE public.explore_card_rarity ADD VALUE IF NOT EXISTS 'halloween';
ALTER TYPE public.explore_card_category ADD VALUE IF NOT EXISTS 'halloween';
