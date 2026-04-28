import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Square, Loader2, Sparkles, MessageSquare, Flame } from 'lucide-react';
import { getSpeechProvider } from '../lib/aiProvider';
import { useSelector, useDispatch } from 'react-redux';
import { updateExp } from '../store/authSlice';
import { logStudyActivity } from '../lib/progress';
import { supabase } from '../lib/supabase';

export default function Tutor() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: '你好！我是你的AI中文老师。今天你想聊些什么？ (Xin chào! Tôi là giáo viên tiếng Trung AI của bạn. Hôm nay bạn muốn trò chuyện về chủ đề gì?)' }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recentVocab, setRecentVocab] = useState([]);
  
  const messagesEndRef = useRef(null);
  const speechProviderRef = useRef(null);
  
  const { user, profile } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      // 1. Fetch chat history
      const { data: historyData, error: historyError } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      const hasHistory = !historyError && historyData?.length > 0;
      
      // 2. Fetch recent vocab
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: progress } = await supabase
        .from('user_progress')
        .select('vocabulary_id, updated_at')
        .eq('user_id', user.id)
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(10);

      let fetchedVocabs = [];
      if (progress?.length) {
        const ids = progress.map(p => p.vocabulary_id);
        const { data: vocabs } = await supabase
          .from('vocabularies')
          .select('hanzi, pinyin, meaning')
          .in('id', ids);
        fetchedVocabs = vocabs || [];
        setRecentVocab(fetchedVocabs);
      }
      
      // 3. Update messages state
      if (hasHistory) {
        setMessages(historyData.map(m => ({ role: m.role, text: m.content })));
      } else if (fetchedVocabs.length > 0) {
        // No history, but has recent vocab -> Update the initial greeting
        const randomVocab = fetchedVocabs[Math.floor(Math.random() * fetchedVocabs.length)];
        setMessages([
          { 
            role: 'ai', 
            text: `你好！我是你的AI中文老师。今天你想聊些什么？ (Xin chào! Tôi là giáo viên tiếng Trung AI của bạn. Hôm nay bạn muốn trò chuyện về chủ đề gì?)\n\n💡 Gợi ý: Bạn vừa học từ "${randomVocab.hanzi}" (${randomVocab.pinyin} - ${randomVocab.meaning}), hãy thử dùng nó trong câu nhé!` 
          }
        ]);
      }
    };
    
    loadData();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleTranscriptChunk = (text) => {
    setInput(prev => (prev + ' ' + text).trim());
  };

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      speechProviderRef.current = getSpeechProvider('deepgram');
      await speechProviderRef.current.startRecording(
        handleTranscriptChunk,
        (error) => {
          console.error('Speech error:', error);
          setIsRecording(false);
          setIsConnecting(false);
        },
        () => {
          setIsConnecting(false);
          setIsRecording(true);
        }
      );
    } catch (error) {
      console.error('Mic error:', error);
      alert('Vui lòng cấp quyền Microphone để nói chuyện.');
      setIsConnecting(false);
    }
  };

  const stopRecording = () => {
    speechProviderRef.current?.stopRecording();
    setIsRecording(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    // Thưởng EXP cho mỗi câu giao tiếp
    if (user && profile) {
      dispatch(updateExp(10));
      await logStudyActivity(user.id, 10, 0);
    }

    try {
      // Save user message to DB
      if (user) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          role: 'user',
          content: userText
        });
      }

      // Gọi Edge Function — pass recentVocab for contextual AI responses
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [...messages, { role: 'user', content: userText }].map(m => ({ role: m.role, content: m.text || m.content })),
          recentVocab: recentVocab.length > 0 ? recentVocab : undefined,
        }
      });

      if (error) throw error;

      const replyText = data.reply || "Xin lỗi, tôi không thể trả lời lúc này.";
      setMessages(prev => [...prev, { role: 'ai', text: replyText }]);
      
      // Save AI message to DB
      if (user) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          role: 'ai',
          content: replyText
        });
      }

      // Đọc phản hồi bằng Web Speech API
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(replyText.split('(')[0]);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, { role: 'ai', text: "Lỗi kết nối với máy chủ AI." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[85vh] flex flex-col space-y-4 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl">
            <Flame className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI Tutor 1-1</h2>
            <p className="text-slate-500 font-medium text-sm">Luyện phản xạ giao tiếp thực tế với giáo viên AI</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-600 font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          +10 EXP / câu
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 overflow-y-auto flex flex-col gap-6">
        {messages.map((msg, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-3xl p-5 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-sm'}`}>
              <p className={`text-lg font-medium leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-slate-800'}`}>
                {msg.text.includes('(') ? (
                  <>
                    <span className="font-bold text-xl block mb-1">{msg.text.split('(')[0]}</span>
                    <span className={`text-sm ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-500'}`}>({msg.text.split('(')[1]}</span>
                  </>
                ) : msg.text}
              </p>
            </div>
          </motion.div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start w-full">
            <div className="bg-slate-50 border border-slate-100 rounded-3xl rounded-bl-sm p-5 flex gap-2 items-center">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-end p-2 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:bg-white">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập hoặc nói câu trả lời của bạn bằng tiếng Trung..."
              className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[48px] px-3 py-3 text-slate-700 font-medium"
              rows={input.split('\n').length > 1 ? Math.min(4, input.split('\n').length) : 1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            {isConnecting ? (
              <div className="p-3 m-1 text-indigo-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="p-3 m-1 bg-red-100 text-red-500 rounded-xl hover:bg-red-200 transition-colors relative"
              >
                <div className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-30" />
                <Square className="w-6 h-6 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-3 m-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-xl transition-colors"
              >
                <Mic className="w-6 h-6" />
              </button>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-4 h-[64px] w-[64px] flex items-center justify-center bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="w-6 h-6 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
