import { Shield, Lock, Eye, FileText, Database, Bell, ChevronRight, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: 'easeOut' },
});

const sections = [
  {
    icon: Eye,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    title: '1. Thu thập Thông tin',
    content: [
      'Chúng tôi thu thập thông tin bạn cung cấp khi đăng ký: email, tên hiển thị, và mật khẩu (được mã hóa hoàn toàn).',
      'Lịch sử học tập (từ vựng đã học, điểm số, streak) được lưu để cá nhân hóa trải nghiệm học của bạn.',
      'Dữ liệu giọng nói khi luyện phát âm được xử lý real-time để chấm điểm và KHÔNG lưu trữ lâu dài.',
    ],
  },
  {
    icon: Lock,
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    title: '2. Bảo vệ Dữ liệu',
    content: [
      'Mật khẩu được băm (hashed) an toàn bởi hệ thống Supabase Auth — chúng tôi không thể đọc mật khẩu của bạn.',
      'Mọi kết nối đều được mã hóa qua HTTPS/TLS. Row Level Security (RLS) đảm bảo bạn chỉ thấy dữ liệu của chính mình.',
      'Chúng tôi cam kết KHÔNG bán, trao đổi hoặc chia sẻ dữ liệu cá nhân cho bên thứ ba vì mục đích thương mại.',
    ],
  },
  {
    icon: Database,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    title: '3. Lưu trữ & Xóa dữ liệu',
    content: [
      'Dữ liệu học tập được lưu trữ tại máy chủ Supabase trong khu vực Singapore (ap-southeast-1).',
      'Bạn có thể yêu cầu xóa toàn bộ tài khoản và dữ liệu liên quan bất kỳ lúc nào.',
      'Khi xóa tài khoản, tất cả dữ liệu cá nhân sẽ bị xóa vĩnh viễn trong vòng 30 ngày.',
    ],
  },
  {
    icon: Bell,
    color: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    title: '4. Thông báo & Cookie',
    content: [
      'Nếu bạn đồng ý, chúng tôi gửi thông báo nhắc nhở học tập qua Web Push Notifications.',
      'Chúng tôi sử dụng localStorage để lưu trạng thái giao diện (ngôn ngữ, chế độ tối) — không phải cookie theo dõi.',
      'Bạn có thể tắt thông báo bất kỳ lúc nào trong Cài đặt trình duyệt.',
    ],
  },
  {
    icon: FileText,
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    title: '5. Quyền của Người dùng',
    content: [
      'Bạn có quyền truy cập, chỉnh sửa thông tin cá nhân bất kỳ lúc nào trong phần Hồ sơ.',
      'Yêu cầu xóa dữ liệu, sửa thông tin hoặc báo cáo vi phạm: gửi email tới địa chỉ bên dưới.',
      'Chính sách này có thể cập nhật. Chúng tôi sẽ thông báo qua email khi có thay đổi quan trọng.',
    ],
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

        {/* Hero Header */}
        <motion.div {...fadeUp(0)} className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 rounded-3xl p-10 text-white shadow-2xl shadow-indigo-200">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-4 bottom-4 w-32 h-32 bg-white/5 rounded-full" />
          <div className="relative z-10 flex items-start gap-5">
            <div className="p-4 bg-white/15 backdrop-blur rounded-2xl flex-shrink-0">
              <Shield className="w-10 h-10" />
            </div>
            <div>
              <p className="text-violet-200 text-sm font-bold uppercase tracking-widest mb-2">Minh bạch 100%</p>
              <h1 className="text-4xl font-black tracking-tight leading-tight">Chính sách Bảo mật</h1>
              <p className="text-white/70 mt-3 leading-relaxed max-w-lg">
                Bảo vệ quyền riêng tư của bạn là cam kết cốt lõi của chúng tôi. Đọc để hiểu rõ cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-bold">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Cập nhật lần cuối: Tháng 4, 2026
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sections */}
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div key={i} {...fadeUp(0.1 + i * 0.08)}
              className="bg-white/80 backdrop-blur border border-white shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center gap-4 p-6 border-b border-slate-100">
                <div className={`p-3 ${section.bg} ${section.text} rounded-2xl`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-800">{section.title}</h2>
              </div>
              <ul className="p-6 space-y-3">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-slate-600 leading-relaxed">
                    <ChevronRight className={`w-4 h-4 mt-1 flex-shrink-0 ${section.text}`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}

        {/* Contact CTA */}
        <motion.div {...fadeUp(0.6)} className="bg-slate-800 text-white rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-lg">Cần hỗ trợ về quyền riêng tư?</p>
              <p className="text-slate-400 text-sm">Liên hệ ngay — chúng tôi phản hồi trong 24 giờ.</p>
            </div>
          </div>
          <a
            href="mailto:admin.support.software@gmail.com?subject=Hỗ trợ Học tiếng Trung"
            className="px-6 py-3 bg-white text-slate-800 rounded-2xl font-bold hover:bg-slate-100 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Gửi yêu cầu
          </a>
        </motion.div>
      </div>
    </div>
  );
}
