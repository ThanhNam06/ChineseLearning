import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setAuth, setProfile, setLoading } from './store/authSlice'
import { supabase } from './lib/supabase'

// Lazy loading pages for better performance
const MainLayout = lazy(() => import('./layouts/MainLayout'))
const Home = lazy(() => import('./pages/Home'))
const Vocabulary = lazy(() => import('./pages/Vocabulary'))
const Speaking = lazy(() => import('./pages/Speaking'))
const Auth = lazy(() => import('./pages/Auth'))
const Writing = lazy(() => import('./pages/Writing'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Learning = lazy(() => import('./pages/Learning'))
const Profile = lazy(() => import('./pages/Profile'))
const Admin = lazy(() => import('./pages/Admin'))
const Tutor = lazy(() => import('./pages/Tutor'))
const Battle = lazy(() => import('./pages/Battle'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Security = lazy(() => import('./pages/Security'))

const LoadingScreen = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    <p className="mt-4 text-slate-500 font-bold animate-pulse">Học tiếng Trung đang tải...</p>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { session, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
};

function App() {
  const dispatch = useDispatch();
  const { session } = useSelector(state => state.auth);

  // Helper for Push Notifications
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  // Profile Sync Logic
  const fetchProfile = async (userId) => {
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      const lastStudy = data.last_study_date ? new Date(data.last_study_date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let newStreak = data.streak || 0;
      let updateData = {};

      if (!lastStudy) {
        newStreak = 1;
        updateData = { streak: 1, last_study_date: new Date().toISOString() };
      } else {
        lastStudy.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
          updateData = { streak: newStreak, last_study_date: new Date().toISOString() };
        } else if (diffDays > 1) {
          newStreak = 1;
          updateData = { streak: 1, last_study_date: new Date().toISOString() };
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { data: updated } = await supabase.from('profiles').update(updateData).eq('id', userId).select().single();
        dispatch(setProfile(updated || { ...data, ...updateData }));
      } else {
        dispatch(setProfile(data));
      }
    }
  };

  // 1. Auth Initialization & Listeners
  useEffect(() => {
    dispatch(setLoading(true));
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setAuth({ user: session?.user || null, session }));
      if (session?.user) fetchProfile(session.user.id);
      dispatch(setLoading(false));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      dispatch(setAuth({ user: session?.user || null, session }));
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Request Notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // 2. Realtime Profile Updates
  useEffect(() => {
    if (!session?.user) return;

    const profileChannel = supabase.channel(`profile-${session.user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${session.user.id}` 
      }, payload => {
        dispatch(setProfile(payload.new));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [session?.user, dispatch]);

  // 3. Push Subscription Logic — Multi-device: one row per (user_id, endpoint)
  useEffect(() => {
    const subscribePush = async () => {
      if (!session?.user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      
      try {
        const reg = await navigator.serviceWorker.ready;
        const VAPID_PUBLIC_KEY = 'BM98ueROSlQb202Qr8zDBkzA3MYbBd4f06uFXE683CS72jUmQhyiHr9LZWATyH1i6SMrgArcCnsAtbCqldrmeoc';
        
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }

        // Detect a human-readable device name from userAgent
        const ua = navigator.userAgent;
        let deviceName = 'Unknown Device';
        if (/iPhone|iPad/.test(ua)) deviceName = 'iPhone/iPad';
        else if (/Android/.test(ua)) deviceName = 'Android';
        else if (/Chrome/.test(ua)) deviceName = 'Chrome';
        else if (/Firefox/.test(ua)) deviceName = 'Firefox';
        else if (/Safari/.test(ua)) deviceName = 'Safari';
        else if (/Edg/.test(ua)) deviceName = 'Edge';

        const subJson = sub.toJSON();
        const endpoint = subJson.endpoint;

        // Upsert by (user_id, endpoint) — each browser/device gets its own row
        await supabase.from('push_subscriptions').upsert({
          user_id: session.user.id,
          subscription: subJson,
          endpoint,
          device_name: deviceName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, endpoint' });
        
        console.log(`Push subscription active — device: ${deviceName}`);
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    };

    if (session?.user) {
      subscribePush();
    }
  }, [session?.user]);

  // 4. Heartbeat + Idle Detection
  // - Tracks last user interaction (mouse, keyboard, touch, scroll)
  // - If idle > 10 min: skip DB update → push won't reach this device
  // - If active: ping every 60s so Edge Function knows device is open
  useEffect(() => {
    if (!session?.user) return;

    const IDLE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
    let lastInteractionAt = Date.now();

    const markActive = () => { lastInteractionAt = Date.now(); };
    const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, markActive, { passive: true }));

    const updateHeartbeat = async () => {
      const idleMs = Date.now() - lastInteractionAt;
      if (idleMs > IDLE_THRESHOLD_MS) return; // User is idle — skip

      try {
        const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        const endpoint = sub.toJSON().endpoint;

        await supabase
          .from('push_subscriptions')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('user_id', session.user.id)
          .eq('endpoint', endpoint);
      } catch {
        // Silently ignore — non-critical background task
      }
    };

    // Ping immediately (opening app = active)
    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 60_000);

    // Returning to tab counts as activity
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        markActive();
        updateHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisible);
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, markActive));
    };
  }, [session?.user]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="vocabulary" element={<Vocabulary />} />
          <Route path="speaking" element={<Speaking />} />
          <Route path="writing" element={<Writing />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="learning" element={<Learning />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<Admin />} />
          <Route path="tutor" element={<Tutor />} />
          <Route path="battle" element={<Battle />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="security" element={<Security />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
