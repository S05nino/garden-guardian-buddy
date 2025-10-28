-- Allow users to view their friends' plants
CREATE POLICY "Users can view their friends' plants"
ON public.plants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.friendships 
    WHERE friendships.user_id = auth.uid() 
    AND friendships.friend_id = plants.user_id
  )
);