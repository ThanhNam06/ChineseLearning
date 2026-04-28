import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, PenTool, Mic, Trophy, Star, Flame, Award, ChevronRight, RotateCcw, GraduationCap, TrendingUp, Calendar } from 'lucide-react';

export default function Home() {
  const { user, profile } = useSelector(state => state.auth);
  const [dueCards, setDueCards] = useState([]);
  const [recentLessons, setRecentLessons] = useState([]);
  const [totalVocab, setTotalVocab] = useState(0);
  const [hskStats, setHskStats] = useState({});
  const [badgeCount, setBadgeCount] = useState(0);
  const [studyHistory, setStudyHistory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDashboardData = async () => {
      setLoading(true);

      // Fetch due vocabulary cards
      const now = new Date().toISOString();
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('vocabulary_id')
        .eq('user_id', user.id)
        .lte('next_review', now)
        .limit(6);

      if (progressData?.length > 0) {
        const vocabIds = progressData.map(p => p.vocabulary_id);
        const { data: vocabs } = await supabase.from('vocabularies').select('*').in('id', vocabIds);
        setDueCards(vocabs || []);
      }

      // Fetch study history for heatmap
      const { data: historyData } = await supabase
        .from('study_history')
        .select('study_date, exp_gained')
        .eq('user_id', user.id)
        .order('study_date', { ascending: false });
      
      const historyMap = {};
      historyData?.forEach(h => {
        historyMap[h.study_date] = h.exp_gained;
      });
      setStudyHistory(historyMap);

      const { data: vocabData, count } = await supabase.from('vocabularies').select('hsk_level', { count: 'exact' });
      setTotalVocab(count || 0);
      if (vocabData) {
        const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        vocabData.forEach(v => {
          stats[v.hsk_level] = (stats[v.hsk_level] || 0) + 1;
        });
        setHskStats(stats);
      }

      const { data: lessons } = await supabase.from('lessons').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(3);
      setRecentLessons(lessons || []);

      const { count: bCount } = await supabase.from('user_badges').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setBadgeCount(bCount || 0);

      setLoading(false);
    };
    fetchDashboardData();
  }, [user]);

  const heatmapData = (() => {
    const weeks = [];
    const today = new Date();
    for (let w = 6; w >= 0; w--) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dateStr = date.toISOString().split('T')[0];
        const exp = studyHistory[dateStr] || 0;
        const level = exp === 0 ? 0 : exp < 20 ? 1 : exp < 50 ? 2 : 3;
        week.push({ date, level, exp });
      }
      weeks.push(week);
    }
    return weeks;
  })();

  const heatColors = ['bg-slate-100', 'bg-green-200', 'bg-green-400', 'bg-green-600'];
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  })();

  const quickActions = [
    { label: 'Ôn từ vựng', icon: BookOpen, path: '/vocabulary', color: 'from-indigo-500 to-purple-600' },
    { label: 'Luyện viết', icon: PenTool, path: '/writing', color: 'from-orange-500 to-rose-500' },
    { label: 'Luyện nói', icon: Mic, path: '/speaking', color: 'from-emerald-500 to-teal-600' },
    { label: 'Học bài mới', icon: GraduationCap, path: '/learning', color: 'from-blue-500 to-cyan-500' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-100"
      >
        <div className="absolute inset-0 opacity-10">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
            className="absolute right-[-2rem] top-1/2 -translate-y-1/2 text-[10rem] md:text-[15rem] font-black leading-none select-none"
          >
            汉
          </motion.div>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex-1">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-black tracking-tight"
            >
              {greeting}, {profile?.username || user?.email?.split('@')[0]}! 👋
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/80 font-medium mt-2 text-base md:text-lg max-w-xl"
            >
              {dueCards.length > 0
                ? `Hôm nay bạn có ${dueCards.length} từ vựng cần ôn tập. Hãy dành 5 phút để ghi nhớ chúng nhé!`
                : 'Bạn đã hoàn thành tất cả mục tiêu ôn tập hôm nay. Tuyệt vời!'}
            </motion.p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/vocabulary" className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2">
                Bắt đầu học ngay <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4 w-full lg:w-auto">
            {[
              { label: 'EXP', value: (profile?.exp || 0).toLocaleString(), icon: Star, color: 'text-yellow-300' },
              { label: 'Streak', value: profile?.streak || 0, icon: Flame, color: 'text-orange-300' },
              { label: 'Huy hiệu', value: badgeCount, icon: Award, color: 'text-purple-300' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-5 text-center border border-white/20 shadow-inner">
                <stat.icon className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 fill-current ${stat.color}`} />
                <p className="text-xl md:text-2xl font-black">{stat.value}</p>
                <p className="text-[10px] md:text-xs text-white/70 font-bold uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quick Actions - Better Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {quickActions.map((action, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link to={action.path}
              className={`flex flex-col items-center gap-3 p-5 md:p-6 rounded-3xl bg-gradient-to-br ${action.color} text-white shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all group relative overflow-hidden`}>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <action.icon className="w-7 h-7 md:w-8 md:h-8 relative z-10 group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-xs md:text-sm relative z-10">{action.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Due Cards */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-500" /> Cần ôn tập
            </h3>
            <Link to="/vocabulary" className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-50 rounded-2xl animate-pulse"></div>)}
            </div>
          ) : dueCards.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {dueCards.map((card, i) => (
                <motion.div key={card.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center hover:bg-white hover:shadow-lg hover:border-indigo-100 transition-all cursor-pointer group">
                  <p className="text-3xl md:text-4xl font-black text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{card.hanzi}</p>
                  <p className="text-sm text-indigo-500 font-bold">{card.pinyin}</p>
                  <p className="text-xs text-slate-400 mt-1 font-medium truncate">{card.meaning}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-indigo-50/30 rounded-3xl border border-indigo-100 border-dashed">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Star className="w-8 h-8 text-indigo-500 fill-indigo-200" />
              </div>
              <p className="font-bold text-slate-800 text-lg">Hôm nay chưa có từ nào cần ôn!</p>
              <p className="text-slate-500 text-sm mt-1">Tiếp tục duy trì phong độ nhé.</p>
            </div>
          )}
        </div>

        {/* Heatmap Section - Responsive */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-indigo-500" /> Lịch sử học tập
          </h3>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex gap-1.5 justify-center mb-6">
              {heatmapData.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1.5">
                  {week.map((day, di) => (
                    <div key={di} className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-[3px] ${heatColors[day.level]} transition-all cursor-help hover:scale-110`}
                      title={`${day.date.toLocaleDateString('vi-VN')}: ${day.exp} EXP`}></div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Ít</span>
              <div className="flex gap-1">
                {heatColors.map((c, i) => <div key={i} className={`w-3 h-3 rounded-[2px] ${c}`}></div>)}
              </div>
              <span>Nhiều</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-slate-500 font-medium">Tổng từ vựng</span>
              </div>
              <span className="font-black text-slate-800">{totalVocab}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-500 font-medium">Bài học</span>
              </div>
              <span className="font-black text-slate-800">{recentLessons.length}</span>
            </div>
            
            {/* HSK Stats */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Phân bố từ vựng HSK</p>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map(level => {
                  const count = hskStats[level] || 0;
                  const percentage = totalVocab > 0 ? (count / totalVocab) * 100 : 0;
                  return count > 0 && (
                    <div key={level} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 w-10">HSK {level}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-slate-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Content */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Đề xuất cho bạn
          </h3>
          <Link to="/learning" className="text-sm font-bold text-indigo-600 hover:underline">Khám phá thêm</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentLessons.map((lesson, i) => (
            <motion.div 
              key={lesson.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to="/learning" 
                className="group block bg-slate-50 border border-slate-100 rounded-3xl p-6 hover:bg-white hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300">

              <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase mb-4 ${lesson.type === 'listening' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {lesson.type === 'listening' ? '🎧 Nghe' : '📖 Đọc'}
              </span>
              <h4 className="font-black text-slate-800 text-xl mb-2 group-hover:text-indigo-600 transition-colors leading-tight">{lesson.title}</h4>
              <div className="flex items-center justify-between text-sm text-slate-400 font-bold">
                <span>HSK {lesson.hsk_level}</span>
                <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                  Học ngay <ChevronRight className="w-4 h-4" />
                </span>
              </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
