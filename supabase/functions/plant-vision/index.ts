import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
      throw new Error('Image is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'identify') {
      systemPrompt = `Sei un esperto botanico. Analizza l'immagine della pianta e fornisci:
1. Nome scientifico e comune della pianta
2. Categoria (succulenta, aromatica, ornamentale, ortaggio)
3. Descrizione breve
4. Posizione ideale (balcone soleggiato, interno luminoso, ecc)
5. Frequenza di annaffiatura (in giorni)
6. Preferenze ambientali (temperatura min/max, umidità min/max, esposizione solare)

Rispondi SOLO in formato JSON valido senza markdown:
{
  "name": "Nome pianta",
  "scientificName": "Nome scientifico",
  "category": "succulenta|aromatica|ornamentale|ortaggio",
  "description": "Descrizione",
  "position": "Posizione ideale",
  "wateringDays": numero,
  "preferences": {
    "minTemp": numero,
    "maxTemp": numero,
    "minHumidity": numero,
    "maxHumidity": numero,
    "sunlight": "full|partial|shade"
  },
  "confidence": numero_0_a_1
}`;
      userPrompt = 'Identifica questa pianta e fornisci tutte le informazioni richieste.';
    } else if (mode === 'diagnose') {
      systemPrompt = `Sei un esperto di patologie vegetali. Analizza l'immagine e diagnostica eventuali problemi:
- Foglie gialle, macchie, bruciature
- Parassiti o malattie fungine
- Carenze nutrizionali
- Problemi di irrigazione

Fornisci diagnosi e soluzioni concrete.

Rispondi SOLO in formato JSON valido senza markdown:
{
  "problems": [
    {
      "issue": "Descrizione problema",
      "severity": "low|medium|high",
      "cause": "Causa probabile",
      "solution": "Soluzione dettagliata"
    }
  ],
  "overallHealth": "healthy|fair|poor",
  "recommendations": ["Consiglio 1", "Consiglio 2"]
}`;
      userPrompt = 'Analizza questa pianta e identifica eventuali problemi di salute.';
    } else {
      throw new Error('Invalid mode. Use "identify" or "diagnose"');
    }

    console.log('Calling Lovable AI with mode:', mode);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', data);

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response (rimuovi markdown se presente)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log('Parsed result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in plant-vision:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
