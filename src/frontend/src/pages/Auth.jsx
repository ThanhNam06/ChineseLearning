import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, KeyRound, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const features = [
  { icon: '🧠', label: 'Spaced Repetition AI' },
  { icon: '🖊️', label: 'Luyện viết Hán tự' },
  { icon: '🎙️', label: 'Nhận diện giọng nói' },
  { icon: '🏆', label: 'Bảng xếp hạng' },
];

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { session } = useSelector((state) => state.auth);

  if (session) return <Navigate to="/" replace />;

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setMessage({ type: 'success', text: '✅ Đăng ký thành công! Hãy nhấn vào liên kết trong email để xác thực tài khoản trước khi đăng nhập.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).');
          }
          throw error;
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex-col justify-between p-16 overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-500/20 blur-[80px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-400/20 blur-[80px]"></div>
        </div>

        {/* Chinese character art */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[32rem] font-black text-white/[0.04] leading-none">汉</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="text-5xl">汉</span> Học tiếng Trung
          </h1>
          <p className="text-indigo-200/80 mt-2 font-medium text-lg">Nền tảng học Hán ngữ thông minh</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              Chinh phục tiếng Trung<br/>theo cách của riêng bạn.
            </h2>
            <p className="text-indigo-200/70 font-medium leading-relaxed">
              Kết hợp AI, Spaced Repetition và gamification để việc học trở nên thú vị và hiệu quả hơn bao giờ hết.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10"
              >
                <span className="text-2xl">{f.icon}</span>
                <span className="text-white/90 font-semibold text-sm">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-3">
            {['🧑', '👩', '👦', '👧'].map((avatar, i) => (
              <div key={i} className="w-9 h-9 rounded-full bg-indigo-400/30 border-2 border-white/20 flex items-center justify-center text-sm">
                {avatar}
              </div>
            ))}
          </div>
          <p className="text-indigo-200/80 text-sm font-medium">+1,200 học viên đang học mỗi ngày</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-16 bg-slate-50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-[100px] opacity-60 pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-3xl font-black text-indigo-600 flex items-center justify-center gap-2">
              <span className="text-4xl">汉</span> Học tiếng Trung
            </h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 p-10 border border-slate-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? 'signup' : 'signin'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-800">
                    {isSignUp ? '🎉 Tạo tài khoản mới' : '👋 Chào mừng trở lại!'}
                  </h2>
                  <p className="text-slate-500 font-medium mt-1">
                    {isSignUp ? 'Bắt đầu hành trình Hán ngữ của bạn ngay hôm nay.' : 'Tiếp tục hành trình học tập của bạn.'}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Địa chỉ Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all font-medium"
                        placeholder="name@example.com" required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Mật khẩu</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all font-medium"
                        placeholder="••••••••" required minLength={6}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {message.text && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-4 rounded-2xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}
                      >
                        {message.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200/60 disabled:opacity-70 group"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                        {isSignUp ? 'Bắt đầu ngay' : 'Đăng nhập'}
                        <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">hoặc</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            <button
              onClick={() => { setIsSignUp(!isSignUp); setMessage({ type: '', text: '' }); }}
              className="w-full mt-6 py-3 text-slate-600 hover:text-indigo-600 font-semibold transition-colors rounded-2xl hover:bg-indigo-50 text-sm"
            >
              {isSignUp ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký miễn phí'}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 font-medium">
            Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ của chúng tôi.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
