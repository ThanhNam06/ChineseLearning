/**
 * AI PROVIDER LAYER
 * ==================
 * Một lớp trừu tượng (abstraction layer) để quản lý các engine AI.
 * Thêm provider mới không cần thay đổi logic ở các Page component.
 *
 * Cách dùng:
 *   import { getSpeechProvider, getAIFeedbackProvider } from './aiProvider';
 *   const provider = getSpeechProvider(); // tự động chọn provider active
 *   await provider.startRecording(onTranscript);
 */

import { supabase } from './supabase';

// ============================================================
// SPEECH-TO-TEXT PROVIDERS
// ============================================================

/**
 * Provider 1: Deepgram (WebSocket streaming, real-time)
 */
class DeepgramProvider {
  name = 'deepgram';
  #socket = null;
  #mediaRecorder = null;
  #apiKey;

  constructor(apiKey) {
    this.#apiKey = apiKey;
  }

  async startRecording(onTranscript, onError, onReady) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    this.#mediaRecorder = mediaRecorder;

    const socket = new WebSocket(
      'wss://api.deepgram.com/v1/listen?model=nova-2&language=zh-CN&smart_format=true&interim_results=true',
      ['token', this.#apiKey]
    );
    this.#socket = socket;

    socket.onopen = () => {
      onReady?.();
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0 && socket.readyState === 1) {
          socket.send(event.data);
        }
      });
      mediaRecorder.start(250);
    };

    socket.onmessage = (message) => {
      const received = JSON.parse(message.data);
      const text = received.channel?.alternatives[0]?.transcript;
      if (text && received.is_final) {
        onTranscript(text);
      }
    };

    socket.onerror = (error) => onError?.(error);
    socket.onclose = () => {};
  }

  stopRecording() {
    if (this.#mediaRecorder) {
      this.#mediaRecorder.stop();
      this.#mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    if (this.#socket) {
      this.#socket.send(JSON.stringify({ type: 'CloseStream' }));
    }
  }
}

/**
 * Provider 2: Web Speech API (native browser, offline-capable)
 * Fallback khi không có API key hoặc muốn dùng offline
 */
class WebSpeechProvider {
  name = 'web-speech';
  #recognition = null;

  async startRecording(onTranscript, onError, onReady) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) throw new Error('Browser không hỗ trợ Web Speech API');

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = false;
    this.#recognition = recognition;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          onTranscript(event.results[i][0].transcript);
        }
      }
    };
    recognition.onerror = (e) => onError?.(e);
    recognition.onstart = () => onReady?.();
    recognition.start();
  }

  stopRecording() {
    this.#recognition?.stop();
  }
}

/**
 * Provider 3: OpenAI Whisper (qua Supabase Edge Function - server-side)
 * Độ chính xác cao nhất, dùng cho file audio thay vì real-time streaming
 */
class WhisperProvider {
  name = 'whisper';
  #mediaRecorder = null;
  #chunks = [];

  async startRecording(onTranscript, onError, onReady) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    this.#mediaRecorder = mediaRecorder;
    this.#chunks = [];

    mediaRecorder.ondataavailable = (e) => this.#chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      try {
        const blob = new Blob(this.#chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        formData.append('language', 'zh');

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whisper-transcribe`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${session?.access_token}` },
            body: formData
          }
        );
        const result = await res.json();
        if (result.transcript) onTranscript(result.transcript);
        else onError?.(new Error(result.error || 'Transcription failed'));
      } catch (err) {
        onError?.(err);
      }
    };

    onReady?.();
    mediaRecorder.start();
  }

  stopRecording() {
    if (this.#mediaRecorder?.state !== 'inactive') {
      this.#mediaRecorder?.stop();
      this.#mediaRecorder?.stream.getTracks().forEach(t => t.stop());
    }
  }
}

// ============================================================
// AI FEEDBACK PROVIDERS
// ============================================================

/**
 * AI Feedback qua Supabase Edge Function (an toàn - API key ở server)
 */
class SupabaseFeedbackProvider {
  name = 'supabase-gpt4o-mini';

  async getFeedback({ activityType, userInput, targetText, vocabularyId }) {
    const { data, error } = await supabase.functions.invoke('ai-feedback', {
      body: {
        activity_type: activityType,
        user_input: userInput,
        target_text: targetText,
        vocabulary_id: vocabularyId,
      }
    });

    if (error) {
      throw new Error(error.message || 'AI Feedback failed');
    }
    
    // In case the Edge Function returns an error object inside data
    if (data && data.error) {
      throw new Error(data.error);
    }

    return data;
  }
}

// ============================================================
// PROVIDER REGISTRY & FACTORY
// ============================================================

const SPEECH_PROVIDERS = {
  deepgram: (config) => new DeepgramProvider(config?.apiKey),
  'web-speech': () => new WebSpeechProvider(),
  whisper: () => new WhisperProvider(),
};

const FEEDBACK_PROVIDERS = {
  'supabase-gpt4o-mini': () => new SupabaseFeedbackProvider(),
};

/**
 * Lấy Speech Provider theo tên (hoặc default từ env)
 * @param {'deepgram' | 'web-speech' | 'whisper'} [providerName]
 */
export function getSpeechProvider(providerName = null) {
  const name = providerName
    || import.meta.env.VITE_SPEECH_PROVIDER
    || 'deepgram';

  const factory = SPEECH_PROVIDERS[name];
  if (!factory) throw new Error(`Unknown speech provider: "${name}". Available: ${Object.keys(SPEECH_PROVIDERS).join(', ')}`);

  const config = {
    deepgram: { apiKey: import.meta.env.VITE_DEEPGRAM_API_KEY || 'bf4c09253afa40d85d448ec15aeb48102a5db9aa' },
  }[name];

  return factory(config);
}

/**
 * Lấy AI Feedback Provider
 * @param {'supabase-gpt4o-mini'} [providerName]
 */
export function getAIFeedbackProvider(providerName = 'supabase-gpt4o-mini') {
  const factory = FEEDBACK_PROVIDERS[providerName];
  if (!factory) throw new Error(`Unknown feedback provider: "${providerName}"`);
  return factory();
}

/**
 * Gọi Supabase Edge Function để tính SRS và lưu log
 */
export async function submitSRSReview({ vocabularyId, quality, durationSeconds = 0 }) {
  const { data, error } = await supabase.functions.invoke('srs-calculate-review', {
    body: {
      vocabulary_id: vocabularyId,
      quality,
      duration_seconds: durationSeconds,
    }
  });

  if (error) {
    throw new Error(error.message || 'SRS review failed');
  }
  
  if (data && data.error) {
     throw new Error(data.error);
  }

  return data;
}
