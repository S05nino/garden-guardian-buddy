import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Genera un JWT per autenticarsi con Firebase
async function getFirebaseAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // Token valido per 1 ora

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
    scope: "https://www.googleapis.com/auth/firebase.messaging"
  };

  // Encode header e payload in base64url
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  
  // Import private key e firma
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const jwt = `${signatureInput}.${signatureB64}`;
  
  // Scambia il JWT per un access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    console.error("Token response:", tokenData);
    throw new Error("Failed to get Firebase access token");
  }
  
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id } = await req.json();
    
    if (!notification_id) {
      console.log("No notification_id provided");
      return new Response(JSON.stringify({ error: "Missing notification_id" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("Processing push notification for notification_id:", notification_id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Recupera la notifica dal database
    const { data: notification, error: notifError } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      console.error("Notification not found:", notifError);
      return new Response(JSON.stringify({ error: "Notification not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("Notification found:", { title: notification.title, user_id: notification.user_id });

    // Recupera tutti i token FCM dell'utente
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', notification.user_id);

    if (tokensError) {
      console.error("Error fetching FCM tokens:", tokensError);
      return new Response(JSON.stringify({ error: "Failed to fetch tokens" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!tokens || tokens.length === 0) {
      console.log("No FCM tokens found for user:", notification.user_id);
      return new Response(JSON.stringify({ message: "No tokens registered" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${tokens.length} FCM token(s) for user`);

    // Carica le credenziali Firebase
    const firebaseJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!firebaseJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON not configured");
      return new Response(JSON.stringify({ error: "Firebase not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const serviceAccount: FirebaseServiceAccount = JSON.parse(firebaseJson);
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    
    console.log("Firebase access token obtained");

    // Invia notifica push a tutti i dispositivi
    const results = await Promise.allSettled(
      tokens.map(async ({ token }) => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: token,
                notification: {
                  title: notification.title,
                  body: notification.body,
                },
                data: {
                  notification_id: notification.id,
                  type: notification.type,
                  ...(notification.data || {})
                },
                android: {
                  priority: "high",
                  notification: {
                    icon: "ic_notification",
                    color: "#22c55e"
                  }
                },
                apns: {
                  payload: {
                    aps: {
                      badge: 1,
                      sound: "default"
                    }
                  }
                }
              }
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("FCM send error for token:", token.substring(0, 20) + "...", errorText);
          
          // Se il token non è valido, rimuovilo
          if (response.status === 404 || errorText.includes("NOT_FOUND") || errorText.includes("UNREGISTERED")) {
            await supabaseClient
              .from('fcm_tokens')
              .delete()
              .eq('token', token);
            console.log("Removed invalid token");
          }
          
          throw new Error(errorText);
        }

        return response.json();
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Push notification results: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed: failed 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-notification-push:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
