import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Home, BookOpen, Mic, PenTool, LogOut, Search, Flame, Star, Trophy, GraduationCap, User, ShieldCheck, Menu, X, Swords } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useSelector(state => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Bảng điều khiển', path: '/', icon: Home },
    { name: 'Trung tâm Học tập', path: '/learning', icon: GraduationCap },
    { name: 'Từ vựng HSK', path: '/vocabulary', icon: BookOpen },
    { name: 'Luyện Phát Âm', path: '/speaking', icon: Mic },
    { name: 'Luyện Viết', path: '/writing', icon: PenTool },
    { name: 'AI Tutor 1-1', path: '/tutor', icon: Flame },
    { name: 'Đấu Trường', path: '/battle', icon: Swords },
    { name: 'Bảng Xếp Hạng', path: '/leaderboard', icon: Trophy },
    { name: 'Hồ sơ của tôi', path: '/profile', icon: User },
    { name: 'Đóng Góp', path: '/admin', icon: ShieldCheck },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  }

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const SidebarContent = () => (
    <>
      <div className="p-8 pb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Học tiếng Trung
          </h1>
        </Link>
        <button className="lg:hidden p-2 text-slate-400 hover:text-slate-800 bg-slate-50 rounded-xl" onClick={() => setIsMobileMenuOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 opacity-70">Menu chính</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.name} 
              to={item.path} 
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 border-none' 
                  : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        <Link to="/profile">
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <span className="uppercase">{(profile?.username || user?.email || 'U')[0]}</span>
              }
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-slate-800 truncate">{profile?.username || user?.email?.split('@')[0] || 'Học Viên'}</p>
              <p className="text-[10px] text-indigo-500 font-bold">⭐ {profile?.exp || 0} EXP</p>
            </div>
          </div>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-xs font-bold mb-4">
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
        <div className="flex justify-center gap-4 text-[10px] text-slate-400 font-bold">
          <Link to="/privacy" className="hover:text-indigo-500">Bảo mật</Link>
          <span>&bull;</span>
          <Link to="/security" className="hover:text-indigo-500">Chính sách</Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-color)] font-sans text-slate-800 overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col shadow-sm relative z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-transparent to-transparent pointer-events-none -z-10"></div>
        
        {/* Header - Fixed & More Responsive */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 md:px-10 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-indigo-600 hover:text-white transition-all" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-slate-100/50 px-4 py-2.5 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-indigo-200 focus-within:ring-4 focus-within:ring-indigo-50 transition-all w-64 xl:w-96">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Tìm kiếm..." className="bg-transparent border-none outline-none w-full text-xs font-bold text-slate-700 placeholder-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-black text-slate-600 bg-white px-3 md:px-4 py-2 rounded-xl shadow-sm border border-slate-100">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> 
              <span className="hidden sm:inline">Kinh nghiệm:</span> {profile?.exp || 0}
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-black text-slate-600 bg-white px-3 md:px-4 py-2 rounded-xl shadow-sm border border-slate-100">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> 
              <span className="hidden sm:inline">Chuỗi:</span> {profile?.streak || 0}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
