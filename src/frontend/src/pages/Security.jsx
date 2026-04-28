import { Server, Key, Database, Activity, ShieldCheck, Zap, Globe, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: 'easeOut' },
});

const features = [
  {
    icon: Server,
    gradient: 'from-indigo-500 to-purple-600',
    shadow: 'shadow-indigo-200',
    title: 'Hạ tầng Supabase',
    subtitle: 'SOC2 Type II & ISO 27001',
    desc: 'Toàn bộ dữ liệu lưu trữ trên hạ tầng Supabase tại Singapore, tuân thủ các tiêu chuẩn bảo mật quốc tế cao nhất.',
    badges: ['PostgreSQL', 'Encrypted at rest', 'Daily backups'],
  },
  {
    icon: Key,
    gradient: 'from-blue-500 to-cyan-600',
    shadow: 'shadow-blue-200',
    title: 'Xác thực JWT',
    subtitle: 'Row Level Security',
    desc: 'Mọi API đều xác thực qua JWT token. RLS ở cấp độ database đảm bảo người dùng chỉ truy cập đúng dữ liệu của mình.',
    badges: ['JWT Auth', 'RLS enabled', 'Token refresh'],
  },
  {
    icon: Lock,
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-200',
    title: 'Mã hóa Đầu cuối',
    subtitle: 'AES-256 & bcrypt',
    desc: 'Mật khẩu băm bằng bcrypt. API keys AI (OpenRouter) được bảo mật hoàn toàn phía server trong Supabase Edge Functions, không bao giờ lộ ra client.',
    badges: ['bcrypt hashing', 'HTTPS/TLS', 'API key isolation'],
  },
  {
    icon: Activity,
    gradient: 'from-orange-500 to-rose-600',
    shadow: 'shadow-orange-200',
    title: 'Giám sát 24/7',
    subtitle: 'Real-time monitoring',
    desc: 'Hệ thống tự động ghi nhận log truy cập, phát hiện các hành vi bất thường và DDoS. Cảnh báo tức thì khi phát sinh sự cố.',
    badges: ['Uptime monitoring', 'Rate limiting', 'DDoS protection'],
  },
  {
    icon: Globe,
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-200',
    title: 'Bảo mật API',
    subtitle: 'CORS & CSP headers',
    desc: 'Tất cả Edge Functions được cấu hình CORS chặt chẽ. Content Security Policy ngăn chặn XSS và các cuộc tấn công injection.',
    badges: ['CORS policy', 'CSP headers', 'SQL injection prevention'],
  },
  {
    icon: Database,
    gradient: 'from-rose-500 to-pink-600',
    shadow: 'shadow-rose-200',
    title: 'Backup & Recovery',
    subtitle: 'Point-in-time recovery',
    desc: 'Dữ liệu được backup tự động hàng ngày với khả năng khôi phục đến bất kỳ thời điểm nào trong 7 ngày gần nhất.',
    badges: ['Daily backup', '7-day retention', 'Auto-restore'],
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime SLA', icon: Zap },
  { value: '256-bit', label: 'Mã hóa AES', icon: Lock },
  { value: '< 2s', label: 'Thời gian phản hồi', icon: Activity },
  { value: '0', label: 'Sự cố bảo mật', icon: ShieldCheck },
];

export default function Security() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/30">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* Hero */}
        <motion.div {...fadeUp(0)} className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-10 text-white shadow-2xl shadow-indigo-300/20">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl">
                <ShieldCheck className="w-8 h-8 text-indigo-300" />
              </div>
              <div>
                <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Bảo mật & An toàn</p>
                <h1 className="text-3xl font-black">Trung tâm Bảo mật</h1>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed max-w-2xl text-lg">
              Chúng tôi đặt bảo mật dữ liệu lên hàng đầu. Toàn bộ hệ thống được xây dựng theo nguyên tắc
              <span className="text-indigo-300 font-bold"> Security by Design</span> — bảo mật được tích hợp từ đầu, không phải thêm vào sau.
            </p>

            {/* Stats Row */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur"
                  >
                    <Icon className="w-5 h-5 text-indigo-300 mx-auto mb-2" />
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, ease: 'easeOut' }}
                className="group bg-white border border-slate-100 rounded-3xl p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg ${feature.shadow} mb-5`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-slate-800">{feature.title}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-3">{feature.subtitle}</p>
                <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {feature.badges.map((badge, j) => (
                    <span key={j} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[11px] font-bold border border-slate-100">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {badge}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div {...fadeUp(0.7)} className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-8 text-white text-center shadow-xl shadow-indigo-200">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-white/80" />
          <h2 className="text-2xl font-black mb-2">Phát hiện lỗ hổng bảo mật?</h2>
          <p className="text-white/70 mb-6">Chúng tôi trân trọng mọi báo cáo từ cộng đồng. Hãy liên hệ ngay để cùng bảo vệ hệ thống.</p>
          <a
            href="mailto:admin.support.software@gmail.com?subject=Hỗ trợ Học tiếng Trung"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-colors shadow-lg"
          >
            <ShieldCheck className="w-5 h-5" />
            Báo cáo bảo mật
          </a>
        </motion.div>
      </div>
    </div>
  );
}
