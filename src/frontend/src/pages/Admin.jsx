import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, BookOpen, Trash2, Loader2, CheckCircle } from 'lucide-react';

const ADMIN_EMAILS = ['admin@hoctiengtrung.com']; // Thêm email admin vào đây

export default function Admin() {
  const { user } = useSelector(state => state.auth);
  const [tab, setTab] = useState('lesson');
  const [lessonForm, setLessonForm] = useState({
    title: '', type: 'listening', hsk_level: 1, topic: '',
    content: '', pinyin: '', translation: '', difficulty: 'Dễ', is_published: true
  });
  const [vocabForm, setVocabForm] = useState({
    hanzi: '', pinyin: '', meaning: '', hsk_level: 1, examples: ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Bỏ qua kiểm tra admin cho demo — trong production hãy bật lại
  // if (!ADMIN_EMAILS.includes(user?.email)) return <Navigate to="/" replace />;

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

  const inputCls = "w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-medium";
  const labelCls = "text-xs font-bold text-slate-500 uppercase tracking-wider";

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><BookOpen className="w-8 h-8" /></div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Đóng Góp Nội Dung</h2>
          <p className="text-slate-500 font-medium mt-1">Cùng xây dựng thư viện bài học và từ vựng phong phú hơn cho cộng đồng.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ id: 'lesson', label: 'Tạo Bài Học', icon: BookOpen }, { id: 'vocab', label: 'Thêm Từ Vựng', icon: Plus }].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setMsg(''); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {msg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl font-medium text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {msg}
        </motion.div>
      )}

      {/* Lesson Form */}
      {tab === 'lesson' && (
        <form onSubmit={handleLessonSubmit} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className={labelCls}>Tiêu đề bài học</label>
              <input required value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className={inputCls} placeholder="VD: Chào hỏi cơ bản" />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Loại</label>
              <select value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value})} className={inputCls}>
                <option value="listening">🎧 Luyện nghe</option>
                <option value="reading">📖 Luyện đọc</option>
                <option value="grammar">📝 Ngữ pháp</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Cấp độ HSK</label>
              <select value={lessonForm.hsk_level} onChange={e => setLessonForm({...lessonForm, hsk_level: parseInt(e.target.value)})} className={inputCls}>
                {[1,2,3,4,5,6].map(l => <option key={l} value={l}>HSK {l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Chủ đề</label>
              <input required value={lessonForm.topic} onChange={e => setLessonForm({...lessonForm, topic: e.target.value})} className={inputCls} placeholder="VD: Giao tiếp" />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Độ khó</label>
              <select value={lessonForm.difficulty} onChange={e => setLessonForm({...lessonForm, difficulty: e.target.value})} className={inputCls}>
                <option>Dễ</option><option>Trung bình</option><option>Khó</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Nội dung tiếng Trung</label>
            <textarea required rows={3} value={lessonForm.content} onChange={e => setLessonForm({...lessonForm, content: e.target.value})} className={inputCls} placeholder="你好，很高兴认识你！" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Pinyin</label>
              <input value={lessonForm.pinyin} onChange={e => setLessonForm({...lessonForm, pinyin: e.target.value})} className={inputCls} placeholder="Nǐ hǎo..." />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Bản dịch</label>
              <input value={lessonForm.translation} onChange={e => setLessonForm({...lessonForm, translation: e.target.value})} className={inputCls} placeholder="Xin chào..." />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Thêm Bài Học
          </button>
        </form>
      )}

      {/* Vocab Form */}
      {tab === 'vocab' && (
        <form onSubmit={handleVocabSubmit} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Hán tự</label>
              <input required value={vocabForm.hanzi} onChange={e => setVocabForm({...vocabForm, hanzi: e.target.value})} className={inputCls} placeholder="你好" />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Pinyin</label>
              <input required value={vocabForm.pinyin} onChange={e => setVocabForm({...vocabForm, pinyin: e.target.value})} className={inputCls} placeholder="nǐ hǎo" />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Nghĩa</label>
            <input required value={vocabForm.meaning} onChange={e => setVocabForm({...vocabForm, meaning: e.target.value})} className={inputCls} placeholder="Xin chào" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Cấp độ HSK</label>
              <select value={vocabForm.hsk_level} onChange={e => setVocabForm({...vocabForm, hsk_level: parseInt(e.target.value)})} className={inputCls}>
                {[1,2,3,4,5,6].map(l => <option key={l} value={l}>HSK {l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Câu ví dụ</label>
              <input value={vocabForm.examples} onChange={e => setVocabForm({...vocabForm, examples: e.target.value})} className={inputCls} placeholder="你好吗？" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors shadow-lg flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Thêm Từ Vựng
          </button>
        </form>
      )}
    </div>
  );
}
