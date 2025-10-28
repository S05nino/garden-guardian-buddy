-- Function to update plant stats (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_plant_stat(
  plant_uuid UUID,
  stat_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF stat_name = 'victories' THEN
    UPDATE public.plants
    SET victories = COALESCE(victories, 0) + 1
    WHERE id = plant_uuid;
  ELSIF stat_name = 'defeats' THEN
    UPDATE public.plants
    SET defeats = COALESCE(defeats, 0) + 1
    WHERE id = plant_uuid;
  END IF;
END;
$$;