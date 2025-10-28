-- Crea tabella plants per salvare le piante degli utenti
CREATE TABLE IF NOT EXISTS public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  watering_days integer NOT NULL DEFAULT 7,
  position text NOT NULL,
  icon text DEFAULT '🪴',
  last_watered timestamp with time zone DEFAULT now(),
  health integer DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  image_url text,
  category text NOT NULL,
  preferences jsonb,
  watering_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  total_waterings integer DEFAULT 0,
  reminders_enabled boolean DEFAULT false,
  victories integer DEFAULT 0,
  defeats integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere solo le proprie piante
CREATE POLICY "Users can view their own plants"
  ON public.plants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: gli utenti possono inserire solo le proprie piante
CREATE POLICY "Users can insert their own plants"
  ON public.plants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: gli utenti possono aggiornare solo le proprie piante
CREATE POLICY "Users can update their own plants"
  ON public.plants
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: gli utenti possono eliminare solo le proprie piante
CREATE POLICY "Users can delete their own plants"
  ON public.plants
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_plants_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_plants_timestamp
  BEFORE UPDATE ON public.plants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_plants_updated_at();