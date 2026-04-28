import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSelector, useDispatch } from 'react-redux';
import { updateExp } from '../store/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Mic, Loader2, Trophy, User, Hash, Users, Star, LogOut, Shield, Volume2 } from 'lucide-react';
import { getSpeechProvider } from '../lib/aiProvider';
import { logStudyActivity } from '../lib/progress';

const CHALLENGE_SENTENCES = [
  { hanzi: "我想喝咖啡", pinyin: "wǒ xiǎng hē kā fēi" },
  { hanzi: "很高兴认识你", pinyin: "hěn gāo xìng rèn shi nǐ" },
  { hanzi: "今天天气很好", pinyin: "jīn tiān tiān qì hěn hǎo" },
  { hanzi: "你在做什么", pinyin: "nǐ zài zuò shén me" },
  { hanzi: "祝你生日快乐", pinyin: "zhù nǐ shēng rì kuài lè" },
];

export default function Battle() {
  const { user, profile } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  const [gameState, setGameState] = useState('lobby'); // lobby, searching, battling, results
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentSentence, setCurrentSentence] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [finalResults, setFinalResults] = useState([]);

  const speechProviderRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (speechProviderRef.current) speechProviderRef.current.stopRecording();
    };
  }, []);

  const joinRoom = async (code) => {
    const finalCode = code || Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(finalCode);
    setGameState('searching');

    const channel = supabase.channel(`battle_${finalCode}`, {
      config: { presence: { key: user.id } }
    });

    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const currentPlayers = Object.values(state).flat();
      setPlayers(currentPlayers);
      
      // Auto-start if it's a random search and we have 2-4 players
      if (!code && currentPlayers.length >= 2 && gameState === 'searching') {
         setTimeout(() => startBattle(currentPlayers), 2000);
      }
    });

    channel.on('broadcast', { event: 'start_game' }, (payload) => {
      setCurrentSentence(payload.payload.sentence);
      setGameState('battling');
      playAudio(payload.payload.sentence.hanzi);
    });

    channel.on('broadcast', { event: 'player_score' }, (payload) => {
      setPlayers(prev => prev.map(p => p.user_id === payload.payload.user_id ? { ...p, score: payload.payload.score } : p));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          username: profile?.username || 'Học viên',
          elo: profile?.elo_rating || 1200,
          status: 'waiting',
          score: null
        });
      }
    });
  };

  const startBattle = async (currentPlayers) => {
    if (gameState !== 'searching') return;
    const sentence = CHALLENGE_SENTENCES[Math.floor(Math.random() * CHALLENGE_SENTENCES.length)];
    await channelRef.current.send({
      type: 'broadcast',
      event: 'start_game',
      payload: { sentence }
    });
    setCurrentSentence(sentence);
    setGameState('battling');
    playAudio(sentence.hanzi);
  };

  const playAudio = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9; // Slightly slower for better clarity
    window.speechSynthesis.speak(utterance);
  };

  const handleRecording = async () => {
    if (isRecording) {
      speechProviderRef.current.stopRecording();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    speechProviderRef.current = getSpeechProvider('deepgram');
    let transcript = '';

    await speechProviderRef.current.startRecording(
      (text) => { transcript += text; },
      (error) => { console.error(error); setIsRecording(false); },
      () => { console.log('Mic on'); }
    );

    setTimeout(async () => {
      if (speechProviderRef.current) speechProviderRef.current.stopRecording();
      setIsRecording(false);
      setIsScoring(true);

      try {
        const { data, error } = await supabase.functions.invoke('ai-score', {
          body: { transcript, targetText: currentSentence.hanzi }
        });

        if (error) throw error;
        
        setFeedback(data);
        
        // Broadcast score to other players
        await channelRef.current.send({
          type: 'broadcast',
          event: 'player_score',
          payload: { user_id: user.id, score: data.score }
        });

        // Check if all players have scores
        // We wait a bit to collect all
        setTimeout(() => checkResults(), 3000);

      } catch (err) {
        console.error('Scoring error:', err);
      } finally {
        setIsScoring(false);
      }
    }, 4000);
  };

  const checkResults = () => {
    setGameState('results');
    setPlayers(current => {
      const sorted = [...current].sort((a, b) => (b.score || 0) - (a.score || 0));
      setFinalResults(sorted);
      
      // Update Elo if winner
      if (sorted[0]?.user_id === user.id && sorted.length > 1) {
        updateElo(25);
      } else if (sorted[sorted.length-1]?.user_id === user.id && sorted.length > 1) {
        updateElo(-15);
      }
      
      return current;
    });
  };

  const updateElo = async (change) => {
    const newElo = (profile?.elo_rating || 1200) + change;
    const { error } = await supabase
      .from('profiles')
      .update({ elo_rating: newElo })
      .eq('id', user.id);
    
    if (!error) {
      dispatch(updateExp(change > 0 ? 50 : 10));
      await logStudyActivity(user.id, change > 0 ? 50 : 10, 0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700 p-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 p-6 md:p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <Swords size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <Swords className="w-10 h-10 md:w-14 md:h-14" /> Đấu Trường Hán Tự
          </h2>
          <p className="mt-4 text-white/80 font-medium text-lg max-w-2xl">
            Thách đấu 1-1 hoặc Battle Royale 4 người. So tài phát âm chuẩn để thăng hạng Elo và nhận thưởng EXP khổng lồ!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 md:p-10 flex flex-col items-center justify-center min-h-[500px]">
          <AnimatePresence mode="wait">
            {gameState === 'lobby' && (
              <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 w-full max-w-md">
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => joinRoom()} className="p-8 bg-indigo-50 border-2 border-indigo-100 rounded-3xl hover:border-indigo-400 transition-all group">
                    <Users className="w-12 h-12 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl font-black text-slate-800">Tìm Trận Ngẫu Nhiên</h3>
                    <p className="text-slate-500 text-sm mt-1">Ghép cặp tự động (2-4 người)</p>
                  </button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold">Hoặc dùng mã phòng</span></div>
                  </div>

                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Mã phòng..." 
                      className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 font-bold text-slate-800 focus:border-rose-400 outline-none uppercase"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    />
                    <button 
                      onClick={() => joinRoom(roomCode)}
                      className="px-6 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-100 transition-all flex items-center gap-2"
                    >
                      <Hash className="w-5 h-5" /> Tham gia
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {gameState === 'searching' && (
              <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
                <div className="relative">
                  <Loader2 className="w-20 h-20 text-indigo-500 animate-spin mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-600">{players.length}/4</div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Đang đợi chiến hữu...</h3>
                  <p className="text-slate-500 mt-2">Mã phòng: <span className="font-black text-rose-500 tracking-widest">{roomCode}</span></p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  {players.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-bold text-slate-700">{p.username}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {gameState === 'battling' && currentSentence && (
              <motion.div key="battling" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full space-y-8">
                <div className="text-center">
                   <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-100 text-rose-600 rounded-lg text-xs font-black uppercase tracking-widest mb-4">
                     <Volume2 className="w-4 h-4" /> Thử thách: Nhại lại AI
                   </div>
                   <h3 className="text-6xl md:text-8xl font-black text-slate-800 mb-4 tracking-tighter">{currentSentence.hanzi}</h3>
                   <p className="text-2xl md:text-3xl text-indigo-500 font-medium mb-6">{currentSentence.pinyin}</p>
                   
                   <button 
                     onClick={() => playAudio(currentSentence.hanzi)}
                     className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-2"
                   >
                     <Volume2 className="w-4 h-4" /> Nghe lại
                   </button>
                </div>

                <div className="flex flex-col items-center gap-6">
                  {feedback ? (
                    <div className="w-full bg-green-50 border-2 border-green-100 rounded-[2rem] p-6 text-center animate-in zoom-in duration-500">
                      <div className="text-4xl font-black text-green-600 mb-2">{feedback.score}đ</div>
                      <p className="font-bold text-slate-700">{feedback.feedback}</p>
                      <p className="text-sm text-slate-400 mt-2 italic">{feedback.corrections}</p>
                    </div>
                  ) : (
                    <button 
                      onMouseDown={handleRecording}
                      className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 scale-110 shadow-2xl shadow-rose-200' : isScoring ? 'bg-slate-200 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100'}`}
                      disabled={isScoring}
                    >
                      {isScoring ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : <Mic className={`w-10 h-10 md:w-14 md:h-14 text-white ${isRecording ? 'animate-pulse' : ''}`} />}
                    </button>
                  )}
                  <p className="font-bold text-slate-400">{isRecording ? 'Thả để chấm điểm...' : isScoring ? 'AI đang phân tích...' : feedback ? 'Đã nộp bài!' : 'Nhấn giữ để nói'}</p>
                </div>
              </motion.div>
            )}

            {gameState === 'results' && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-8">
                 <div className="text-center">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-3xl font-black text-slate-800">Kết Quả Chung Cuộc</h3>
                 </div>
                 
                 <div className="space-y-3">
                   {finalResults.map((p, i) => (
                     <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border-2 ${p.user_id === user.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-50 bg-slate-50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white ${i === 0 ? 'bg-yellow-400' : 'bg-slate-300'}`}>{i + 1}</div>
                          <span className="font-black text-slate-700">{p.username}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="font-black text-indigo-600 text-xl">{p.score || 0}đ</span>
                          <span className="text-xs font-bold text-slate-400 px-3 py-1 bg-white rounded-lg">Elo: {p.elo}</span>
                        </div>
                     </div>
                   ))}
                 </div>

                 <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-800 hover:bg-black text-white rounded-2xl font-black transition-all">
                    Quay lại sảnh chờ
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar: Current Players & Stats */}
        <div className="space-y-6">
           <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-yellow-500" /> Hồ sơ chiến thần
              </h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <User className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-lg">{profile?.username}</p>
                  <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest">Rank: Cao Thủ</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-black text-slate-800">{profile?.elo_rating || 1200}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Elo hiện tại</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-black text-slate-800">{profile?.streak || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Chuỗi thắng</p>
                </div>
              </div>
           </div>

           <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-rose-500" /> Danh sách chờ ({players.length})
              </h3>
              <div className="space-y-4">
                 {players.length === 0 && <p className="text-sm text-slate-400 italic">Chưa có ai tham gia...</p>}
                 {players.map((p, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500">{p.username[0]}</div>
                        <span className="text-sm font-bold text-slate-700">{p.username}</span>
                      </div>
                      <span className="text-[10px] font-black text-indigo-500">Elo: {p.elo}</span>
                   </div>
                 ))}
              </div>
           </div>

           <button onClick={() => setGameState('lobby')} className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all flex items-center justify-center gap-2">
              <LogOut className="w-5 h-5" /> Rời phòng
           </button>
        </div>
      </div>
    </div>
  );
}
