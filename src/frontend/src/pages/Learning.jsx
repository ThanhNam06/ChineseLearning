import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, BookOpen, Play, CheckCircle2, Volume2, ChevronRight, Clock } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { updateExp } from '../store/authSlice';
import { logStudyActivity } from '../lib/progress';

const TOPICS = ['Tất cả', 'Giao tiếp', 'Cuộc sống', 'Y tế', 'Văn hóa', 'Ngụ ngôn'];
const LEVEL_COLORS = { 'Dễ': 'text-green-600 bg-green-50', 'Trung bình': 'text-orange-600 bg-orange-50', 'Khó': 'text-red-600 bg-red-50' };

export default function Learning() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterTopic, setFilterTopic] = useState('Tất cả');
  const [completed, setCompleted] = useState([]);

  const dispatch = useDispatch();
  const { user, profile } = useSelector(state => state.auth);

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('lessons').select('*').eq('is_published', true).order('hsk_level');
      if (data) {
        setLessons(data);
        // Load UI state from localStorage
        const savedLessonId = localStorage.getItem('last_lesson_id');
        if (savedLessonId) {
          const lesson = data.find(l => l.id === savedLessonId);
          if (lesson) setSelectedLesson(lesson);
        }
      }
      setLoading(false);
    };

    const fetchProgress = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('learning_logs')
        .select('metadata')
        .eq('user_id', user.id)
        .eq('activity_type', 'lesson');
      
      if (data) {
        const completedIds = data.map(log => log.metadata?.lesson_id).filter(Boolean);
        setCompleted(completedIds);
      }
    };

    fetchLessons();
    fetchProgress();

    const savedFilterType = localStorage.getItem('filter_type');
    if (savedFilterType) setFilterType(savedFilterType);
    const savedFilterTopic = localStorage.getItem('filter_topic');
    if (savedFilterTopic) setFilterTopic(savedFilterTopic);
  }, [user]);

  useEffect(() => {
    if (selectedLesson) localStorage.setItem('last_lesson_id', selectedLesson.id);
    localStorage.setItem('filter_type', filterType);
    localStorage.setItem('filter_topic', filterTopic);
  }, [selectedLesson, filterType, filterTopic]);

  const playAudio = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const handleComplete = async (lessonId) => {
    if (completed.includes(lessonId)) return;
    setCompleted(prev => [...prev, lessonId]);
    const expGained = 25;
    if (user && profile) {
      dispatch(updateExp(expGained));
      await logStudyActivity(user.id, expGained, 0); 
      // Save lesson completion to DB
      await supabase.from('learning_logs').insert({
        user_id: user.id,
        activity_type: 'lesson',
        score: 100,
        metadata: { lesson_id: lessonId }
      });
    }
  };

  const filtered = lessons.filter(l => {
    const matchType = filterType === 'all' || l.type === filterType;
    const matchTopic = filterTopic === 'Tất cả' || l.topic === filterTopic;
    return matchType && matchTopic;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-2xl shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Trung Tâm Học Tập</h2>
            <p className="text-slate-500 font-medium mt-1">Luyện kỹ năng Nghe & Đọc qua các bài học thực tế.</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap relative z-10 items-center">
          <button 
            onClick={() => setSelectedLesson({ id: 'custom', title: 'Phòng Tập Tiếng Trung', type: 'listening', hsk_level: 'Tùy chọn', topic: 'Tự do', content: '', pinyin: 'Sử dụng AI để phát âm chuẩn', translation: 'Bạn có thể nhập bất kỳ câu văn tiếng Trung nào để nghe' })}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
          >
            <Headphones className="w-5 h-5" />
            Tự Nhập Câu
          </button>
          
          <div className="h-10 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {[{ id: 'all', label: 'Tất cả' }, { id: 'listening', label: '🎧 Nghe' }, { id: 'reading', label: '📖 Đọc' }].map(t => (
            <button key={t.id} onClick={() => setFilterType(t.id)}
              className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all ${filterType === t.id ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topic filter */}
      <div className="flex gap-3 flex-wrap">
        {TOPICS.map(t => (
          <button key={t} onClick={() => setFilterTopic(t)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${filterTopic === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Lesson List */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Removed inline custom input card to declutter */}

          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white rounded-3xl animate-pulse border border-slate-100"></div>)
          ) : filtered.map((lesson, i) => (
            <motion.div key={lesson.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedLesson(lesson)}
              className={`p-6 rounded-3xl border cursor-pointer transition-all group ${selectedLesson?.id === lesson.id
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100'
                : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${selectedLesson?.id === lesson.id ? 'bg-white/20 text-white' : lesson.type === 'listening' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {lesson.type === 'listening' ? '🎧 Nghe' : '📖 Đọc'}
                </span>
                <div className="flex items-center gap-2">
                  {completed.includes(lesson.id) && <CheckCircle2 className={`w-4 h-4 ${selectedLesson?.id === lesson.id ? 'text-white' : 'text-green-500'}`} />}
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${selectedLesson?.id === lesson.id ? 'bg-white/20 text-white' : LEVEL_COLORS[lesson.difficulty]}`}>{lesson.difficulty}</span>
                </div>
              </div>
              <h4 className={`text-lg font-black mb-1 ${selectedLesson?.id === lesson.id ? 'text-white' : 'text-slate-800'}`}>{lesson.title}</h4>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${selectedLesson?.id === lesson.id ? 'text-indigo-100' : 'text-slate-400'}`}>HSK {lesson.hsk_level} · {lesson.topic}</span>
                <ChevronRight className={`w-4 h-4 ${selectedLesson?.id === lesson.id ? 'text-white' : 'text-slate-300 group-hover:text-indigo-400'}`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Lesson Content Panel */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            {selectedLesson ? (
              <motion.div key={selectedLesson.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 p-8">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg uppercase">{selectedLesson.type === 'listening' ? '🎧 Luyện nghe' : '📖 Luyện đọc'}</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-3">{selectedLesson.title}</h3>
                  </div>
                  <button onClick={() => playAudio(selectedLesson.content)}
                    className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex-shrink-0">
                    <Volume2 className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-6">
                  {selectedLesson.id === 'custom' ? (
                    <div className="bg-slate-50 rounded-3xl p-8 text-center flex-1 flex flex-col">
                      <textarea
                        value={selectedLesson.content}
                        onChange={(e) => setSelectedLesson({ ...selectedLesson, content: e.target.value })}
                        placeholder="Dán hoặc nhập đoạn văn tiếng Trung bạn muốn luyện đọc vào đây..."
                        className="w-full flex-1 bg-transparent border-none outline-none text-2xl font-bold text-slate-700 resize-none placeholder:text-slate-300 text-center"
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-3xl p-8 text-center">
                      <p className="text-4xl font-black text-slate-800 leading-relaxed tracking-wide">{selectedLesson.content}</p>
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <p className="text-xl text-indigo-500 font-bold italic">{selectedLesson.pinyin}</p>
                    <p className="text-lg text-slate-400 font-medium">{selectedLesson.id === 'custom' ? 'Nhấn nút 🔊 góc trên để nghe AI đọc văn bản của bạn!' : `"${selectedLesson.translation}"`}</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                    <Clock className="w-4 h-4" /> ~2 phút {selectedLesson.id !== 'custom' && `· HSK ${selectedLesson.hsk_level}`}
                  </div>
                  {selectedLesson.id !== 'custom' && (
                    <button
                      onClick={() => handleComplete(selectedLesson.id)}
                      disabled={completed.includes(selectedLesson.id)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-md ${completed.includes(selectedLesson.id)
                        ? 'bg-green-100 text-green-600 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {completed.includes(selectedLesson.id) ? 'Đã hoàn thành (+25 EXP)' : 'Hoàn thành bài học'}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                  <Play className="w-10 h-10 text-slate-200" />
                </div>
                <h4 className="text-2xl font-black text-slate-200">Chọn bài học</h4>
                <p className="text-slate-300 font-medium max-w-xs">Chọn một bài học từ danh sách bên trái để bắt đầu luyện tập.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
