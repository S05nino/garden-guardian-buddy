-- Crea tabella per le notifiche
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere solo le proprie notifiche
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: gli utenti possono aggiornare solo le proprie notifiche (per marcarle come lette)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Crea indice per performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Trigger per creare notifica quando qualcuno ti aggiunge agli amici
CREATE OR REPLACE FUNCTION public.notify_new_friendship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  adder_name TEXT;
BEGIN
  -- Recupera il nome di chi ha aggiunto l'amico
  SELECT COALESCE(full_name, 'Un utente') INTO adder_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Crea notifica per l'amico aggiunto
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.friend_id,
    'new_friend',
    'Nuovo amico!',
    adder_name || ' ti ha aggiunto agli amici',
    jsonb_build_object(
      'friend_user_id', NEW.user_id,
      'friend_name', adder_name
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friendship_created
AFTER INSERT ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_friendship();

-- Trigger per creare notifica quando qualcuno ti sfida
CREATE OR REPLACE FUNCTION public.notify_battle_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  challenger_name TEXT;
  defender_name TEXT;
  result_text TEXT;
BEGIN
  -- Recupera i nomi dei giocatori
  SELECT COALESCE(full_name, 'Un utente') INTO challenger_name
  FROM public.profiles
  WHERE user_id = NEW.challenger_id;
  
  SELECT COALESCE(full_name, 'Un utente') INTO defender_name
  FROM public.profiles
  WHERE user_id = NEW.defender_id;

  -- Determina il risultato per il difensore
  IF NEW.winner_id = NEW.defender_id THEN
    result_text := 'Hai vinto! 🥳🤩';
  ELSE
    result_text := 'Hai perso! ☹️😭';
  END IF;

  -- Crea notifica per il difensore (chi ha ricevuto la sfida)
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.defender_id,
    'battle_challenge',
    'Sfida ricevuta!',
    challenger_name || ' ti ha sfidato in battaglia. ' || result_text,
    jsonb_build_object(
      'challenger_user_id', NEW.challenger_id,
      'challenger_name', challenger_name,
      'battle_id', NEW.id,
      'winner_id', NEW.winner_id
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_battle_created
AFTER INSERT ON public.arena_battles
FOR EACH ROW
EXECUTE FUNCTION public.notify_battle_challenge();

-- Abilita realtime per le notifiche
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;