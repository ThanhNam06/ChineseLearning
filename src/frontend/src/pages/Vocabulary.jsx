import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Star, Filter, Search, RotateCcw, Plus, UploadCloud, X, Zap } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { updateExp } from '../store/authSlice';
import { logStudyActivity } from '../lib/progress';
import Papa from 'papaparse';
import SessionComplete from '../components/SessionComplete';
import SmartReview from '../components/SmartReview';

const SESSION_THRESHOLD = 5;

export default function Vocabulary() {
  const [vocabularies, setVocabularies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);

  // Session tracking for celebration screen
  const [sessionCards, setSessionCards] = useState(0);
  const [sessionExp, setSessionExp] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const [showSmartReview, setShowSmartReview] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  
  const dispatch = useDispatch();
  const { user, profile } = useSelector(state => state.auth);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: vocabData, error: vocabError } = await supabase.from('vocabularies').select('*');
      if (vocabError) throw vocabError;
      
      const { data: progressData, error: progressError } = await supabase.from('user_progress').select('*').eq('user_id', user.id);
      if (progressError) throw progressError;

      const progressMap = {};
      progressData?.forEach(p => { progressMap[p.vocabulary_id] = p; });

      const now = Date.now();
      const mergedData = vocabData.map(v => {
        const prog = progressMap[v.id];
        return {
          ...v,
          repCount: prog?.rep_count || 0,
          nextReview: prog?.next_review ? new Date(prog.next_review).getTime() : 0,
        };
      });

      // Count due cards for the smart review button badge
      const due = mergedData.filter(v => v.nextReview <= now).length;
      setDueCount(due);
      setVocabularies(mergedData);
    } catch (error) {
      console.error("Lỗi khi gọi Supabase: ", error);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  const handleReview = async (vocabId, quality) => {
    if (!user) return;

    // Optimistic UI update immediately
    setVocabularies(prev => prev.map(v =>
      v.id === vocabId
        ? { ...v, repCount: quality === 0 ? 0 : (v.repCount || 0) + 1, nextReview: Date.now() + 86400000 }
        : v
    ));

    try {
      // Gọi Supabase Edge Function để tính SM-2 server-side và tự log
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/srs-calculate-review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ vocabulary_id: vocabId, quality })
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Sync local state với kết quả thực từ server (SM-2 chính xác)
      setVocabularies(prev => prev.map(v =>
        v.id === vocabId
          ? { ...v, repCount: result.rep_count, nextReview: new Date(result.next_review).getTime() }
          : v
      ));

      // Gamification EXP and History Logging
      if (quality > 0 && profile) {
        const expGained = quality === 2 ? 15 : 5;
        dispatch(updateExp(expGained));
        await logStudyActivity(user.id, expGained, 1);

        // Track session progress
        const newCount = sessionCards + 1;
        const newExp = sessionExp + expGained;
        setSessionCards(newCount);
        setSessionExp(newExp);

        // Check for newly unlocked badges
        const { data: badges } = await supabase
          .from('user_badges')
          .select('badges(name, icon, description)')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false })
          .limit(3);
        
        const recentBadges = (badges || [])
          .map(b => b.badges)
          .filter(Boolean);

        // Show celebration every SESSION_THRESHOLD cards
        if (newCount % SESSION_THRESHOLD === 0) {
          setNewBadges(recentBadges);
          setShowComplete(true);
        }
      }
    } catch (error) {
      console.error('SRS review error:', error);
      // Fallback: sync lại dữ liệu thật từ DB nếu có lỗi
      fetchData();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Chuẩn bị dữ liệu import
          const insertData = results.data.map(row => ({
            hanzi: row.hanzi || row.Hanzi,
            pinyin: row.pinyin || row.Pinyin,
            meaning: row.meaning || row.Meaning,
            hsk_level: parseInt(row.hsk_level || row.HSK || 1),
            examples: row.examples || row.Examples || '',
            user_id: user.id // Ai upload thì sở hữu
          })).filter(r => r.hanzi && r.pinyin && r.meaning);

          if (insertData.length === 0) return alert("File không hợp lệ hoặc thiếu cột bắt buộc (hanzi, pinyin, meaning).");

          const { error } = await supabase.from('vocabularies').insert(insertData);
          if (error) throw error;
          
          alert(`Import thành công ${insertData.length} từ vựng!`);
          setShowModal(false);
          fetchData(); // Tải lại dữ liệu
        } catch (err) {
          console.error(err);
          alert("Có lỗi khi Import dữ liệu.");
        }
      }
    });
  };

  const filteredVocabularies = useMemo(() => {
    return vocabularies.filter(v => {
      const matchSearch = v.hanzi.includes(searchTerm) || v.pinyin.toLowerCase().includes(searchTerm.toLowerCase()) || v.meaning.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLevel = filterLevel === 'All' || v.hsk_level.toString() === filterLevel;
      return matchSearch && matchLevel;
    }).sort((a, b) => a.nextReview - b.nextReview);
  }, [vocabularies, searchTerm, filterLevel]);

  const [formData, setFormData] = useState({
    hanzi: '',
    pinyin: '',
    meaning: '',
    hsk_level: 1,
    examples: ''
  });

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const { error } = await supabase.from('vocabularies').insert([{
        ...formData,
        user_id: user.id
      }]);
      if (error) throw error;
      alert("Thêm từ vựng thành công!");
      setFormData({ hanzi: '', pinyin: '', meaning: '', hsk_level: 1, examples: '' });
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi thêm từ vựng.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto">

      {/* SmartReview fullscreen mode */}
      {showSmartReview && (
        <SmartReview onClose={() => { setShowSmartReview(false); fetchData(); }} />
      )}

      {/* Session Complete Celebration */}
      <SessionComplete
        visible={showComplete}
        onClose={() => {
          setShowComplete(false);
          setSessionCards(0);
          setSessionExp(0);
        }}
        stats={{
          cardsReviewed: sessionCards,
          expGained: sessionExp,
          streak: profile?.streak || 0,
          newBadges,
        }}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute -left-10 -top-10 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Kho Từ Vựng <span className="text-indigo-600">Spaced Repetition</span></h2>
          <p className="text-slate-500 mt-1 font-medium">Học từ mới qua flashcard. AI sẽ nhắc bạn ôn tập đúng lúc.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto relative z-10 flex-wrap">
          {/* Smart Review Button */}
          {dueCount > 0 && (
            <button
              onClick={() => setShowSmartReview(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:opacity-90 transition-all shadow-md shadow-orange-200 font-bold"
            >
              <Zap className="w-5 h-5" />
              Ôn thông minh
              <span className="bg-white/25 text-white text-xs font-black px-2 py-0.5 rounded-full">{dueCount}</span>
            </button>
          )}

          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-md font-bold"
          >
            <Plus className="w-5 h-5" /> Thêm thẻ
          </button>
          
          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm từ vựng..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-100 transition-all font-medium outline-none" 
            />
          </div>
          <select 
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 border-none outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer font-medium"
          >
            <option value="All">Tất cả HSK</option>
            <option value="1">HSK 1</option>
            <option value="2">HSK 2</option>
            <option value="3">HSK 3</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-white rounded-3xl animate-pulse shadow-sm border border-slate-100"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVocabularies.map((v, index) => {
            const isDue = v.nextReview <= new Date().getTime();

            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={v.id} 
                className={`group relative bg-white rounded-3xl p-8 shadow-sm border hover:shadow-xl transition-all duration-500 overflow-hidden ${isDue ? 'border-orange-200 hover:shadow-orange-100' : 'border-slate-100 hover:shadow-indigo-100'}`}
              >
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl transition-colors ${isDue ? 'bg-orange-50 group-hover:bg-orange-100' : 'bg-indigo-50 group-hover:bg-indigo-100'}`}></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-lg shadow-sm">
                      HSK {v.hsk_level}
                    </span>
                    {isDue ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
                        <RotateCcw className="w-3 h-3" /> Cần ôn tập
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-md">
                        Đã thuộc
                      </span>
                    )}
                  </div>

                  <div className="text-center mb-8">
                    <h3 className="text-6xl font-black text-slate-800 mb-2 tracking-widest">{v.hanzi}</h3>
                    <p className="text-xl font-medium text-indigo-500 tracking-wide">{v.pinyin}</p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 text-center group-hover:bg-indigo-50 transition-colors">
                    <p className="text-slate-700 font-semibold text-lg">{v.meaning}</p>
                  </div>

                  {isDue ? (
                    <div className="mt-6 flex justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button onClick={() => handleReview(v.id, 0)} className="flex-1 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-500 hover:text-white transition-colors">Quên</button>
                      <button onClick={() => handleReview(v.id, 1)} className="flex-1 py-2 bg-orange-50 text-orange-600 text-sm font-bold rounded-xl hover:bg-orange-500 hover:text-white transition-colors">Khó</button>
                      <button onClick={() => handleReview(v.id, 2)} className="flex-1 py-2 bg-green-50 text-green-600 text-sm font-bold rounded-xl hover:bg-green-500 hover:text-white transition-colors">Dễ</button>
                    </div>
                  ) : (
                    <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={() => playAudio(v.hanzi)}
                        className="p-3 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                      {v.examples && (
                        <div className="text-xs font-medium text-slate-500 text-right">
                          VD: {v.examples}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm Thẻ / Import CSV */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800">
                <X className="w-6 h-6" />
              </button>
              
              <h3 className="text-2xl font-black text-slate-800 mb-6">Quản Lý Từ Vựng</h3>
              
              <div className="space-y-6">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Hán tự</label>
                      <input required value={formData.hanzi} onChange={e => setFormData({...formData, hanzi: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="你好" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Pinyin</label>
                      <input required value={formData.pinyin} onChange={e => setFormData({...formData, pinyin: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="nǐ hǎo" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nghĩa</label>
                    <input required value={formData.meaning} onChange={e => setFormData({...formData, meaning: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Xin chào" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Cấp độ HSK</label>
                      <select value={formData.hsk_level} onChange={e => setFormData({...formData, hsk_level: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none">
                        {[1,2,3,4,5,6].map(l => <option key={l} value={l}>HSK {l}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Ví dụ</label>
                      <input value={formData.examples} onChange={e => setFormData({...formData, examples: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="你好吗？" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md">
                    Thêm Từ Vựng
                  </button>
                </form>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-bold uppercase">Hoặc</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div 
                  className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl p-6 text-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                  onClick={() => fileInputRef.current.click()}
                >
                  <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                  <p className="font-bold text-indigo-700">Import từ file CSV</p>
                  <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
