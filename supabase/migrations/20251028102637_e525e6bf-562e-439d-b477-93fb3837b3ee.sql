-- ✅ Crea tabella profiles con user_id come PK
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ✅ Abilita RLS su profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ✅ Policy: tutti possono vedere tutti i profili (per cercare amici)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ✅ Policy: gli utenti possono aggiornare solo il proprio profilo
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ✅ Policy: gli utenti possono inserire solo il proprio profilo
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ✅ Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- ✅ Funzione per creare automaticamente il profilo quando un utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ✅ Trigger per creare profilo quando un nuovo utente si registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ✅ Crea tabella friendships per gestire le amicizie
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- ✅ Abilita RLS su friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- ✅ Policy: gli utenti possono vedere le proprie amicizie
CREATE POLICY "Users can view their own friendships"
  ON public.friendships
  FOR SELECT
  USING (auth.uid() = user_id);

-- ✅ Policy: gli utenti possono creare le proprie amicizie
CREATE POLICY "Users can create their own friendships"
  ON public.friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ✅ Policy: gli utenti possono eliminare le proprie amicizie
CREATE POLICY "Users can delete their own friendships"
  ON public.friendships
  FOR DELETE
  USING (auth.uid() = user_id);

-- ✅ Indice per velocizzare le query sulle amicizie
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);