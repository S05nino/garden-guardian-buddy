import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, mode } = await req.json();

    if (!image) {
      throw new Error("Image is required");
    }

    console.log("📍 Using Google AI Studio API");
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    console.log("🔑 GOOGLE_AI_API_KEY presente:", !!GOOGLE_AI_API_KEY);
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    const systemPrompt = mode === "diagnose" 
      ? `Sei un esperto di malattie delle piante. Analizza l'immagine della pianta e fornisci SOLO un oggetto JSON valido con:
- overallHealth: "healthy", "fair", o "poor"
- problems: array di {issue, severity ("low"/"medium"/"high"), cause, solution}
- recommendations: array di consigli per la cura
Non aggiungere altro testo, solo JSON.`
      : `Sei un esperto di identificazione delle piante. Se l'immagine contiene una pianta, fornisci SOLO un oggetto JSON valido con:
- name: nome comune in italiano
- scientificName: nome botanico
- category: tipo (herbs/succulents/flowers/vegetables/indoor/aquatic/ornamental)
- description: breve descrizione delle cure
- position: descrizione italiana della posizione ideale (es: "Balcone soleggiato", "Interno luminoso", "Vicino a una finestra luminosa", "Balcone ombreggiato", "Davanzale assolato", "Terrazzo soleggiato")
- wateringDays: numero tra 1-14
- preferences: {minTemp, maxTemp, minHumidity, maxHumidity}
- initialHealth: numero 80-100
- confidence: numero 0-1

Se NON è una pianta, rispondi: {"error": "no_plant", "message": "Nessuna pianta rilevata"}
Non aggiungere altro testo, solo JSON.`;

    // Estrai solo i dati base64 dall'immagine se contiene il prefisso data:image
    const imageData = image.includes('base64,') 
      ? image.split('base64,')[1] 
      : image;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt + "\n\n" + (mode === "diagnose" ? "Diagnostica questa pianta" : "Identifica questa pianta") },
              { 
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageData
                }
              }
            ]
          }]
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", response.status, error);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("Raw AI response:", content);

    // Estrai JSON dalla risposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Se non trova JSON, probabilmente non è una pianta
      return new Response(
        JSON.stringify({ 
          error: "no_plant_detected",
          message: "Nessuna pianta rilevata nell'immagine. Prova con un'altra foto." 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Se c'è un errore nel JSON, gestiscilo
    if (result.error === "no_plant") {
      return new Response(
        JSON.stringify({ 
          error: "no_plant_detected",
          message: result.message || "Nessuna pianta rilevata nell'immagine. Prova con un'altra foto." 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    console.log("Parsed result:", result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
