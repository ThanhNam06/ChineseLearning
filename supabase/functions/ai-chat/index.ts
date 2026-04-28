import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

const cache = new Map();

async function callAI(messages: any[], systemPrompt: string) {
  const fullPrompt = `${systemPrompt}\n\nLịch sử trò chuyện:\n${messages.map(m => `${m.role === 'user' ? 'Người dùng' : 'AI'}: ${m.content}`).join('\n')}`;

  // 1. Try Google Gemini (Default)
  try {
    const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
      })
    });

    if (googleRes.status === 200) {
      const data = await googleRes.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return { reply, source: 'google-gemini' };
    }
    console.warn(`Google Gemini failed: ${googleRes.status}`);
  } catch (err) {
    console.error('Google Gemini error:', err);
  }

  // 2. Try Groq (Fallback 1)
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (groqRes.status === 200) {
      const data = await groqRes.json();
      return { reply: data.choices[0].message.content, source: 'groq' };
    }
  } catch (err) {
    console.error('Groq error:', err);
  }

  // 3. Try OpenRouter (Fallback 2)
  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tencent/hy3-preview:free',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 300
      })
    });
    const orData = await orRes.json();
    return { reply: orData.choices?.[0]?.message?.content || "Lỗi AI.", source: 'openrouter' };
  } catch (err) {
    return { reply: "Lỗi kết nối AI. Vui lòng thử lại.", source: 'error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, recentVocab } = await req.json();
    const lastMessage = messages[messages.length - 1].content.toLowerCase().trim();
    
    if (cache.has(lastMessage)) {
      return new Response(JSON.stringify({ reply: cache.get(lastMessage), cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let vocabHint = '';
    if (recentVocab && recentVocab.length > 0) {
      const vocabList = recentVocab.map((v: any) => `${v.hanzi} (${v.pinyin}) = ${v.meaning}`).join(', ');
      vocabHint = `\n\nNgười dùng vừa ôn tập: [${vocabList}]. Hãy lồng ghép 1-2 từ vào câu trả lời.`;
    }

    const systemPrompt = `Bạn là giáo viên tiếng Trung (AI Tutor). Quy tắc: 1. Trả lời bằng tiếng Trung kèm giải thích tiếng Việt. 2. Luôn có Pinyin trong ngoặc. 3. Trả lời cực ngắn (1-2 câu).${vocabHint}`;

    const { reply, source } = await callAI(messages, systemPrompt);

    cache.set(lastMessage, reply);
    if (cache.size > 100) cache.delete(cache.keys().next().value);

    return new Response(JSON.stringify({ reply, cached: false, source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
