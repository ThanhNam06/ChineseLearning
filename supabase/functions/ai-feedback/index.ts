import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

async function getAIFeedback(activityType: string, userInput: string, targetText: string) {
  const systemPrompt = `Bạn là giáo viên tiếng Trung. Đánh giá ${activityType === 'speaking' ? 'phát âm' : 'bài viết'}. 
  Trả về JSON: {"feedback": "nhận xét", "score": 85, "corrections": ["lỗi"], "suggestions": ["gợi ý"]}`;
  const userPrompt = `Target: "${targetText}", Input: "${userInput}"`;

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
  } catch (e) { console.warn("Gemini feedback failed", e); }

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
  } catch (e) { console.warn("Groq feedback failed", e); }

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader! } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const body = await req.json();
    const result = await getAIFeedback(body.activity_type, body.user_input, body.target_text);
    return new Response(JSON.stringify({ success: true, ...result }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});
