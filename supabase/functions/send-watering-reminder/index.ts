import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { plantId, plantName, ownerId } = await req.json();

    if (!plantId || !plantName || !ownerId) {
      throw new Error('Missing required fields');
    }

    console.log('Sending watering reminder:', { plantId, plantName, ownerId, fromUser: user.id });

    // Ottieni il nome dell'utente che invia il promemoria
    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const senderName = senderProfile?.full_name || 'Un amico';

    // Inserisci la notifica
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: ownerId,
        type: 'watering_reminder',
        title: 'Promemoria annaffiatura',
        body: `${senderName} ti ricorda di annaffiare ${plantName}`,
        data: {
          plantId,
          plantName,
          remindedBy: user.id,
          remindedByName: senderName
        }
      });

    if (notificationError) {
      console.error('Error inserting notification:', notificationError);
      throw notificationError;
    }

    console.log('Watering reminder sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Promemoria inviato con successo' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-watering-reminder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});