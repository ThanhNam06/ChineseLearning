import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Loader2, Heart, Coffee, Star, Zap, ShieldCheck } from 'lucide-react';

export default function Admin() {
  const { user } = useSelector(state => state.auth);
  const [tab, setTab] = useState('donate');
  
  const [lessonForm, setLessonForm] = useState({
    title: '', type: 'listening', hsk_level: 1, topic: '',
    content: '', pinyin: '', translation: '', difficulty: 'Dễ', is_published: true
  });
  const [vocabForm, setVocabForm] = useState({
    hanzi: '', pinyin: '', meaning: '', hsk_level: 1, examples: ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleLessonSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    const { error } = await supabase.from('lessons').insert([lessonForm]);
    if (error) { setMsg('❌ Lỗi: ' + error.message); }
    else {
      setMsg('✅ Tuyệt vời! Bài học của bạn đã được đóng góp và xuất hiện trực tiếp trong Trung Tâm Học Tập.');
      setLessonForm({ title: '', type: 'listening', hsk_level: 1, topic: '', content: '', pinyin: '', translation: '', difficulty: 'Dễ', is_published: true });
    }
    setSaving(false);
  };

  const handleVocabSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    const { error } = await supabase.from('vocabularies').insert([{ ...vocabForm, user_id: user.id }]);
    if (error) { setMsg('❌ Lỗi: ' + error.message); }
    else {
      setMsg('✅ Tuyệt vời! Từ vựng đã được thêm trực tiếp vào kho dữ liệu Flashcard.');
      setVocabForm({ hanzi: '', pinyin: '', meaning: '', hsk_level: 1, examples: '' });
    }
    setSaving(false);
  };

  const inputCls = "w-full bg-white/70 border border-slate-200/60 p-4 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium transition-all";
  const labelCls = "text-[11px] font-black text-indigo-900/60 uppercase tracking-widest pl-1";

  const tabs = [
    { id: 'donate', label: 'Tài Trợ', icon: Heart },
    { id: 'lesson', label: 'Góp Bài Học', icon: BookOpen },
    { id: 'vocab', label: 'Thêm Từ Vựng', icon: Plus }
  ];

  const donationTiers = [
    {
      title: "Cà phê cho Dev",
      price: "50.000đ",
      icon: <Coffee className="w-8 h-8 text-amber-600" />,
      color: "from-amber-100 to-orange-100",
      desc: "Ủng hộ chi phí duy trì server hàng tháng."
    },
    {
      title: "Gói Premium",
      price: "200.000đ",
      icon: <Star className="w-8 h-8 text-indigo-600" />,
      color: "from-indigo-100 to-purple-100",
      desc: "Mở khóa giới hạn AI, nhận huy hiệu Độc Quyền."
    },
    {
      title: "Thẻ Chân Tiên",
      price: "500.000đ",
      icon: <Zap className="w-8 h-8 text-rose-600" />,
      color: "from-rose-100 to-pink-100",
      desc: "Ủng hộ phát triển tính năng mới & vinh danh trên BXH."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-indigo-900/5 border border-white/60 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-400/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="p-5 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-3xl shadow-inner relative z-10">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="text-center md:text-left relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-indigo-900 tracking-tight">Cộng Đồng & Đóng Góp</h2>
          <p className="text-slate-500 font-medium mt-2 text-lg">Cùng chung tay xây dựng nền tảng học tiếng Trung AI hàng đầu.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 justify-center md:justify-start overflow-x-auto pb-2 custom-scrollbar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setMsg(''); }}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${tab === t.id ? 'bg-slate-800 text-white shadow-lg shadow-slate-300 scale-105' : 'bg-white/60 backdrop-blur-md text-slate-600 border border-white hover:bg-white hover:shadow-md'}`}>
            <t.icon className={`w-5 h-5 ${tab === t.id ? 'text-indigo-400' : 'text-slate-400'}`} /> {t.label}
          </button>
        ))}
      </div>

      {/* Feedback Message */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`p-5 rounded-2xl font-bold text-sm shadow-sm backdrop-blur-md ${msg.startsWith('✅') ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-200/50' : 'bg-rose-50/90 text-rose-700 border border-rose-200/50'}`}>
            {msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forms Area */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-indigo-900/10 border border-white/80">
        
        {/* Donate Tab */}
        {tab === 'donate' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h3 className="text-2xl font-black text-slate-800 mb-2">Ủng hộ Dự án</h3>
              <p className="text-slate-500 font-medium">Nền tảng này được phát triển phi lợi nhuận. Sự hỗ trợ của bạn giúp chúng tôi duy trì server AI và phát triển thêm nhiều tính năng mới.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {donationTiers.map((tier, idx) => (
                <div key={idx} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center group cursor-pointer">
                  <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    {tier.icon}
                  </div>
                  <h4 className="text-xl font-black text-slate-800 mb-1">{tier.title}</h4>
                  <p className="text-2xl font-black text-indigo-600 mb-4">{tier.price}</p>
                  <p className="text-sm font-medium text-slate-500">{tier.desc}</p>
                  <button className="w-full mt-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors border border-slate-200">
                    Chọn gói này
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] p-10 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
              <h4 className="text-2xl font-black mb-2 relative z-10">Chuyển khoản trực tiếp</h4>
              <p className="font-medium text-indigo-100 mb-6 relative z-10">Nội dung CK: [Tên của bạn] + [Email đăng nhập]</p>
              <div className="inline-block bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 relative z-10 font-mono text-lg font-bold tracking-widest">
                0123 456 789 — Vietcombank
              </div>
            </div>
          </motion.div>
        )}

        {/* Lesson Form */}
        {tab === 'lesson' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <form onSubmit={handleLessonSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className={labelCls}>Tiêu đề bài học</label>
                  <input required value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className={inputCls} placeholder="VD: Chào hỏi cơ bản" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Loại Bài</label>
                  <select value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value})} className={inputCls}>
                    <option value="listening">🎧 Luyện nghe</option>
                    <option value="reading">📖 Luyện đọc</option>
                    <option value="grammar">📝 Ngữ pháp</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Cấp độ HSK</label>
                  <select value={lessonForm.hsk_level} onChange={e => setLessonForm({...lessonForm, hsk_level: parseInt(e.target.value)})} className={inputCls}>
                    {[1,2,3,4,5,6].map(l => <option key={l} value={l}>HSK {l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Chủ đề</label>
                  <input required value={lessonForm.topic} onChange={e => setLessonForm({...lessonForm, topic: e.target.value})} className={inputCls} placeholder="VD: Giao tiếp" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Độ khó</label>
                  <select value={lessonForm.difficulty} onChange={e => setLessonForm({...lessonForm, difficulty: e.target.value})} className={inputCls}>
                    <option>Dễ</option><option>Trung bình</option><option>Khó</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Nội dung tiếng Trung</label>
                <textarea required rows={4} value={lessonForm.content} onChange={e => setLessonForm({...lessonForm, content: e.target.value})} className={`${inputCls} resize-none`} placeholder="你好，很高兴认识你！" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>Pinyin</label>
                  <input value={lessonForm.pinyin} onChange={e => setLessonForm({...lessonForm, pinyin: e.target.value})} className={inputCls} placeholder="Nǐ hǎo..." />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Bản dịch</label>
                  <input value={lessonForm.translation} onChange={e => setLessonForm({...lessonForm, translation: e.target.value})} className={inputCls} placeholder="Xin chào..." />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-5 mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                Xác nhận Đóng Góp
              </button>
            </form>
          </motion.div>
        )}

        {/* Vocab Form */}
        {tab === 'vocab' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <form onSubmit={handleVocabSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>Hán tự</label>
                  <input required value={vocabForm.hanzi} onChange={e => setVocabForm({...vocabForm, hanzi: e.target.value})} className={inputCls} placeholder="你好" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Pinyin</label>
                  <input required value={vocabForm.pinyin} onChange={e => setVocabForm({...vocabForm, pinyin: e.target.value})} className={inputCls} placeholder="nǐ hǎo" />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Nghĩa tiếng Việt</label>
                <input required value={vocabForm.meaning} onChange={e => setVocabForm({...vocabForm, meaning: e.target.value})} className={inputCls} placeholder="Xin chào" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>Cấp độ HSK</label>
                  <select value={vocabForm.hsk_level} onChange={e => setVocabForm({...vocabForm, hsk_level: parseInt(e.target.value)})} className={inputCls}>
                    {[1,2,3,4,5,6].map(l => <option key={l} value={l}>HSK {l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Câu ví dụ</label>
                  <input value={vocabForm.examples} onChange={e => setVocabForm({...vocabForm, examples: e.target.value})} className={inputCls} placeholder="你好吗？" />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-5 mt-4 bg-slate-800 text-white rounded-2xl font-black text-lg hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                Thêm Từ Vựng Mới
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
