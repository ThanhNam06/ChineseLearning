import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

function cleanJSON(text: string) {
    let t = text.trim();
    if (t.startsWith('```json')) t = t.slice(7);
    else if (t.startsWith('```')) t = t.slice(3);
    if (t.endsWith('```')) t = t.slice(0, -3);
    return t.trim();
}

async function getAIScore(transcript: string, targetText: string) {
  const systemPrompt = `You are a Chinese pronunciation expert. Compare transcript with target and score 0-100. Return JSON: {"score": number, "feedback": "string", "corrections": "string"}`;
  const userPrompt = `Target: "${targetText}", Transcript: "${transcript}"`;

  // 1. Google Gemini
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    if (res.status === 200) {
      const data = await res.json();
      return JSON.parse(cleanJSON(data.candidates[0].content.parts[0].text));
    }
  } catch (e) { console.warn("Gemini score failed", e); }

  // 2. Groq
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' }
      })
    });
    if (res.status === 200) {
      const data = await res.json();
      return JSON.parse(cleanJSON(data.choices[0].message.content));
    }
  } catch (e) { console.warn("Groq score failed", e); }

  // 3. OpenRouter
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'tencent/hy3-preview:free',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    })
  });
  const data = await res.json();
  return JSON.parse(cleanJSON(data.choices[0].message.content));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { transcript, targetText } = await req.json();
    const result = await getAIScore(transcript, targetText);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
