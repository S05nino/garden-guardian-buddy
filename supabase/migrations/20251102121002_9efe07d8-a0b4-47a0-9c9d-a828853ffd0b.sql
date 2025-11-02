-- Rimuovi la policy esistente che permette a tutti di vedere i profili
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Crea una nuova policy che permette solo di vedere il proprio profilo
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Crea una policy che permette di vedere i profili degli amici
CREATE POLICY "Users can view friends' profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE friendships.user_id = auth.uid()
      AND friendships.friend_id = profiles.user_id
  )
);