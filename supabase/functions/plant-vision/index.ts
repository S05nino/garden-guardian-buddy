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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY_NOV25");
    console.log("🔑 LOVABLE_API_KEY presente:", !!LOVABLE_API_KEY);
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: mode === "diagnose" ? "Diagnostica questa pianta" : "Identifica questa pianta" },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", response.status, error);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
