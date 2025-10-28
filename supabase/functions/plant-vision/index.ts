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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    console.log("🔑 LOVABLE_API_KEY presente:", !!LOVABLE_API_KEY);
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = mode === "diagnose" 
      ? `Sei un esperto di malattie delle piante. Analizza l'immagine della pianta fornita.`
      : `Sei un esperto di identificazione delle piante. Analizza l'immagine fornita e determina se contiene una pianta.`;

    const tools = mode === "diagnose" ? [
      {
        type: "function",
        function: {
          name: "diagnose_plant",
          description: "Diagnostica lo stato di salute di una pianta",
          parameters: {
            type: "object",
            properties: {
              overallHealth: {
                type: "string",
                enum: ["healthy", "fair", "poor"],
                description: "Stato di salute generale della pianta"
              },
              problems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    issue: { type: "string", description: "Problema riscontrato" },
                    severity: { type: "string", enum: ["low", "medium", "high"] },
                    cause: { type: "string", description: "Causa del problema" },
                    solution: { type: "string", description: "Soluzione consigliata" }
                  },
                  required: ["issue", "severity", "cause", "solution"]
                }
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Consigli per la cura"
              }
            },
            required: ["overallHealth", "problems", "recommendations"]
          }
        }
      }
    ] : [
      {
        type: "function",
        function: {
          name: "identify_plant",
          description: "Identifica una pianta dall'immagine. Usa questa funzione SOLO se l'immagine contiene effettivamente una pianta.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nome comune della pianta in italiano" },
              scientificName: { type: "string", description: "Nome scientifico botanico" },
              category: { 
                type: "string", 
                enum: ["herbs", "succulents", "flowers", "vegetables", "indoor", "aquatic", "ornamental"],
                description: "Categoria della pianta"
              },
              description: { type: "string", description: "Breve descrizione delle cure necessarie" },
              position: { 
                type: "string",
                enum: ["sun", "partial_sun", "shade"],
                description: "Posizione preferita"
              },
              wateringDays: { 
                type: "number",
                description: "Giorni tra un'annaffiatura e l'altra (1-14)",
                minimum: 1,
                maximum: 14
              },
              preferences: {
                type: "object",
                properties: {
                  minTemp: { type: "number", description: "Temperatura minima ideale in °C" },
                  maxTemp: { type: "number", description: "Temperatura massima ideale in °C" },
                  minHumidity: { type: "number", description: "Umidità minima ideale in %" },
                  maxHumidity: { type: "number", description: "Umidità massima ideale in %" }
                },
                required: ["minTemp", "maxTemp", "minHumidity", "maxHumidity"]
              },
              initialHealth: { 
                type: "number",
                description: "Salute iniziale (80-100)",
                minimum: 80,
                maximum: 100
              },
              confidence: {
                type: "number",
                description: "Livello di confidenza nell'identificazione (0-1)",
                minimum: 0,
                maximum: 1
              }
            },
            required: ["name", "scientificName", "category", "description", "position", "wateringDays", "preferences", "initialHealth", "confidence"]
          }
        }
      }
    ];

    const userMessage = mode === "diagnose" 
      ? "Diagnostica lo stato di salute di questa pianta e fornisci consigli."
      : "Se questa immagine contiene una pianta, identificala e fornisci le informazioni richieste. Se NON contiene una pianta, rispondi semplicemente con un messaggio che indica che non è stata rilevata alcuna pianta.";

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
              { type: "text", text: userMessage },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
        tools: tools,
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      throw new Error("No response from AI");
    }

    // Se l'AI ha usato un tool call, estrai i dati
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const result = JSON.parse(toolCall.function.arguments);
      console.log("Plant identified via tool call:", result);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Altrimenti, l'AI ha risposto in testo normale (probabilmente "nessuna pianta")
    const content = message.content || "";
    console.log("AI response (no tool call):", content);
    
    // Restituisci un messaggio di errore strutturato
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
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
