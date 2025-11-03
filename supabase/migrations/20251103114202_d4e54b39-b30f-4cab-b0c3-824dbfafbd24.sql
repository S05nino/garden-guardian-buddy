-- Trigger per notifiche quando si condivide il giardino
CREATE OR REPLACE FUNCTION public.notify_garden_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sharer_name TEXT;
BEGIN
  -- Recupera il nome di chi condivide
  SELECT COALESCE(full_name, 'Un utente') INTO sharer_name
  FROM public.profiles
  WHERE user_id = NEW.owner_id;

  -- Crea notifica per chi riceve la condivisione
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.shared_with_id,
    'garden_shared',
    'Giardino condiviso!',
    sharer_name || ' ha condiviso il suo giardino con te',
    jsonb_build_object(
      'owner_id', NEW.owner_id,
      'owner_name', sharer_name,
      'share_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Collega il trigger alla tabella garden_shares
CREATE TRIGGER on_garden_share_created
  AFTER INSERT ON public.garden_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_garden_share();