-- Existing players pre-date the guided intro; mark them as having completed it.
UPDATE public.user_data
SET start_mission_step = 6
WHERE start_mission_step = 0;
