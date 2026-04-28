import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, RefreshCw, PlayCircle, Sparkles, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { updateExp } from '../store/authSlice';
import { supabase } from '../lib/supabase';
import { getAIFeedbackProvider } from '../lib/aiProvider';
import { logStudyActivity } from '../lib/progress';

// Danh sách chữ Hán được phân nhóm - load thêm theo yêu cầu (lazy expansion)
const CHAR_GROUPS = [
  { label: 'HSK 1 - Cơ bản', chars: ['我', '你', '他', '她', '好', '大', '小', '人', '水', '火'] },
  { label: 'HSK 1 - Động từ', chars: ['爱', '学', '习', '吃', '喝', '去', '来', '看', '说', '听'] },
  { label: 'HSK 2 - Nâng cao', chars: ['中', '文', '语', '国', '家', '朋', '友', '老', '师', '生'] },
];

/**
 * useHanziWriter - Custom hook để quản lý lifecycle của HanziWriter
 * Tránh re-render toàn bộ DOM, chỉ update instance khi character thay đổi
 */
function useHanziWriter(containerRef, character, { onComplete, onMistake, onCorrectStroke }) {
  const writerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !character) return;

    // Cleanup cũ để tránh memory leak
    containerRef.current.innerHTML = '';
    writerRef.current = null;

    // Lazy import HanziWriter để tránh block main thread
    let cancelled = false;
    import('hanzi-writer').then(({ default: HanziWriter }) => {
      if (cancelled || !containerRef.current) return;

      writerRef.current = HanziWriter.create(containerRef.current, character, {
        width: 280,
        height: 280,
        padding: 20,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 200,
        showOutline: true,
        strokeColor: '#4f46e5',
        highlightColor: '#f43f5e',
        outlineColor: '#e2e8f0',
        drawingWidth: 20,
        drawingColor: '#1e293b',
        leniency: 2.0, // Tối ưu cho người dùng viết bằng chuột (chuẩn là 1, càng lớn càng dễ)
        showHintAfterMisses: 1, // Hiển thị gợi ý nét ngay sau 1 lần viết sai
        charDataLoader: (char, onLoad) => {
          // Custom loader với retry logic
          fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${encodeURIComponent(char)}.json`)
            .then(r => r.json())
            .then(onLoad)
            .catch(() => {
              // Fallback CDN
              fetch(`https://unpkg.com/hanzi-writer-data@latest/${encodeURIComponent(char)}.json`)
                .then(r => r.json())
                .then(onLoad)
                .catch(err => console.error(`Không tải được dữ liệu cho chữ "${char}":`, err));
            });
        }
      });
    });

    return () => { cancelled = true; };
  }, [character]); // Chỉ re-run khi character đổi, không phụ thuộc callbacks

  const animateCharacter = useCallback(() => {
    writerRef.current?.animateCharacter();
  }, []);

  const startQuiz = useCallback(() => {
    if (!writerRef.current) return;
    writerRef.current.quiz({ onMistake, onCorrectStroke, onComplete });
  }, [onMistake, onCorrectStroke, onComplete]);

  return { animateCharacter, startQuiz };
}

export default function Writing() {
  const containerRef = useRef(null);
  const [character, setCharacter] = useState('我');
  const [activeGroup, setActiveGroup] = useState(0);
  const [isQuizzing, setIsQuizzing] = useState(false);
  const [message, setMessage] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [quizComplete, setQuizComplete] = useState(false);

  const dispatch = useDispatch();
  const { user, profile } = useSelector(state => state.auth);
  const feedbackProvider = getAIFeedbackProvider();

  const handleComplete = useCallback(async (summaryData) => {
    const totalMistakes = summaryData.totalMistakes;
    const expGained = totalMistakes === 0 ? 50 : Math.max(10, 50 - totalMistakes * 8);

    setMistakes(totalMistakes);
    setMessage(`Hoàn thành! Lỗi: ${totalMistakes}. Bạn nhận được +${expGained} EXP!`);
    setIsQuizzing(false);
    setQuizComplete(true);

    // Update EXP & log
    if (user && profile) {
      dispatch(updateExp(expGained));
      // Thay vì tự update profiles ở đây, logStudyActivity sẽ lo việc cập nhật bảng profiles và study_history
      await logStudyActivity(user.id, expGained, 0);
      
      await supabase.from('learning_logs').insert({
        user_id: user.id,
        activity_type: 'writing',
        score: expGained,
        mistakes: totalMistakes,
        metadata: { character }
      });
    }

    // Gọi AI Feedback
    setIsLoadingFeedback(true);
    try {
      const feedback = await feedbackProvider.getFeedback({
        activityType: 'writing',
        userInput: `Viết chữ "${character}" với ${totalMistakes} lỗi nét bút`,
        targetText: character,
      });
      setAiFeedback(feedback);
    } catch (err) {
      console.error('AI Feedback error:', err);
    } finally {
      setIsLoadingFeedback(false);
    }
  }, [character, user, profile, dispatch, feedbackProvider]);

  const handleMistake = useCallback((strokeData) => {
    setMessage(`Sai nét thứ ${strokeData.strokeNum + 1}. Thử lại!`);
  }, []);

  const handleCorrectStroke = useCallback((strokeData) => {
    setMessage(`Tốt! Nét thứ ${strokeData.strokeNum + 1} chính xác ✓`);
  }, []);

  const { animateCharacter, startQuiz } = useHanziWriter(
    containerRef,
    character,
    { onComplete: handleComplete, onMistake: handleMistake, onCorrectStroke: handleCorrectStroke }
  );

  const handleAnimateClick = () => {
    setIsQuizzing(false);
    setQuizComplete(false);
    setMessage('');
    setAiFeedback(null);
    setMistakes(0);
    animateCharacter();
  };

  const handleStartQuiz = () => {
    setIsQuizzing(true);
    setQuizComplete(false);
    setMessage('Hãy vẽ lại nét chữ lên khung trên!');
    setAiFeedback(null);
    setMistakes(0);
    startQuiz();
  };

  const handleCharChange = (char) => {
    setCharacter(char);
    setIsQuizzing(false);
    setQuizComplete(false);
    setMessage('');
    setAiFeedback(null);
    setMistakes(0);
  };

  const currentGroupChars = CHAR_GROUPS[activeGroup].chars;
  const currentCharIndex = currentGroupChars.indexOf(character);

  const goNext = () => {
    const nextIndex = (currentCharIndex + 1) % currentGroupChars.length;
    handleCharChange(currentGroupChars[nextIndex]);
  };

  const goPrev = () => {
    const prevIndex = (currentCharIndex - 1 + currentGroupChars.length) % currentGroupChars.length;
    handleCharChange(currentGroupChars[prevIndex]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
          <PenTool className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Luyện Viết Chữ Hán</h2>
          <p className="text-slate-500 mt-1 font-medium">
            Học đúng thứ tự nét bút. AI sẽ phân tích và gợi ý sau mỗi bài.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Canvas chính */}
        <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50" />

          <div className="flex flex-col items-center justify-center relative z-10">
            {/* Writing canvas - stable DOM node, không re-render */}
            <div
              className="relative border-4 border-dashed border-slate-200 rounded-3xl bg-slate-50 overflow-hidden mb-6"
              style={{ width: '288px', height: '288px' }}
            >
              {/* Grid guidelines */}
              <div className="absolute inset-0 pointer-events-none opacity-10">
                <div className="absolute top-1/2 left-0 right-0 border-t border-slate-500" />
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-slate-500" />
                <div className="absolute inset-0 border border-dashed border-slate-400 rounded-2xl m-4" />
              </div>
              {/* HanziWriter mount point - dùng stable ref, tránh re-mount */}
              <div ref={containerRef} className="cursor-crosshair relative z-10 w-full h-full" />
            </div>

            {/* Status message */}
            <AnimatePresence mode="wait">
              <motion.div
                key={message}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`px-6 py-3 rounded-2xl font-semibold mb-6 text-sm transition-colors min-h-[48px] flex items-center ${
                  isQuizzing ? 'bg-orange-50 text-orange-600' :
                  quizComplete ? 'bg-green-50 text-green-700' :
                  'bg-indigo-50 text-indigo-600'
                }`}
              >
                {message || 'Nhấn nút để xem cách viết hoặc bắt đầu kiểm tra'}
              </motion.div>
            </AnimatePresence>

            {/* Nav + Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={goPrev}
                className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                title="Chữ trước"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleAnimateClick}
                className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
              >
                <PlayCircle className="w-5 h-5" /> Viết mẫu
              </button>
              <button
                onClick={handleStartQuiz}
                disabled={isQuizzing}
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <PenTool className="w-5 h-5" /> Làm bài
              </button>
              <button
                onClick={goNext}
                className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                title="Chữ tiếp theo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Character List */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit space-y-4">
          
          {/* Custom Input */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tự chọn chữ khó</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                maxLength={1}
                placeholder="Ví dụ: 赢"
                onChange={(e) => {
                  if (e.target.value.match(/[\u4e00-\u9fa5]/)) {
                    handleCharChange(e.target.value);
                  }
                }}
                className="flex-1 w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-lg font-bold text-center outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Nhập 1 chữ Hán bất kỳ để luyện nét.</p>
          </div>

          {/* Group tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {CHAR_GROUPS.map((group, i) => (
              <button
                key={i}
                onClick={() => { setActiveGroup(i); handleCharChange(group.chars[0]); }}
                className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-colors ${
                  activeGroup === i ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {i === 0 ? 'Cơ bản' : i === 1 ? 'Động từ' : 'Nâng cao'}
              </button>
            ))}
          </div>

          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            {CHAR_GROUPS[activeGroup].label}
          </h3>

          {/* Character grid - lazy loaded per group */}
          <div className="grid grid-cols-4 gap-2">
            {currentGroupChars.map(c => (
              <button
                key={c}
                onClick={() => handleCharChange(c)}
                className={`text-2xl font-bold p-3 rounded-xl transition-all ${
                  character === c
                    ? 'bg-indigo-500 text-white shadow-md scale-105'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 border border-slate-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
            <p className="text-xs text-orange-800 font-medium">
              💡 <strong>Mẹo:</strong> Trái → Phải, Trên → Dưới, Ngang → Sổ. Nhấn "Viết mẫu" để xem trước.
            </p>
          </div>
        </div>
      </div>

      {/* AI Feedback Panel */}
      <AnimatePresence>
        {(isLoadingFeedback || aiFeedback) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h3 className="text-xl font-bold text-slate-800">Phân tích từ AI</h3>
            </div>

            {isLoadingFeedback ? (
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                <p className="text-slate-500 animate-pulse">AI đang phân tích bài viết...</p>
              </div>
            ) : aiFeedback && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 bg-indigo-50 rounded-2xl">
                  <p className="text-sm font-bold text-indigo-500 mb-2">Nhận xét</p>
                  <p className="text-slate-700 text-sm">{aiFeedback.feedback}</p>
                </div>

                {aiFeedback.suggestions?.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                    <p className="text-sm font-bold text-green-600 mb-2">Gợi ý</p>
                    <ul className="space-y-1">
                      {aiFeedback.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-green-800 flex items-start gap-1.5">
                          <span>💡</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
