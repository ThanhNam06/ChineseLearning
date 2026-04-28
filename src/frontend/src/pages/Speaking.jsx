import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2, CheckCircle, Sparkles, RotateCcw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSpeechProvider, getAIFeedbackProvider } from '../lib/aiProvider';

// Danh sách câu luyện tập - dễ mở rộng
const PRACTICE_SENTENCES = [
  {
    hanzi: '我是越南人，我正在学中文',
    pinyin: 'wǒ shì yuènán rén, wǒ zhèngzài xué zhōngwén',
    meaning: 'Tôi là người Việt Nam, tôi đang học tiếng Trung'
  },
  {
    hanzi: '你好，很高兴认识你',
    pinyin: 'nǐ hǎo, hěn gāoxìng rènshí nǐ',
    meaning: 'Xin chào, rất vui được gặp bạn'
  },
  {
    hanzi: '我喜欢吃中国菜',
    pinyin: 'wǒ xǐhuān chī zhōngguó cài',
    meaning: 'Tôi thích ăn đồ ăn Trung Quốc'
  },
  {
    hanzi: '今天天气很好，我们去公园吧',
    pinyin: 'jīntiān tiānqì hěn hǎo, wǒmen qù gōngyuán ba',
    meaning: 'Hôm nay thời tiết đẹp, chúng ta đi công viên nhé'
  }
];

export default function Speaking() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [customSentence, setCustomSentence] = useState({ hanzi: '', pinyin: '', meaning: '' });
  const [useCustom, setUseCustom] = useState(false);

  // AI Provider Layer
  const speechProviderRef = useRef(null);
  const feedbackProvider = getAIFeedbackProvider();

  const currentSentence = useCustom && customSentence.hanzi ? customSentence : PRACTICE_SENTENCES[sentenceIndex];

  const handleTranscriptChunk = useCallback((text) => {
    setTranscript(prev => (prev + ' ' + text).trim());
  }, []);

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      setTranscript('');
      setAiFeedback(null);

      // Lấy provider từ AI Provider Layer (có thể đổi thành 'web-speech' hay 'whisper')
      speechProviderRef.current = getSpeechProvider('deepgram');

      await speechProviderRef.current.startRecording(
        handleTranscriptChunk,
        (error) => {
          console.error('Speech provider error:', error);
          setIsRecording(false);
          setIsConnecting(false);
        },
        () => {
          setIsConnecting(false);
          setIsRecording(true);
        }
      );
    } catch (error) {
      console.error('Lỗi khi truy cập Microphone:', error);
      alert('Vui lòng cấp quyền Microphone để luyện nói.');
      setIsConnecting(false);
    }
  };

  const stopRecording = async () => {
    speechProviderRef.current?.stopRecording();
    setIsRecording(false);

    // Sau khi dừng, gọi AI Feedback
    if (transcript.trim()) {
      setIsAnalyzing(true);
      try {
        const result = await feedbackProvider.getFeedback({
          activityType: 'speaking',
          userInput: transcript,
          targetText: currentSentence.hanzi,
        });
        setAiFeedback(result);
      } catch (err) {
        console.error('AI Feedback error:', err);
        // Fallback to basic scoring if AI is unavailable
        setAiFeedback({
          score: calculateBasicScore(transcript, currentSentence.hanzi),
          feedback: 'Không thể kết nối AI lúc này. Hãy kiểm tra lại kết nối.',
          corrections: [],
          suggestions: ['Tiếp tục luyện tập mỗi ngày!']
        });
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  // Basic score fallback
  const calculateBasicScore = (transcript, target) => {
    const clean = s => s.replace(/[^\u4e00-\u9fa5]/g, '');
    const tChars = clean(transcript);
    const targetChars = clean(target);
    if (!targetChars) return 0;
    let matchCount = 0;
    for (let i = 0; i < Math.min(tChars.length, targetChars.length); i++) {
      if (tChars[i] === targetChars[i]) matchCount++;
    }
    const score = Math.round((matchCount / targetChars.length) * 100);
    return Math.max(0, Math.min(100, score));
  };

  const nextSentence = () => {
    setSentenceIndex(i => (i + 1) % PRACTICE_SENTENCES.length);
    setTranscript('');
    setAiFeedback(null);
  };

  const retry = () => {
    setTranscript('');
    setAiFeedback(null);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    setUseCustom(true);
    setTranscript('');
    setAiFeedback(null);
  };

  const scoreColor = (score) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const scoreBg = (score) => {
    if (score >= 85) return 'from-green-400 to-emerald-500';
    if (score >= 60) return 'from-yellow-400 to-orange-400';
    return 'from-red-400 to-rose-500';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Mic className="w-8 h-8 text-indigo-500" /> Luyện Phát Âm
          </h2>
          <p className="text-slate-500 mt-1">
            AI sẽ lắng nghe và phân tích phát âm của bạn theo thời gian thực.
          </p>
        </div>
        {/* Sentence counter */}
        <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {sentenceIndex + 1} / {PRACTICE_SENTENCES.length}
        </span>
      </div>

      {/* Custom Sentence Input */}
      <form onSubmit={handleCustomSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex gap-4 items-center">
        <input 
          type="text" 
          placeholder="Nhập câu hoặc bài thơ bạn muốn luyện (VD: 床前明月光)..." 
          value={customSentence.hanzi}
          onChange={(e) => setCustomSentence({ ...customSentence, hanzi: e.target.value })}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100"
          required
        />
        <button type="submit" className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors whitespace-nowrap">
          Luyện câu này
        </button>
      </form>

      {/* Practice Card */}
      <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-50 rounded-full blur-3xl opacity-50" />

        <div className="relative z-10 space-y-4">
          <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-semibold">
            Câu luyện tập
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-wide leading-tight">
            {currentSentence.hanzi}
          </h1>
          {currentSentence.pinyin && <p className="text-xl md:text-2xl text-slate-600 font-medium">{currentSentence.pinyin}</p>}
          {currentSentence.meaning && <p className="text-lg text-slate-500">{currentSentence.meaning}</p>}

          {/* Recording Button */}
          <div className="pt-6 flex justify-center">
            {isConnecting ? (
              <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              </div>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 hover:scale-105 transition-all shadow-lg shadow-red-100 relative"
              >
                <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-25" />
                <Square className="w-8 h-8 fill-current" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-24 h-24 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-200"
              >
                <Mic className="w-10 h-10" />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-400 font-medium">
            {isConnecting ? 'Đang kết nối AI...' : isRecording ? 'Đang ghi âm... Nhấn để dừng' : 'Nhấn vào mic để đọc câu trên'}
          </p>
        </div>
      </div>

      {/* Live Transcript */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-50 rounded-2xl p-5 border border-slate-200"
          >
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Nhận diện giọng nói</p>
            <p className="text-2xl font-bold text-slate-700">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Analysis Results */}
      <AnimatePresence>
        {(isAnalyzing || aiFeedback) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h3 className="text-xl font-bold text-slate-800">Phân tích từ GPT-4o Mini</h3>
            </div>

            {isAnalyzing ? (
              <div className="flex flex-col items-center py-10 space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">AI đang phân tích phát âm...</p>
              </div>
            ) : aiFeedback && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Score Circle */}
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl p-6">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Điểm số</p>
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                        <circle
                          cx="50" cy="50" r="40"
                          stroke="url(#scoreGrad)" strokeWidth="8" fill="none"
                          strokeLinecap="round"
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * aiFeedback.score) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={aiFeedback.score >= 85 ? '#22c55e' : aiFeedback.score >= 60 ? '#eab308' : '#ef4444'} />
                            <stop offset="100%" stopColor={aiFeedback.score >= 85 ? '#10b981' : aiFeedback.score >= 60 ? '#f97316' : '#f43f5e'} />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-3xl font-black ${scoreColor(aiFeedback.score)}`}>
                        {aiFeedback.score}
                      </span>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="p-4 bg-indigo-50 rounded-2xl">
                      <p className="text-sm font-bold text-indigo-600 mb-1">Nhận xét tổng quát</p>
                      <p className="text-slate-700">{aiFeedback.feedback}</p>
                    </div>

                    {aiFeedback.corrections?.length > 0 && (
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                        <p className="text-sm font-bold text-orange-600 mb-2">Lỗi cần sửa</p>
                        <ul className="space-y-1">
                          {aiFeedback.corrections.map((c, i) => (
                            <li key={i} className="text-sm text-orange-800 flex items-start gap-2">
                              <span className="mt-0.5">⚠️</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiFeedback.suggestions?.length > 0 && (
                      <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                        <p className="text-sm font-bold text-green-600 mb-2">Gợi ý cải thiện</p>
                        <ul className="space-y-1">
                          {aiFeedback.suggestions.map((s, i) => (
                            <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                              <span className="mt-0.5">💡</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={retry}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Thử lại
                  </button>
                  <button
                    onClick={nextSentence}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md"
                  >
                    Câu tiếp theo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
