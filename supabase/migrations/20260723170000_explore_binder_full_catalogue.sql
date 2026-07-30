-- Binder needs every active card with ownership (count 0 = missing).
CREATE OR REPLACE FUNCTION public.get_explore_profile_card_collection(
  p_profile_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_items jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.user_id INTO v_owner
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'Not authorized for this profile';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'card', jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'name', c.name,
        'description', c.description,
        'category', c.category,
        'rarity', c.rarity,
        'image_url', CASE
          WHEN c.image_path LIKE 'http%' THEN c.image_path
          WHEN c.image_path = '' THEN NULL
          ELSE c.image_path
        END,
        'sort_order', c.sort_order,
        'habitat_weights', c.habitat_weights
      ),
      'count', coalesce(epc.count, 0),
      'collected', (epc.card_id IS NOT NULL),
      'first_collected_at', epc.first_collected_at,
      'last_collected_at', epc.last_collected_at
    )
    ORDER BY c.sort_order ASC, c.name ASC
  ), '[]'::jsonb)
  INTO v_items
  FROM public.explore_cards c
  LEFT JOIN public.explore_profile_cards epc
    ON epc.card_id = c.id
   AND epc.profile_id = p_profile_id
  WHERE c.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'items', v_items
  );
END;
$$;
