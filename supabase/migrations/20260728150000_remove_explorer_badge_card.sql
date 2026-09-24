-- Remove the Explorer Badge filler card from the active catalogue and drop pool.
-- Soft-delete so existing claim history that referenced it stays valid.
UPDATE public.explore_cards
SET is_active = false
WHERE slug = 'explorer-badge';
