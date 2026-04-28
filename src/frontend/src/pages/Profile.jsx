import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSelector, useDispatch } from 'react-redux';
import { setProfile } from '../store/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Save, Star, Flame, Award, Loader2, EyeOff, Eye, UserPlus, Users, Palette, Moon, Sun } from 'lucide-react';

export default function Profile() {
  const dispatch = useDispatch();
  const { user, profile } = useSelector(state => state.auth);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [badges, setBadges] = useState([]);
  const [userBadgeIds, setUserBadgeIds] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');
  const [pattern, setPattern] = useState(localStorage.getItem('app-pattern') || 'cubes');
  const fileInputRef = useRef();

  useEffect(() => {
    if (profile && username === '') { // Only set on initial load to avoid resets
      setUsername(profile.username || ''); 
      setAvatarUrl(profile.avatar_url || ''); 
      setIsAnonymous(profile.is_anonymous || false);
    }
  }, [profile, username]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-pattern', pattern);
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-pattern', pattern);
  }, [theme, pattern]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: allBadges }, { data: myBadges }, { data: friends }] = await Promise.all([
        supabase.from('badges').select('*').order('exp_required'),
        supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
        supabase.from('friend_requests').select('*, sender:profiles!sender_id(username, avatar_url)').eq('receiver_id', user.id).eq('status', 'pending')
      ]);
      if (allBadges) setBadges(allBadges);
      if (myBadges) setUserBadgeIds(myBadges.map(b => b.badge_id));
      if (friends) setFriendRequests(friends);

      // Auto-award eligible badges
      if (allBadges && profile) {
        const myBadgeIdsSet = new Set(myBadges?.map(b => b.badge_id) || []);
        const toAward = allBadges.filter(b =>
          !myBadgeIdsSet.has(b.id) &&
          (profile.exp || 0) >= b.exp_required &&
          (profile.streak || 0) >= b.streak_required
        );
        if (toAward.length > 0) {
          await supabase.from('user_badges').insert(toAward.map(b => ({ user_id: user.id, badge_id: b.id })));
          setUserBadgeIds(prev => [...prev, ...toAward.map(b => b.id)]);
        }
      }
    };
    fetchData();
  }, [user, profile]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch (err) { alert('Lỗi khi tải ảnh lên.'); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates = { username, avatar_url: avatarUrl, is_anonymous: isAnonymous };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      dispatch(setProfile({ ...profile, ...updates }));
      alert('Cập nhật hồ sơ thành công!');
    } catch (err) { alert('Lỗi khi lưu.'); }
    finally { setSaving(false); }
  };

  const handleToggleAnonymous = async () => {
    const newVal = !isAnonymous;
    setIsAnonymous(newVal);
    if (user) {
      const updates = { is_anonymous: newVal };
      await supabase.from('profiles').update(updates).eq('id', user.id);
      dispatch(setProfile({ ...profile, ...updates }));
    }
  };

  const handleAcceptFriend = async (requestId) => {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const badgeProgress = (badge) => {
    if (badge.exp_required > 0) return Math.min(100, Math.floor(((profile?.exp || 0) / badge.exp_required) * 100));
    if (badge.streak_required > 0) return Math.min(100, Math.floor(((profile?.streak || 0) / badge.streak_required) * 100));
    return 100;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 p-4">
      
      {/* 1. Header: The Ultimate Glassmorphism Profile Card */}
      <div className="relative rounded-[3rem] overflow-hidden shadow-2xl bg-white/70 backdrop-blur-3xl border border-white">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center md:items-center gap-8 md:gap-12">
          
          {/* Avatar Area */}
          <div className="relative group shrink-0">
            <div className="w-36 h-36 md:w-48 md:h-48 rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center relative transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> :
                <span className="text-7xl font-black text-indigo-300 uppercase">{(profile?.username || user?.email || 'U')[0]}</span>}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current.click()}>
                <Camera className="w-12 h-12 text-white" />
              </div>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
            
            {/* Online Status Dot */}
            <div className="absolute bottom-4 right-4 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
          </div>
          
          {/* Info Area */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder={user?.email?.split('@')[0] || 'Tên hiển thị'}
              className="text-4xl md:text-5xl font-black text-slate-800 bg-transparent focus:bg-white/50 hover:bg-white/30 rounded-2xl px-4 py-2 -ml-4 outline-none w-full max-w-xl transition-all" />
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 px-1 mt-2">
              <span className="font-bold text-sm tracking-widest uppercase bg-slate-100/50 px-3 py-1 rounded-full">{user?.email}</span>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-6">
              {[
                { label: 'EXP', value: (profile?.exp || 0).toLocaleString(), icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                { label: 'Chuỗi', value: `${profile?.streak || 0} ngày`, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100' },
                { label: 'Huy hiệu', value: `${userBadgeIds.length}`, icon: Award, color: 'text-purple-600', bg: 'bg-purple-100' },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/60 shadow-sm border border-white/50 backdrop-blur-md transition-all hover:scale-105 hover:shadow-md cursor-default`}>
                  <div className={`p-2 rounded-xl ${s.bg}`}>
                    <s.icon className={`w-5 h-5 ${s.color} ${s.color.includes('yellow') || s.color.includes('orange') ? 'fill-current' : ''}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none mb-1">{s.label}</p>
                    <p className="text-lg font-black text-slate-800 leading-none">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full md:w-auto shrink-0 mt-6 md:mt-0">
            <button 
              onClick={handleToggleAnonymous}
              className={`group flex items-center justify-between gap-4 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg border-2 ${
                isAnonymous 
                ? 'bg-slate-900 text-white border-slate-800 shadow-slate-900/30 hover:bg-slate-800' 
                : 'bg-white text-indigo-600 border-white hover:border-indigo-100 shadow-indigo-100/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {isAnonymous ? <EyeOff className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" /> : <Eye className="w-6 h-6 text-indigo-400 group-hover:text-indigo-600 transition-colors" />}
                <div className="text-left leading-tight">
                  <span className="block text-sm">{isAnonymous ? 'Đang Ẩn Danh' : 'Công Khai'}</span>
                  <span className="block text-[10px] font-medium opacity-70">{isAnonymous ? 'Bảng xếp hạng: Tắt' : 'Bảng xếp hạng: Bật'}</span>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isAnonymous ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAnonymous ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </button>

            <button onClick={handleSave} disabled={saving} 
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl shadow-indigo-200 hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              <span>LƯU HỒ SƠ</span>
            </button>
          </div>
          
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Friend Requests Widget */}
          <AnimatePresence>
            {friendRequests.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-orange-100 shadow-xl overflow-hidden p-6 relative">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-400"></div>
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" /> Lời mời kết bạn mới <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs">{friendRequests.length}</span>
                </h3>
                <div className="space-y-3">
                  {friendRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <img src={req.sender?.avatar_url || `https://ui-avatars.com/api/?name=${req.sender?.username || 'U'}`} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100" />
                        <span className="font-bold text-slate-700 text-sm">{req.sender?.username}</span>
                      </div>
                      <button onClick={() => handleAcceptFriend(req.id)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors">
                        Chấp nhận
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ultimate Theme Settings Widget */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white overflow-hidden">
            <div className="p-6 md:p-8">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Palette className="w-5 h-5" /></div>
                Cài đặt Giao diện
              </h3>
              
              <div className="space-y-8">
                {/* Theme Mode */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Chế độ Hiển thị</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', icon: Sun, label: 'Sáng', color: 'bg-white', text: 'text-slate-800', border: 'border-slate-200' },
                      { id: 'dark', icon: Moon, label: 'Tối', color: 'bg-slate-900', text: 'text-white', border: 'border-slate-700' },
                      { id: 'spring', icon: Star, label: 'Mùa Xuân', color: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' }
                    ].map(t => (
                      <button key={t.id} onClick={() => setTheme(t.id)} className={`group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all overflow-hidden ${theme === t.id ? 'border-indigo-500 ring-4 ring-indigo-50 scale-105 shadow-xl' : 'border-transparent bg-slate-50 hover:bg-slate-100 hover:scale-105'}`}>
                        <div className={`absolute inset-0 ${t.color} opacity-20 group-hover:opacity-100 transition-opacity -z-10`}></div>
                        <t.icon className={`w-6 h-6 ${theme === t.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className={`text-[11px] font-bold ${theme === t.id ? 'text-indigo-700' : 'text-slate-500'}`}>{t.label}</span>
                        {theme === t.id && <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Pattern */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Họa tiết Nền</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'cubes', name: 'Lập phương' },
                      { id: 'dots', name: 'Chấm bi' },
                      { id: 'diamonds', name: 'Kim cương' },
                      { id: 'none', name: 'Trơn (Phẳng)' },
                    ].map((p) => (
                      <button key={p.id} onClick={() => setPattern(p.id)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${pattern === p.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>
                        <span className="text-sm font-bold">{p.name}</span>
                        {pattern === p.id && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Badges Showcase */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-xl border border-white p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 relative z-10 gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Award className="w-6 h-6" /></div>
                  Bộ sưu tập Huy hiệu
                </h3>
                <p className="text-slate-500 mt-2 font-medium">Chinh phục thử thách và thu thập những danh hiệu cao quý nhất.</p>
              </div>
              <div className="bg-slate-100 px-5 py-3 rounded-2xl font-black text-slate-700 text-lg shadow-inner">
                {userBadgeIds.length} <span className="text-slate-400 font-bold text-sm">/ {badges.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
              {badges.map((badge, i) => {
                const earned = userBadgeIds.includes(badge.id);
                const prog = badgeProgress(badge);
                return (
                  <motion.div key={badge.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className={`relative group overflow-hidden p-6 rounded-[2rem] border-2 flex flex-col items-center text-center transition-all duration-300 ${earned ? 'border-purple-200 bg-gradient-to-b from-white to-purple-50 shadow-lg hover:shadow-xl hover:-translate-y-1' : 'border-slate-100 bg-slate-50/50 grayscale-[50%] hover:grayscale-0'}`}>
                    
                    {earned && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>}
                    
                    <div className={`text-5xl mb-4 transition-transform duration-500 ${earned ? 'group-hover:scale-110 group-hover:rotate-6 drop-shadow-md' : 'opacity-60'}`}>{badge.icon}</div>
                    <p className={`font-black text-sm leading-tight mb-3 z-10 ${earned ? 'text-slate-800' : 'text-slate-500'}`}>{badge.name}</p>
                    
                    {!earned ? (
                      <div className="w-full mt-auto z-10">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                          <span>Tiến độ</span>
                          <span>{prog}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${prog}%` }}></div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto z-10">
                        <span className="inline-block text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-100/80 backdrop-blur-sm border border-purple-200 px-3 py-1 rounded-full shadow-sm">Đã Sở Hữu</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
