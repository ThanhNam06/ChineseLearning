import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSelector, useDispatch } from 'react-redux';
import { setProfile } from '../store/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Save, Star, Flame, Award, Loader2, EyeOff, Eye, UserPlus, Users } from 'lucide-react';

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
  const fileInputRef = useRef();

  useEffect(() => {
    if (profile) { 
      setUsername(profile.username || ''); 
      setAvatarUrl(profile.avatar_url || ''); 
      setIsAnonymous(profile.is_anonymous || false);
    }
  }, [profile]);

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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* Banner & Basic Info */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-xl overflow-hidden relative">
        <div className="h-48 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        </div>
        
        <div className="px-8 pb-8 -mt-20 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2.5rem] border-4 border-white shadow-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center relative transition-transform duration-300 group-hover:scale-105">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> :
                  <span className="text-5xl font-black text-indigo-400 uppercase">{(profile?.username || user?.email || 'U')[0]}</span>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
            </div>
            
            <div className="flex-1 space-y-2">
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder={user?.email?.split('@')[0] || 'Tên hiển thị'}
                className="text-3xl md:text-4xl font-black text-slate-800 bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none pb-1 w-full max-w-sm transition-all text-center md:text-left" />
              <p className="text-slate-400 text-sm font-medium">{user?.email}</p>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button 
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm border ${
                  isAnonymous 
                  ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-900 shadow-slate-900/20' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-slate-200/50'
                }`}
              >
                {isAnonymous ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {isAnonymous ? 'Đang Ẩn Danh' : 'Chế độ Công khai'}
              </button>

              <button onClick={handleSave} disabled={saving} 
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu thay đổi
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-start gap-4">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><EyeOff className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-bold text-slate-800">Chế độ Ẩn danh là gì?</p>
              <p className="text-sm text-slate-600 mt-1">Khi bật Ẩn danh, bạn sẽ không xuất hiện trên Bảng Xếp Hạng và người khác không thể gửi lời mời kết bạn. Điểm của bạn vẫn được lưu lại bình thường.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Friend Requests (If any) */}
      <AnimatePresence>
        {friendRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-orange-100 shadow-xl overflow-hidden p-8">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-500" /> Lời mời kết bạn mới ({friendRequests.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friendRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <img src={req.sender?.avatar_url || `https://ui-avatars.com/api/?name=${req.sender?.username || 'U'}`} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    <span className="font-bold text-slate-700">{req.sender?.username}</span>
                  </div>
                  <button onClick={() => handleAcceptFriend(req.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors">
                    Chấp nhận
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Kinh nghiệm', value: (profile?.exp || 0).toLocaleString(), Icon: Star, cls: 'text-yellow-500 bg-yellow-50', fill: 'fill-yellow-400' },
          { label: 'Chuỗi ngày', value: `${profile?.streak || 0} ngày`, Icon: Flame, cls: 'text-orange-500 bg-orange-50', fill: 'fill-orange-500' },
          { label: 'Huy hiệu', value: `${userBadgeIds.length} / ${badges.length}`, Icon: Award, cls: 'text-purple-500 bg-purple-50', fill: '' },
        ].map(({ label, value, Icon, cls, fill }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${cls.split(' ')[1]}`}>
              <Icon className={`w-7 h-7 ${cls.split(' ')[0]} ${fill}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-black text-slate-800">{value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <Award className="w-6 h-6 text-purple-500" /> Bộ sưu tập Huy hiệu
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge, i) => {
            const earned = userBadgeIds.includes(badge.id);
            const prog = badgeProgress(badge);
            return (
              <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className={`p-5 rounded-3xl border-2 flex flex-col items-center text-center transition-all ${earned ? 'border-purple-200 bg-purple-50 shadow-md' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <span className="text-4xl mb-3">{badge.icon}</span>
                <p className={`font-bold text-sm leading-tight mb-2 ${earned ? 'text-slate-800' : 'text-slate-400'}`}>{badge.name}</p>
                {!earned ? (
                  <div className="w-full mt-1">
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${prog}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1">{prog}%</p>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full mt-1">Đã đạt</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
