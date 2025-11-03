-- Crea tabella per la condivisione giardini tra amici
CREATE TABLE public.garden_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
);

-- Abilita RLS
ALTER TABLE public.garden_shares ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono condividere il proprio giardino
CREATE POLICY "Users can share their own garden"
ON public.garden_shares
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Policy: gli utenti possono vedere le condivisioni che hanno fatto
CREATE POLICY "Users can view their own shares"
ON public.garden_shares
FOR SELECT
USING (auth.uid() = owner_id);

-- Policy: gli utenti possono vedere chi ha condiviso con loro
CREATE POLICY "Users can view shares received"
ON public.garden_shares
FOR SELECT
USING (auth.uid() = shared_with_id);

-- Policy: gli utenti possono rimuovere le proprie condivisioni
CREATE POLICY "Users can delete their own shares"
ON public.garden_shares
FOR DELETE
USING (auth.uid() = owner_id);

-- Aggiorna policy plants per permettere visualizzazione piante condivise
CREATE POLICY "Users can view shared plants"
ON public.plants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.garden_shares
    WHERE garden_shares.owner_id = plants.user_id
    AND garden_shares.shared_with_id = auth.uid()
  )
);