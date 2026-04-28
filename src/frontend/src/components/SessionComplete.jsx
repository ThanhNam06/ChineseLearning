import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Flame, Zap, Award, Mic, GraduationCap, BookOpen, MessageSquare, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Pure CSS Confetti ────────────────────────────────────────────────────────
function Confetti() {
  const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316'];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    duration: `${1.5 + Math.random() * 1.5}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 360}deg`,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {pieces.map(p => (
        <div key={p.id} className="absolute top-0 animate-confetti rounded-sm"
          style={{ left: p.left, width: p.size, height: p.size, backgroundColor: p.color,
            animationDelay: p.delay, animationDuration: p.duration, transform: `rotate(${p.rotate})` }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
        .animate-confetti { animation: confetti-fall linear forwards; }
      `}</style>
    </div>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function Counter({ to, duration = 1200 }) {
  const ref = useRef(null);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(to / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, to);
      if (ref.current) ref.current.textContent = start.toLocaleString();
      if (start >= to) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [to, duration]);
  return <span ref={ref}>0</span>;
}

// ─── Next Steps Config ───────────────────────────────────────────────────────
const NEXT_STEPS = [
  {
    icon: Mic,
    label: 'Luyện phát âm',
    sublabel: 'Phát âm các từ vừa học',
    path: '/speaking',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-100',
  },
  {
    icon: MessageSquare,
    label: 'Chat với AI Tutor',
    sublabel: 'Dùng từ mới trong câu',
    path: '/tutor',
    gradient: 'from-indigo-500 to-purple-600',
    shadow: 'shadow-indigo-100',
  },
  {
    icon: GraduationCap,
    label: 'Xem bài học mới',
    sublabel: 'Mở rộng kiến thức',
    path: '/learning',
    gradient: 'from-blue-500 to-cyan-600',
    shadow: 'shadow-blue-100',
  },
  {
    icon: BookOpen,
    label: 'Tiếp tục ôn từ',
    sublabel: 'Ôn thêm từ vựng khác',
    path: null, // stays on current page
    gradient: 'from-orange-500 to-amber-500',
    shadow: 'shadow-orange-100',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * SessionComplete — Celebration modal.
 *
 * Props:
 *  visible     boolean
 *  onClose     () => void
 *  stats       { cardsReviewed, expGained, streak, newBadges[] }
 *  nextSteps   string[]  — subset of ['speaking','tutor','learning','vocab'] to highlight
 *                          defaults to all 4
 */
export default function SessionComplete({ visible, onClose, stats = {}, nextSteps }) {
  const navigate = useNavigate();
  const {
    cardsReviewed = 0,
    expGained = 0,
    streak = 0,
    newBadges = [],
  } = stats;

  const statItems = [
    { icon: Star,  label: 'Thẻ hoàn thành', value: cardsReviewed, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { icon: Zap,   label: 'EXP kiếm được',   value: expGained,    color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { icon: Flame, label: 'Chuỗi hiện tại',  value: streak,       color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  // Filter which next-step cards to show (default: all)
  const shownSteps = nextSteps
    ? NEXT_STEPS.filter(s => nextSteps.includes(s.path) || (s.path === null && nextSteps.includes('vocab')))
    : NEXT_STEPS;

  const handleNextStep = (path) => {
    onClose();
    if (path) setTimeout(() => navigate(path), 150);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-w-md w-full my-4"
          >
            <Confetti />

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="relative z-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-8 pt-12 pb-8 text-center text-white">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-7xl mb-3 select-none"
              >🎉</motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="text-3xl font-black tracking-tight"
              >Xuất sắc!</motion.h2>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-white/80 mt-2 font-medium"
              >Bạn vừa hoàn thành một buổi học tuyệt vời 🚀</motion.p>
            </div>

            {/* ── Stats ─────────────────────────────────────────────────── */}
            <div className="relative z-10 px-8 py-6 grid grid-cols-3 gap-4">
              {statItems.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }} className={`${s.bg} rounded-2xl p-4 text-center`}>
                  <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
                  <p className={`text-2xl font-black ${s.color}`}><Counter to={s.value} /></p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-tight">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* ── New Badges ────────────────────────────────────────────── */}
            {newBadges.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.7 }} className="relative z-10 px-8 pb-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" /> Huy hiệu mới mở khóa!
                </p>
                <div className="space-y-2">
                  {newBadges.map((badge, i) => (
                    <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-3">
                      <span className="text-2xl">{badge.icon}</span>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{badge.name}</p>
                        <p className="text-xs text-slate-500">{badge.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Next Steps ────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              className="relative z-10 px-8 pb-4"
            >
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" /> Tiếp theo bạn muốn làm gì?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {shownSteps.map((step, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.07 }}
                    onClick={() => handleNextStep(step.path)}
                    className={`group relative overflow-hidden bg-gradient-to-br ${step.gradient} ${step.shadow} shadow-lg rounded-2xl p-4 text-white text-left hover:opacity-90 active:scale-95 transition-all`}
                  >
                    <div className="absolute -right-3 -bottom-3 w-12 h-12 bg-white/10 rounded-full" />
                    <step.icon className="w-5 h-5 mb-2 opacity-90" />
                    <p className="font-black text-sm leading-tight">{step.label}</p>
                    <p className="text-[10px] text-white/70 font-medium mt-0.5">{step.sublabel}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* ── Skip ──────────────────────────────────────────────────── */}
            <div className="relative z-10 px-8 pb-8 pt-2">
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                onClick={onClose}
                className="w-full py-3 text-slate-400 hover:text-slate-700 text-sm font-bold transition-colors"
              >
                Bỏ qua, ở lại trang này
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
