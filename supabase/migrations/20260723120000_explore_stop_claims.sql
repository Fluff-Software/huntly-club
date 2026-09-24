-- Explore stop claims (Step 7).
-- Stores user/profile claim history only — NOT the generated stop catalogue.
-- Writes go through SECURITY DEFINER RPC (service_role from the Explore backend after re-verify).

CREATE TABLE IF NOT EXISTS public.explore_stop_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  profile_id bigint NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  stop_id text NOT NULL,
  generation_version integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  awarded_card_id uuid NULL,
  reported_latitude double precision NOT NULL,
  reported_longitude double precision NOT NULL,
  reported_accuracy_metres double precision NOT NULL,
  verified_distance_metres double precision NOT NULL,
  source_type text NOT NULL,
  environment_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT explore_stop_claims_accuracy_positive CHECK (reported_accuracy_metres > 0),
  CONSTRAINT explore_stop_claims_distance_nonneg CHECK (verified_distance_metres >= 0),
  CONSTRAINT explore_stop_claims_generation_positive CHECK (generation_version > 0)
);

COMMENT ON TABLE public.explore_stop_claims IS
  'Explore claim history per player profile. Does not store the worldwide generated stop catalogue.';

COMMENT ON COLUMN public.explore_stop_claims.awarded_card_id IS
  'Reserved for future card rewards; always NULL in Step 7.';

-- One claim per profile per logical stop (generation_version is recorded but not part of uniqueness).
CREATE UNIQUE INDEX IF NOT EXISTS explore_stop_claims_profile_stop_uidx
  ON public.explore_stop_claims (profile_id, stop_id);

CREATE UNIQUE INDEX IF NOT EXISTS explore_stop_claims_idempotency_uidx
  ON public.explore_stop_claims (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS explore_stop_claims_user_id_idx
  ON public.explore_stop_claims (user_id);

CREATE INDEX IF NOT EXISTS explore_stop_claims_profile_id_claimed_at_idx
  ON public.explore_stop_claims (profile_id, claimed_at DESC);

CREATE INDEX IF NOT EXISTS explore_stop_claims_stop_id_idx
  ON public.explore_stop_claims (stop_id);

ALTER TABLE public.explore_stop_claims ENABLE ROW LEVEL SECURITY;

-- Owners can read their own profile claims. No direct client inserts/updates/deletes.
CREATE POLICY "Users can view own explore stop claims"
  ON public.explore_stop_claims
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.explore_stop_claims TO authenticated;
GRANT ALL ON public.explore_stop_claims TO service_role;

-- ---------------------------------------------------------------------------
-- claim_explore_stop: atomic insert after backend proximity re-verification.
-- Callable by service_role only (Explore Node server). Mobile cannot insert.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_explore_stop(
  p_user_id uuid,
  p_profile_id bigint,
  p_stop_id text,
  p_generation_version integer,
  p_reported_latitude double precision,
  p_reported_longitude double precision,
  p_reported_accuracy_metres double precision,
  p_verified_distance_metres double precision,
  p_source_type text,
  p_environment_profile jsonb,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_existing public.explore_stop_claims%ROWTYPE;
  v_claim public.explore_stop_claims%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_stop_id IS NULL OR btrim(p_stop_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_stop_id');
  END IF;

  IF p_generation_version IS NULL OR p_generation_version <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'unsupported_generation_version');
  END IF;

  IF p_reported_accuracy_metres IS NULL OR p_reported_accuracy_metres <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_accuracy');
  END IF;

  IF p_verified_distance_metres IS NULL OR p_verified_distance_metres < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'claim_failed');
  END IF;

  SELECT p.user_id INTO v_owner
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_profile');
  END IF;

  IF v_owner <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_profile');
  END IF;

  -- Idempotent retry: same key returns the same claim.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.explore_stop_claims c
    WHERE c.idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'claim', jsonb_build_object(
          'claim_id', v_existing.id,
          'stop_id', v_existing.stop_id,
          'generation_version', v_existing.generation_version,
          'claimed_at', v_existing.claimed_at,
          'verified_distance_metres', v_existing.verified_distance_metres,
          'profile_id', v_existing.profile_id,
          'awarded_card_id', v_existing.awarded_card_id
        )
      );
    END IF;
  END IF;

  SELECT * INTO v_existing
  FROM public.explore_stop_claims c
  WHERE c.profile_id = p_profile_id
    AND c.stop_id = p_stop_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_claimed',
      'claim', jsonb_build_object(
        'claim_id', v_existing.id,
        'stop_id', v_existing.stop_id,
        'generation_version', v_existing.generation_version,
        'claimed_at', v_existing.claimed_at,
        'verified_distance_metres', v_existing.verified_distance_metres,
        'profile_id', v_existing.profile_id,
        'awarded_card_id', v_existing.awarded_card_id
      )
    );
  END IF;

  BEGIN
    INSERT INTO public.explore_stop_claims (
      user_id,
      profile_id,
      stop_id,
      generation_version,
      reported_latitude,
      reported_longitude,
      reported_accuracy_metres,
      verified_distance_metres,
      source_type,
      environment_profile,
      idempotency_key,
      awarded_card_id
    )
    VALUES (
      p_user_id,
      p_profile_id,
      btrim(p_stop_id),
      p_generation_version,
      p_reported_latitude,
      p_reported_longitude,
      p_reported_accuracy_metres,
      p_verified_distance_metres,
      coalesce(nullif(btrim(p_source_type), ''), 'unknown'),
      coalesce(p_environment_profile, '{}'::jsonb),
      p_idempotency_key,
      NULL
    )
    RETURNING * INTO v_claim;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_existing
      FROM public.explore_stop_claims c
      WHERE c.profile_id = p_profile_id
        AND c.stop_id = p_stop_id;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'already_claimed',
          'claim', jsonb_build_object(
            'claim_id', v_existing.id,
            'stop_id', v_existing.stop_id,
            'generation_version', v_existing.generation_version,
            'claimed_at', v_existing.claimed_at,
            'verified_distance_metres', v_existing.verified_distance_metres,
            'profile_id', v_existing.profile_id,
            'awarded_card_id', v_existing.awarded_card_id
          )
        );
      END IF;

      IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing
        FROM public.explore_stop_claims c
        WHERE c.idempotency_key = p_idempotency_key;
        IF FOUND THEN
          RETURN jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'claim', jsonb_build_object(
              'claim_id', v_existing.id,
              'stop_id', v_existing.stop_id,
              'generation_version', v_existing.generation_version,
              'claimed_at', v_existing.claimed_at,
              'verified_distance_metres', v_existing.verified_distance_metres,
              'profile_id', v_existing.profile_id,
              'awarded_card_id', v_existing.awarded_card_id
            )
          );
        END IF;
      END IF;

      RETURN jsonb_build_object('success', false, 'error', 'claim_failed');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'claim', jsonb_build_object(
      'claim_id', v_claim.id,
      'stop_id', v_claim.stop_id,
      'generation_version', v_claim.generation_version,
      'claimed_at', v_claim.claimed_at,
      'verified_distance_metres', v_claim.verified_distance_metres,
      'profile_id', v_claim.profile_id,
      'awarded_card_id', v_claim.awarded_card_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_explore_stop(
  uuid, bigint, text, integer, double precision, double precision, double precision,
  double precision, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_explore_stop(
  uuid, bigint, text, integer, double precision, double precision, double precision,
  double precision, text, jsonb, uuid
) TO service_role;

-- List claimed stop IDs for a profile owned by the caller.
CREATE OR REPLACE FUNCTION public.get_explore_claimed_stop_ids(
  p_profile_id bigint
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_ids text[];
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

  SELECT coalesce(array_agg(c.stop_id ORDER BY c.claimed_at DESC), '{}')
  INTO v_ids
  FROM public.explore_stop_claims c
  WHERE c.profile_id = p_profile_id;

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.get_explore_claimed_stop_ids(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_explore_claimed_stop_ids(bigint) TO authenticated, service_role;
