-- Crea tabella arena_battles
CREATE TABLE IF NOT EXISTS public.arena_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  defender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_plant_id text NOT NULL,
  defender_plant_id text NOT NULL,
  winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  battle_log jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere le proprie battaglie
CREATE POLICY "Users can view their own battles"
ON public.arena_battles
FOR SELECT
TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = defender_id);

-- Policy: gli utenti possono creare battaglie come challenger
CREATE POLICY "Users can create battles as challenger"
ON public.arena_battles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = challenger_id);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION public.update_arena_battles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_arena_battles_updated_at
BEFORE UPDATE ON public.arena_battles
FOR EACH ROW
EXECUTE FUNCTION public.update_arena_battles_updated_at();

-- Funzione RPC per classifica globale
CREATE OR REPLACE FUNCTION public.get_arena_leaderboard()
RETURNS TABLE (
  user_id uuid,
  total_battles bigint,
  wins bigint,
  losses bigint,
  win_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id as user_id,
    COUNT(ab.id) as total_battles,
    COUNT(ab.id) FILTER (WHERE ab.winner_id = u.id) as wins,
    COUNT(ab.id) FILTER (WHERE ab.winner_id != u.id) as losses,
    CASE 
      WHEN COUNT(ab.id) > 0 THEN 
        ROUND((COUNT(ab.id) FILTER (WHERE ab.winner_id = u.id)::numeric / COUNT(ab.id)::numeric) * 100, 2)
      ELSE 0
    END as win_rate
  FROM auth.users u
  LEFT JOIN public.arena_battles ab 
    ON (u.id = ab.challenger_id OR u.id = ab.defender_id)
  GROUP BY u.id
  HAVING COUNT(ab.id) > 0
  ORDER BY wins DESC, win_rate DESC
  LIMIT 50;
$$;