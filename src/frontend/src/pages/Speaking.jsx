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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full w-full max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3">
          <Mic className="w-10 h-10 text-indigo-500" /> Luyện Phát Âm AI
        </h2>
        <p className="text-slate-500 mt-2 font-medium text-lg">
          Chọn một câu mẫu hoặc tự nhập câu của bạn. AI sẽ lắng nghe và đánh giá chính xác từng âm tiết.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Playlist & Custom Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border border-white/50">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> Thư viện câu mẫu
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {PRACTICE_SENTENCES.map((sentence, index) => {
                const isActive = !useCustom && sentenceIndex === index;
                return (
                  <button
                    key={index}
                    onClick={() => { setUseCustom(false); setSentenceIndex(index); setTranscript(''); setAiFeedback(null); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                      isActive 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200 border-transparent' 
                      : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    <p className={`font-bold text-lg ${isActive ? 'text-white' : 'text-slate-800'}`}>{sentence.hanzi}</p>
                    <p className={`text-sm mt-1 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>{sentence.meaning}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Sentence Input */}
          <form onSubmit={handleCustomSubmit} className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white/50 space-y-4">
            <h3 className="text-lg font-black text-slate-800">Hoặc tự nhập câu:</h3>
            <textarea 
              rows="2"
              placeholder="VD: 床前明月光..." 
              value={customSentence.hanzi}
              onChange={(e) => setCustomSentence({ ...customSentence, hanzi: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              required
            />
            <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-md">
              Luyện câu này
            </button>
          </form>
        </div>

        {/* Right Column: Practice Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Practice Card */}
          <div className="bg-white rounded-[2.5rem] p-10 md:p-14 shadow-2xl border border-slate-50 text-center relative overflow-hidden group">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:bg-indigo-500/20 transition-all duration-700" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:bg-purple-500/20 transition-all duration-700" />

            <div className="relative z-10 space-y-6">
              <span className="inline-block px-5 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold tracking-widest uppercase">
                Mục tiêu
              </span>
              <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-indigo-900 tracking-wide leading-tight py-2">
                {currentSentence.hanzi}
              </h1>
              {currentSentence.pinyin && <p className="text-2xl md:text-3xl text-indigo-400 font-medium tracking-wide">{currentSentence.pinyin}</p>}
              {currentSentence.meaning && <p className="text-xl text-slate-500 font-medium">{currentSentence.meaning}</p>}

              {/* Recording Button */}
              <div className="pt-10 flex justify-center">
                {isConnecting ? (
                  <div className="w-28 h-28 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                  </div>
                ) : isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="w-28 h-28 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 hover:scale-105 transition-all shadow-2xl shadow-red-200 relative group/btn"
                  >
                    <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-30" />
                    <Square className="w-10 h-10 fill-current group-hover/btn:scale-90 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-28 h-28 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center hover:from-indigo-700 hover:to-purple-700 hover:scale-105 transition-all shadow-2xl shadow-indigo-300 group/btn"
                  >
                    <Mic className="w-12 h-12 group-hover/btn:scale-110 transition-transform" />
                  </button>
                )}
              </div>
              <p className="text-base text-slate-400 font-bold uppercase tracking-wider mt-4">
                {isConnecting ? 'Đang kết nối AI...' : isRecording ? 'Đang ghi âm... Nhấn vuông để dừng' : 'Nhấn Micro để nói'}
              </p>
            </div>
          </div>

          {/* Live Transcript */}
          <AnimatePresence>
            {transcript && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                className="bg-slate-800 rounded-[2rem] p-8 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 animate-pulse"></div>
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3 pl-4">AI Đang nghe thấy</p>
                <p className="text-3xl font-bold text-white pl-4 leading-relaxed">{transcript}</p>
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
                className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-50"
              >
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Sparkles className="w-6 h-6" /></div>
                  <h3 className="text-2xl font-black text-slate-800">Báo cáo Phân tích AI</h3>
                </div>

                {isAnalyzing ? (
                  <div className="flex flex-col items-center py-16 space-y-6">
                    <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                    <p className="text-xl text-slate-500 font-bold animate-pulse tracking-wide">Đang chấm điểm phát âm...</p>
                  </div>
                ) : aiFeedback && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Score Circle */}
                      <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Độ chuẩn xác</p>
                        <div className="relative w-40 h-40">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                            <circle
                              cx="50" cy="50" r="40"
                              stroke="url(#scoreGrad)" strokeWidth="10" fill="none"
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
                          <span className={`absolute inset-0 flex items-center justify-center text-5xl font-black ${scoreColor(aiFeedback.score)}`}>
                            {aiFeedback.score}
                          </span>
                        </div>
                      </div>

                      {/* Feedback List */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                          <p className="text-sm font-black text-indigo-600 mb-2 uppercase tracking-widest">Nhận xét tổng quát</p>
                          <p className="text-slate-700 text-lg leading-relaxed">{aiFeedback.feedback}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {aiFeedback.corrections?.length > 0 && (
                            <div className="p-5 bg-rose-50/50 rounded-3xl border border-rose-100">
                              <p className="text-sm font-black text-rose-600 mb-3 uppercase tracking-widest">Lỗi phát âm</p>
                              <ul className="space-y-2">
                                {aiFeedback.corrections.map((c, i) => (
                                  <li key={i} className="text-base text-rose-800 flex items-start gap-2">
                                    <span className="shrink-0 mt-1">🎯</span> {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {aiFeedback.suggestions?.length > 0 && (
                            <div className="p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                              <p className="text-sm font-black text-emerald-600 mb-3 uppercase tracking-widest">Gợi ý cải thiện</p>
                              <ul className="space-y-2">
                                {aiFeedback.suggestions.map((s, i) => (
                                  <li key={i} className="text-base text-emerald-800 flex items-start gap-2">
                                    <span className="shrink-0 mt-1">💡</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-6 border-t border-slate-100 justify-end">
                      <button
                        onClick={retry}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all text-lg"
                      >
                        <RotateCcw className="w-5 h-5" /> Thử lại
                      </button>
                      <button
                        onClick={nextSentence}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl shadow-indigo-200 text-lg"
                      >
                        Câu tiếp theo <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
