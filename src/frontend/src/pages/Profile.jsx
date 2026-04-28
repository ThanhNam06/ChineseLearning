import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSelector, useDispatch } from 'react-redux';
import { setProfile } from '../store/authSlice';
import { motion } from 'framer-motion';
import { Camera, Save, Star, Flame, Award, Loader2 } from 'lucide-react';

export default function Profile() {
  const dispatch = useDispatch();
  const { user, profile } = useSelector(state => state.auth);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [badges, setBadges] = useState([]);
  const [userBadgeIds, setUserBadgeIds] = useState([]);
  const fileInputRef = useRef();

  useEffect(() => {
    if (profile) { setUsername(profile.username || ''); setAvatarUrl(profile.avatar_url || ''); }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchBadges = async () => {
      const [{ data: allBadges }, { data: myBadges }] = await Promise.all([
        supabase.from('badges').select('*').order('exp_required'),
        supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
      ]);
      if (allBadges) setBadges(allBadges);
      if (myBadges) setUserBadgeIds(myBadges.map(b => b.badge_id));

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
    fetchBadges();
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
      const updates = { username, avatar_url: avatarUrl };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      dispatch(setProfile({ ...profile, ...updates }));
      alert('Lưu thành công!');
    } catch (err) { alert('Lỗi khi lưu.'); }
    finally { setSaving(false); }
  };

  const badgeProgress = (badge) => {
    if (badge.exp_required > 0) return Math.min(100, Math.floor(((profile?.exp || 0) / badge.exp_required) * 100));
    if (badge.streak_required > 0) return Math.min(100, Math.floor(((profile?.streak || 0) / badge.streak_required) * 100));
    return 100;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500"></div>
        <div className="px-8 pb-8 -mt-16">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-indigo-100 flex items-center justify-center">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> :
                  <span className="text-4xl font-black text-indigo-600 uppercase">{(profile?.username || user?.email || 'U')[0]}</span>}
              </div>
              <button onClick={() => fileInputRef.current.click()} disabled={uploading}
                className="absolute -bottom-2 -right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1">
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder={user?.email?.split('@')[0] || 'Tên hiển thị'}
                className="text-2xl font-black text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 outline-none pb-1 w-full max-w-xs transition-colors" />
              <p className="text-slate-400 text-sm font-medium mt-1">{user?.email}</p>
            </div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-md">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

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
