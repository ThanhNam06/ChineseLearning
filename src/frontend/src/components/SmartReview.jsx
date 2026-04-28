import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, ChevronLeft, RotateCcw, Zap, Frown, Meh, Smile } from 'lucide-react';
import SessionComplete from './SessionComplete';
import { supabase } from '../lib/supabase';
import { useSelector, useDispatch } from 'react-redux';
import { updateExp } from '../store/authSlice';
import { logStudyActivity } from '../lib/progress';

/**
 * SmartReview — Fullscreen flashcard mode
 * Automatically fetches due cards and lets the user review them one by one.
 *
 * Props:
 *  onClose  () => void   — Called when user exits the mode
 */
export default function SmartReview({ onClose }) {
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(null); // 'forgot' | 'hard' | 'easy'
  const [sessionStats, setSessionStats] = useState({ cards: 0, exp: 0 });
  const [showComplete, setShowComplete] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const [exitDir, setExitDir] = useState(1); // 1 = swipe left, -1 = back

  const dispatch = useDispatch();
  const { user, profile } = useSelector(s => s.auth);

  // Load all due cards
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const now = new Date().toISOString();

      const { data: progress } = await supabase
        .from('user_progress')
        .select('vocabulary_id')
        .eq('user_id', user.id)
        .lte('next_review', now);

      if (!progress?.length) {
        setCards([]);
        setLoading(false);
        return;
      }

      const ids = progress.map(p => p.vocabulary_id);
      const { data: vocabs } = await supabase
        .from('vocabularies')
        .select('*')
        .in('id', ids);

      // Shuffle for variety
      const shuffled = (vocabs || []).sort(() => Math.random() - 0.5);
      setCards(shuffled);
      setLoading(false);
    };
    load();
  }, [user]);

  const current = cards[index];
  const progress = cards.length > 0 ? ((index) / cards.length) * 100 : 0;

  const playAudio = () => {
    if (!current) return;
    const u = new SpeechSynthesisUtterance(current.hanzi);
    u.lang = 'zh-CN';
    window.speechSynthesis.speak(u);
  };

  const submitRating = useCallback(async (quality) => {
    if (!current || !user) return;
    setRating(quality === 0 ? 'forgot' : quality === 1 ? 'hard' : 'easy');

    // Call SRS edge function
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/srs-calculate-review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ vocabulary_id: current.id, quality }),
        }
      );
    } catch { /* non-blocking */ }

    // EXP
    const expGained = quality === 2 ? 15 : quality === 1 ? 5 : 0;
    if (expGained > 0 && profile) {
      dispatch(updateExp(expGained));
      await logStudyActivity(user.id, expGained, 1);
    }

    const newStats = { cards: sessionStats.cards + 1, exp: sessionStats.exp + expGained };
    setSessionStats(newStats);

    // Advance to next card after short delay
    setTimeout(() => {
      setRating(null);
      setFlipped(false);
      setExitDir(1);

      if (index + 1 >= cards.length) {
        // Session done — check badges and show celebration
        supabase
          .from('user_badges')
          .select('badges(name, icon, description)')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false })
          .limit(3)
          .then(({ data }) => {
            setNewBadges((data || []).map(b => b.badges).filter(Boolean));
            setShowComplete(true);
          });
      } else {
        setIndex(i => i + 1);
      }
    }, 500);
  }, [current, index, cards.length, user, profile, sessionStats, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (showComplete) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
      if (flipped) {
        if (e.key === '1') submitRating(0);
        if (e.key === '2') submitRating(1);
        if (e.key === '3') submitRating(2);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, showComplete, submitRating]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!loading && cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-950 to-slate-900 flex flex-col items-center justify-center text-white p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-8xl mb-6">🎊</div>
          <h2 className="text-3xl font-black mb-3">Hôm nay xong rồi!</h2>
          <p className="text-white/60 mb-8 text-lg">Không có thẻ nào đến hạn hôm nay. Hãy quay lại vào ngày mai.</p>
          <button onClick={onClose} className="px-8 py-4 bg-white text-indigo-700 rounded-2xl font-black hover:bg-indigo-50 transition-colors shadow-xl">
            Quay lại
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Session Complete Modal */}
      <SessionComplete
        visible={showComplete}
        onClose={() => { setShowComplete(false); onClose(); }}
        stats={{ cardsReviewed: sessionStats.cards, expGained: sessionStats.exp, streak: profile?.streak || 0, newBadges }}
      />

      <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="text-center">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Ôn tập thông minh</p>
            {!loading && (
              <p className="text-white font-black text-sm mt-0.5">
                {Math.min(index + 1, cards.length)} / {cards.length} thẻ
              </p>
            )}
          </div>
          <button onClick={playAudio} className="p-2 text-white/50 hover:text-white transition-colors">
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {/* ── Progress Bar ──────────────────────────────────────────────────── */}
        <div className="h-1.5 bg-white/10 mx-6 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* ── Card ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {loading ? (
            <div className="w-16 h-16 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ x: exitDir * 300, opacity: 0, scale: 0.95 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: -exitDir * 300, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                className="w-full max-w-md"
              >
                {/* Flip Card */}
                <div
                  className="cursor-pointer select-none"
                  style={{ perspective: '1200px' }}
                  onClick={() => !rating && setFlipped(f => !f)}
                >
                  <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    style={{ transformStyle: 'preserve-3d', position: 'relative', height: '340px' }}
                  >
                    {/* Front */}
                    <div style={{ backfaceVisibility: 'hidden' }}
                      className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] flex flex-col items-center justify-center p-10 shadow-2xl"
                    >
                      <span className="text-xs font-black text-white/40 uppercase tracking-widest mb-6">
                        HSK {current?.hsk_level}
                      </span>
                      <p className="text-8xl font-black text-white tracking-widest mb-4">
                        {current?.hanzi}
                      </p>
                      <p className="text-2xl text-indigo-300 font-medium">{current?.pinyin}</p>
                      <p className="text-white/40 text-sm font-bold mt-8 flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" /> Nhấn để xem nghĩa
                      </p>
                    </div>

                    {/* Back */}
                    <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      className="absolute inset-0 bg-gradient-to-br from-indigo-600/80 to-purple-700/80 backdrop-blur-xl border border-white/20 rounded-[2.5rem] flex flex-col items-center justify-center p-10 shadow-2xl"
                    >
                      <p className="text-5xl font-black text-white mb-4 tracking-widest">{current?.hanzi}</p>
                      <p className="text-xl text-indigo-200 font-medium mb-6">{current?.pinyin}</p>
                      <div className="bg-white/15 rounded-2xl px-8 py-4 text-center mb-6">
                        <p className="text-2xl font-black text-white">{current?.meaning}</p>
                      </div>
                      {current?.examples && (
                        <p className="text-white/60 text-sm text-center italic">"{current.examples}"</p>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* ── Rating Buttons ─────────────────────────────────────── */}
                <AnimatePresence>
                  {flipped && !rating && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 grid grid-cols-3 gap-4"
                    >
                      {[
                        { label: 'Quên', sublabel: '[1]', quality: 0, icon: Frown, color: 'from-red-500 to-rose-600', shadow: 'shadow-red-900/40' },
                        { label: 'Khó', sublabel: '[2]', quality: 1, icon: Meh, color: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-900/40' },
                        { label: 'Dễ', sublabel: '[3]', quality: 2, icon: Smile, color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-900/40' },
                      ].map((btn, i) => (
                        <motion.button
                          key={btn.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          onClick={() => submitRating(btn.quality)}
                          className={`bg-gradient-to-br ${btn.color} ${btn.shadow} shadow-lg rounded-2xl py-4 flex flex-col items-center gap-1 text-white font-black active:scale-95 transition-transform`}
                        >
                          <btn.icon className="w-6 h-6" />
                          <span className="text-base">{btn.label}</span>
                          <span className="text-[10px] text-white/60">{btn.sublabel}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rated feedback overlay */}
                <AnimatePresence>
                  {rating && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-6 flex justify-center"
                    >
                      <span className={`px-8 py-3 rounded-2xl font-black text-lg ${
                        rating === 'easy' ? 'bg-emerald-500/30 text-emerald-300' :
                        rating === 'hard' ? 'bg-orange-500/30 text-orange-300' :
                        'bg-red-500/30 text-red-300'
                      }`}>
                        {rating === 'easy' ? '✅ +15 EXP' : rating === 'hard' ? '💪 +5 EXP' : '😅 Ghi nhớ thêm'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* ── Footer hint ───────────────────────────────────────────────────── */}
        {!loading && (
          <div className="px-6 pb-8 text-center">
            <p className="text-white/30 text-xs font-bold">
              Space/Enter: lật thẻ &nbsp;·&nbsp; 1 Quên &nbsp;·&nbsp; 2 Khó &nbsp;·&nbsp; 3 Dễ
            </p>
          </div>
        )}
      </div>
    </>
  );
}
