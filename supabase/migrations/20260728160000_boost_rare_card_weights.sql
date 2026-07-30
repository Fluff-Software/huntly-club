-- Make rare / very rare cards more reachable for children (still rarer than common).
-- Previous: rare=2, very_rare=1 vs common=10 → too scarce after many claims.
UPDATE public.explore_cards
SET base_weight = 6
WHERE rarity = 'rare'
  AND is_active = true;

UPDATE public.explore_cards
SET base_weight = 3
WHERE rarity = 'very_rare'
  AND is_active = true;
