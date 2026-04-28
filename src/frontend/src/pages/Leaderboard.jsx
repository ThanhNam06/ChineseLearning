import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Star, RefreshCw, Swords, Medal, UserPlus, Clock, Check, Heart, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';
import { getRankInfo } from '../lib/ranks';

// Inline spinner to avoid any bundle caching issues with Loader2
const Spinner = () => (
  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
);

const MEDAL = {
  1: { icon: '🥇', color: 'from-yellow-400 to-amber-500', border: 'border-yellow-300', bg: 'bg-yellow-50' },
  2: { icon: '🥈', color: 'from-slate-400 to-slate-500', border: 'border-slate-300', bg: 'bg-slate-50' },
  3: { icon: '🥉', color: 'from-orange-400 to-amber-600', border: 'border-orange-300', bg: 'bg-orange-50' },
};

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exp'); // 'exp' | 'elo' | 'co-learning'
  const [friendStatuses, setFriendStatuses] = useState({});
  
  const { user } = useSelector(state => state.auth);

  const fetchLeaders = async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').or('is_anonymous.eq.false,is_anonymous.is.null');
    
    if (activeTab === 'exp') {
      query = query.order('exp', { ascending: false });
    } else if (activeTab === 'elo') {
      query = query.order('elo_rating', { ascending: false });
    } else if (activeTab === 'sponsors') {
      query = query.eq('is_sponsor', true).order('exp', { ascending: false });
    }

    const { data, error } = await query.limit(20);

    if (!error && data) {
      setLeaders(data);
      if (user) {
        // Fetch friend statuses for these leaders
        const leaderIds = data.map(d => d.id);
        const { data: rels } = await supabase.from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        
        const statusMap = {};
        rels?.forEach(rel => {
          const otherId = rel.sender_id === user.id ? rel.receiver_id : rel.sender_id;
          statusMap[otherId] = rel.status; // 'pending' or 'accepted'
        });
        setFriendStatuses(statusMap);
      }
    }
    setLoading(false);
  };

  const handleAddFriend = async (receiverId) => {
    if (!user) return alert("Vui lòng đăng nhập");
    setFriendStatuses(prev => ({ ...prev, [receiverId]: 'pending' }));
    await supabase.from('friend_requests').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending'
    });
  };

  useEffect(() => {
    fetchLeaders();
  }, [activeTab]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-800 flex items-center gap-4">
            <Trophy className="w-10 h-10 text-yellow-500" /> Bảng Vinh Danh
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Nơi hội tụ những chiến thần Hán tự xuất sắc nhất.</p>
        </div>
        <button onClick={fetchLeaders} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <RefreshCw className={`w-6 h-6 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'exp', label: 'Bậc Thầy EXP', icon: Star },
          { id: 'elo', label: 'Chiến Thần Elo', icon: Swords },
          { id: 'sponsors', label: 'Nhà Tài Trợ', icon: Heart },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === id ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Featured Sponsors (Vinh Danh) */}
      {activeTab === 'sponsors' && (
        <div className="bg-gradient-to-br from-rose-500 via-pink-600 to-indigo-700 rounded-[3rem] p-1 relative overflow-hidden shadow-2xl">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.8rem] p-8 md:p-12">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Sparkles size={120} />
            </div>
            <div className="relative z-10 text-center space-y-4">
              <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                <Medal className="w-4 h-4" /> Bảng Vàng Vinh Danh
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Cảm ơn những Chân Tiên</h3>
              <p className="text-slate-500 max-w-xl mx-auto font-medium">
                Những người đã góp phần duy trì và phát triển nền tảng học tiếng Trung AI. Sự đồng hành của các bạn là động lực lớn nhất của chúng tôi.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                {leaders.length > 0 ? leaders.map(leader => (
                  <div key={leader.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-3 group hover:bg-white hover:shadow-xl transition-all">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 p-0.5 shadow-lg group-hover:rotate-6 transition-transform">
                      <div className="w-full h-full bg-white rounded-[0.9rem] flex items-center justify-center text-xl font-black">
                        {leader.avatar_url ? <img src={leader.avatar_url} className="w-full h-full object-cover rounded-[0.9rem]" /> : leader.username?.[0] || '?'}
                      </div>
                    </div>
                    <p className="font-black text-slate-800 text-sm truncate w-full text-center">{leader.username || 'Sponsor'}</p>
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Thẻ Chân Tiên</span>
                  </div>
                )) : (
                  <div className="col-span-full py-10 text-slate-400 font-bold italic">Đang chờ những vị Chân Tiên đầu tiên...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Top 3 Podium */}
          {!loading && leaders.length >= 3 && activeTab !== 'sponsors' && (
            <div className="grid grid-cols-3 gap-6 pt-10 pb-6">
              {[leaders[1], leaders[0], leaders[2]].map((leader, i) => {
                const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                const medal = MEDAL[rank];
                return (
                  <div key={leader.id} className={`flex flex-col items-center ${i === 1 ? '-mt-8 scale-110' : ''}`}>
                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-gradient-to-br ${medal.color} p-1 mb-4 shadow-2xl`}>
                      <div className="w-full h-full bg-white rounded-[1.8rem] flex items-center justify-center text-3xl font-black text-slate-800">
                        {leader.username?.[0] || leader.email?.[0]?.toUpperCase()}
                      </div>
                    </div>
                    <p className="font-black text-slate-800 text-center truncate w-full px-2">{leader.username || 'Học viên ẩn danh'}</p>
                    <p className="text-sm font-bold text-indigo-600">{activeTab === 'exp' ? `${leader.exp?.toLocaleString()} EXP` : `${leader.elo_rating || 1200} Elo`}</p>
                    <div className={`mt-4 px-4 py-1.5 rounded-full ${medal.bg} ${medal.border} border text-2xl`}>{medal.icon}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full List */}
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden">
            {loading ? (
              <div className="p-20 text-center"><Spinner /></div>
            ) : (
              leaders.map((leader, index) => (
                <motion.div
                  key={leader.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`flex items-center justify-between p-6 border-b border-slate-50 last:border-0 ${leader.id === user?.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-xl font-black text-slate-300 w-8">#{index + 1}</span>
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-600 text-lg overflow-hidden">
                      {leader.avatar_url ? <img src={leader.avatar_url} className="w-full h-full object-cover"/> : leader.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-black text-slate-800">{leader.username || 'Người dùng'} {leader.id === user?.id && <span className="text-xs text-indigo-500 ml-2 font-bold">(Bạn)</span>}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                          {getRankInfo(leader.exp || 0).currentRank.name}
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" /> Chuỗi {leader.streak || 0} ngày
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {leader.id !== user?.id && (
                      <div className="hidden md:block">
                        {!friendStatuses[leader.id] ? (
                          <button onClick={() => handleAddFriend(leader.id)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors">
                            <UserPlus className="w-3.5 h-3.5" /> Kết bạn
                          </button>
                        ) : friendStatuses[leader.id] === 'pending' ? (
                          <span className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" /> Chờ xác nhận
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-xl text-xs font-bold">
                            <Check className="w-3.5 h-3.5" /> Bạn bè
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-xl font-black text-indigo-600">{activeTab === 'exp' ? leader.exp?.toLocaleString() : leader.elo_rating || 1200}</p>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{activeTab === 'exp' ? 'EXP' : 'Elo'}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
