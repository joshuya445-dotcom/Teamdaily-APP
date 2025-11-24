import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, PenLine, FileText, LogOut, Users, 
  Settings, Moon, Sun, Plus, Trash2, Percent, Sparkles, UserPlus, Menu,
  Bell, Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, where, onSnapshot, 
  orderBy, doc, setDoc, getDocs, updateDoc, arrayUnion, 
  arrayRemove, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

import { User, DailyReport, Group, AppSettings, WorkItem, Notification } from './types';
import { Button, Card, MoodIcon, getMoodLabel } from './components/UIComponents';
import { DashboardView, AnalyticsView, ReportListView } from './components/ReportViews';
import { generateTeamSummary } from './services/geminiService';

// Initialize Firebase with sandbox config
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  // --- Global State ---
  const [user, setUser] = useState<User | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [view, setView] = useState('submit'); // 'login' | 'dashboard' | 'submit' | 'reports' | 'analytics' | 'settings' | 'team'
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // --- Notification State ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightReportId, setHighlightReportId] = useState<string | null>(null);

  // --- Data State ---
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ teamName: "TeamDaily", workDays: [1, 2, 3, 4, 5], thresholds: { daily: 8, weekly: 4, monthly: 20 } });
  
  // --- Auth Form State ---
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminSecret, setAdminSecret] = useState(''); 
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [authError, setAuthError] = useState('');

  // --- Report Form State ---
  const [workItems, setWorkItems] = useState<WorkItem[]>([{ id: Date.now(), text: '', progress: 100 }]);
  const [problems, setProblems] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [mood, setMood] = useState('neutral');
  const [submitting, setSubmitting] = useState(false);

  // --- AI State ---
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState('');

  // --- Initialization ---
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkMode(true);

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        setDbReady(true);
      } catch (err) {
        console.error("Firebase Init Error:", err);
        setAuthError("系统连接失败，请刷新重试");
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    // Check localStorage session
    const savedUser = localStorage.getItem('teamdaily_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setView(parsedUser.role === 'admin' ? 'dashboard' : 'submit');
      } catch (e) { localStorage.removeItem('teamdaily_user'); }
    } else {
      setView('login');
    }
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- Data Subscription ---
  useEffect(() => {
    if (!user || !dbReady) return;
    const basePath = `artifacts/${appId}/public/data`;
    
    const unsubs = [
      onSnapshot(doc(db, basePath, 'settings', 'global'), (s) => s.exists() && setSettings(prev => ({...prev, ...s.data()}))),
      onSnapshot(collection(db, basePath, 'groups'), (s) => setGroups(s.docs.map(d => ({id:d.id, name: d.data().name})))),
      onSnapshot(query(collection(db, basePath, 'daily_reports'), orderBy('createdAt', 'desc')), (s) => setReports(s.docs.map(d => ({id:d.id, ...d.data()} as DailyReport)))),
      onSnapshot(query(collection(db, basePath, 'users_directory'), orderBy('createdAt', 'desc')), (s) => setTeamMembers(s.docs.map(d => ({uid:d.id, ...d.data()} as User)))),
      // Notification Subscription
      onSnapshot(query(collection(db, basePath, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')), (s) => {
        setNotifications(s.docs.map(d => ({id: d.id, ...d.data()} as Notification)));
      })
    ];
    return () => unsubs.forEach(u => u());
  }, [user, dbReady]);

  // --- Handlers ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    if (!dbReady) {
       setAuthError("Database connecting...");
       setLoading(false);
       return;
    }

    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users_directory');

      if (authMode === 'login') {
        const q = query(usersRef, where('email', '==', email), where('password', '==', password));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) throw new Error("邮箱或密码错误");
        const userDoc = querySnapshot.docs[0].data() as User;
        finishLogin({ ...userDoc, uid: querySnapshot.docs[0].id });
      } else {
        if (adminSecret !== 'ADMIN888' && inviteCodeInput !== 'TEAM2025') throw new Error("加入口令错误");
        const q = query(usersRef, where('email', '==', email));
        const existing = await getDocs(q);
        if (!existing.empty) throw new Error("该邮箱已被注册");

        const role = adminSecret === 'ADMIN888' ? 'admin' : 'user';
        const newUser: any = {
          name, email, password, role, groupId: null,
          createdAt: serverTimestamp(),
          joinedAtStr: new Date().toISOString().split('T')[0]
        };
        const docRef = await addDoc(usersRef, newUser);
        finishLogin({ ...newUser, uid: docRef.id });
      }
    } catch (err: any) { setAuthError(err.message); } finally { setLoading(false); }
  };

  const finishLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('teamdaily_user', JSON.stringify(userData));
    setView(userData.role === 'admin' ? 'dashboard' : 'submit');
  };

  const handleLogout = () => { localStorage.removeItem('teamdaily_user'); setUser(null); setView('login'); };

  // Report Form Handlers
  const addWorkItem = () => setWorkItems([...workItems, { id: Date.now(), text: '', progress: 0 }]);
  const updateWorkItem = (id: number, f: keyof WorkItem, v: any) => setWorkItems(workItems.map(i => i.id === id ? { ...i, [f]: v } : i));
  const removeWorkItem = (id: number) => workItems.length > 1 && setWorkItems(workItems.filter(i => i.id !== id));

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = workItems.filter(i => i.text.trim().length > 0);
    if (validItems.length === 0) { alert("请填写工作内容"); return; }
    if (!user) return;

    setSubmitting(true);
    try {
      const myGroup = teamMembers.find(u => u.uid === user.uid)?.groupId;
      const myGroupName = groups.find(g => g.id === myGroup)?.name;
      const todayWorkString = validItems.map(i => `${i.text} (${i.progress}%)`).join('\n');
      
      const reportRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'daily_reports'), {
        userId: user.uid, userName: user.name,
        groupId: myGroup || null, groupName: myGroupName || '',
        date: new Date().toISOString().split('T')[0],
        todayWork: todayWorkString, workItems: validItems,
        problems, tomorrowPlan, mood, likes: [],
        createdAt: serverTimestamp(), createdAtMillis: Date.now()
      });

      // Handle Mentions Notification
      const allText = `${todayWorkString} ${problems} ${tomorrowPlan}`;
      
      // We iterate through team members to find mentions in the text
      // This supports full names like "@John Doe" better than simple regex
      teamMembers.forEach(async (member) => {
        if (member.uid === user.uid) return;
        
        // Check if the member's name is mentioned with an @ symbol
        // For production, consider using a more robust library or tokenization
        if (allText.includes(`@${member.name}`)) {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), {
            userId: member.uid,
            type: 'mention',
            content: `${user.name} mentioned you in their daily report.`,
            read: false,
            linkId: reportRef.id,
            createdAt: serverTimestamp()
          });
        }
      });
      
      setWorkItems([{ id: Date.now(), text: '', progress: 100 }]); setProblems(''); setTomorrowPlan(''); setMood('neutral');
      if (user.role === 'admin') setView('dashboard');
      else alert("日报提交成功！");
    } catch(e){ console.error(e); alert("提交失败"); } finally { setSubmitting(false); }
  };

  const handleLike = async (rid: string, likes: string[]) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'daily_reports', rid);
    const isLiked = likes?.includes(user.uid);
    await updateDoc(ref, { likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const handleGenerateSummary = async () => {
    setAiGenerating(true);
    const today = new Date().toISOString().split('T')[0];
    const todayReports = reports.filter(r => r.date === today);
    const summary = await generateTeamSummary(todayReports);
    setGeneratedSummary(summary);
    setAiGenerating(false);
  };
  
  const handleMarkNotificationRead = async (nid: string) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', nid), { read: true });
    } catch (e) { console.error("Failed to mark read", e); }
  };

  const handleNotificationClick = async (n: Notification) => {
    await handleMarkNotificationRead(n.id);
    setShowNotifications(false);
    if (n.linkId) {
      setView('reports');
      setHighlightReportId(n.linkId);
      // Clear highlight after some time
      setTimeout(() => setHighlightReportId(null), 4000);
    }
  };

  // --- Render Helpers ---

  if (view === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
           <div className="flex justify-center mb-6">
             <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
               <Sparkles className="text-white w-6 h-6" />
             </div>
           </div>
           <h2 className="text-2xl font-bold text-center mb-8 dark:text-white">{settings.teamName || "TeamDaily"}</h2>
           <form onSubmit={handleAuth} className="space-y-4">
             {authMode === 'register' && (
               <>
               <input type="text" placeholder="姓名" required className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={name} onChange={e=>setName(e.target.value)} />
               <input type="text" placeholder="加入口令 (默认: TEAM2025)" required className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={inviteCodeInput} onChange={e=>setInviteCodeInput(e.target.value)} />
               </>
             )}
             <input type="email" placeholder="邮箱" required className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={email} onChange={e=>setEmail(e.target.value)} />
             <input type="password" placeholder="密码" required className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={password} onChange={e=>setPassword(e.target.value)} />
             {authMode === 'register' && <input type="text" placeholder="管理员密钥 (选填)" className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={adminSecret} onChange={e=>setAdminSecret(e.target.value)} />}
             {authError && <p className="text-rose-500 text-sm text-center bg-rose-50 dark:bg-rose-900/20 p-2 rounded">{authError}</p>}
             <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-indigo-500/20" disabled={loading}>
                {loading ? 'Processing...' : (authMode === 'login' ? '登 录' : '注 册')}
             </Button>
           </form>
           <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
             {authMode === 'login' ? '没有账号？创建新账号' : '已有账号？直接登录'}
           </button>
        </div>
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label }: any) => (
    <button 
      onClick={() => { setView(id); setSidebarOpen(false); }} 
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${view === id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
    >
      <Icon className="w-5 h-5" /><span>{label}</span>
    </button>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative`}>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20 px-4 py-3 flex justify-between items-center">
         <div className="flex items-center gap-2 font-bold text-indigo-600"><Sparkles className="w-5 h-5" /> {settings.teamName}</div>
         <div className="flex items-center gap-3">
             <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
             </button>
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2"><Menu className="w-6 h-6" /></button>
         </div>
      </div>

      {/* Notifications Panel (Overlay) */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50 md:bg-transparent" onClick={() => setShowNotifications(false)} />
          <div className="absolute top-16 right-4 md:left-64 md:top-auto md:bottom-20 md:ml-4 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700 font-bold flex justify-between items-center">
              <span>Notifications</span>
              {unreadCount > 0 && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{unreadCount} new</span>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                    <div className="flex gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
                      <div>
                        <p className="text-sm text-slate-800 dark:text-slate-200">{n.content}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Sidebar */}
      <aside className={`w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col fixed inset-y-0 z-30 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 hidden md:block">
          <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400 font-bold text-2xl tracking-tight">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><Sparkles className="w-5 h-5" /></div>
            <span className="truncate">{settings.teamName}</span>
          </div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">{user?.role === 'admin' ? 'Administrator' : 'Team Member'}</div>
        </div>
        
        <div className="mt-16 md:mt-2"></div> {/* Spacer for mobile */}

        <nav className="flex-1 px-4 space-y-1">
          {user?.role === 'admin' && (
            <>
              <NavItem id="dashboard" icon={LayoutDashboard} label="概览仪表盘" />
              <NavItem id="team" icon={Users} label="团队管理" />
              <NavItem id="settings" icon={Settings} label="系统设置" />
              <div className="my-4 border-t border-slate-100 dark:border-slate-800"></div>
            </>
          )}
          <NavItem id="submit" icon={PenLine} label="写日报" />
          <NavItem id="analytics" icon={FileText} label="数据分析" />
          <NavItem id="reports" icon={Users} label="团队日报库" />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Notification Button Desktop */}
          <div className="hidden md:flex items-center justify-between mb-4 px-2">
             <span className="text-xs font-bold text-slate-400 uppercase">System</span>
             <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors">
                <Bell className="w-4 h-4 text-slate-500" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-100 dark:ring-slate-800"></span>}
             </button>
          </div>

          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="text-sm font-medium truncate max-w-[100px] leading-tight">
                <div className="text-slate-900 dark:text-white">{user?.name}</div>
                <div className="text-xs text-slate-400">Online</div>
              </div>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-all shadow-sm">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          <Button variant="ghost" onClick={handleLogout} icon={LogOut} className="w-full justify-start text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">退出登录</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto">
        {view === 'dashboard' && user?.role === 'admin' && (
          <DashboardView 
            user={user} 
            reports={reports} 
            groups={groups} 
            teamMembers={teamMembers} 
            generatedSummary={generatedSummary}
            onGenerateSummary={handleGenerateSummary}
            isGenerating={aiGenerating}
          />
        )}

        {view === 'analytics' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             <header className="mb-8"><h1 className="text-2xl font-bold">数据分析</h1></header>
             <AnalyticsView reports={reports} user={user!} teamMembers={teamMembers} settings={settings} />
          </div>
        )}

        {view === 'submit' && (
           <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="mb-8">
              <h1 className="text-2xl font-bold">提交日报</h1>
              <p className="text-slate-500 mt-1">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </header>
            <form onSubmit={submitReport} className="space-y-6">
              <Card className="p-6 space-y-8">
                {/* Mood Selector */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">今日状态 / Mood</label>
                  <div className="grid grid-cols-5 gap-3">
                    {['energetic','happy','neutral','tired','stressed'].map(m => (
                      <button key={m} type="button" onClick={()=>setMood(m)} className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all duration-200 ${mood===m?`border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-105 shadow-md`: 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 grayscale hover:grayscale-0'}`}>
                        <MoodIcon mood={m} className="w-6 h-6" /><span className="text-[10px] font-medium text-slate-500">{getMoodLabel(m)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Work Items */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">核心产出 (按 @ 可提及同事) <span className="text-rose-500">*</span></label>
                    <button type="button" onClick={addWorkItem} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"><Plus className="w-3 h-3 mr-1" /> 添加工作项</button>
                  </div>
                  <div className="space-y-4">
                    {workItems.map((item, idx) => (
                      <div key={item.id} className="group flex gap-4 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" 
                            placeholder={`工作内容 #${idx + 1} (e.g. 完成了登录接口开发)`} 
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                            value={item.text} 
                            onChange={(e) => updateWorkItem(item.id, 'text', e.target.value)} 
                          />
                          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            <Percent className="w-3 h-3 text-slate-400" />
                            <input type="range" min="0" max="100" step="10" className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600" value={item.progress} onChange={(e) => updateWorkItem(item.id, 'progress', parseInt(e.target.value))} />
                            <span className={`text-xs font-mono font-bold w-10 text-right ${item.progress === 100 ? 'text-emerald-500' : 'text-slate-500'}`}>{item.progress}%</span>
                          </div>
                        </div>
                        {workItems.length > 1 && (
                          <button type="button" onClick={() => removeWorkItem(item.id)} className="mt-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">困难与挑战 / Blockers</label>
                    <textarea className="w-full h-32 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-shadow" placeholder="需要协助的地方... (@同事名)" value={problems} onChange={e=>setProblems(e.target.value)}/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">明日计划 / Next Steps</label>
                    <textarea className="w-full h-32 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-shadow" placeholder="明天的关键任务..." value={tomorrowPlan} onChange={e=>setTomorrowPlan(e.target.value)}/>
                  </div>
                </div>
              </Card>
              <div className="flex justify-end sticky bottom-4 z-10">
                <Button type="submit" disabled={submitting} icon={PenLine} className="px-8 py-3 text-base shadow-xl shadow-indigo-500/20">
                  {submitting ? '提交中...' : '提交日报'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {view === 'reports' && (
           <div className="max-w-4xl mx-auto">
              <header className="mb-8"><h1 className="text-2xl font-bold">团队日报库</h1></header>
              <ReportListView 
                reports={reports} 
                user={user!} 
                onLike={handleLike} 
                teamMembers={teamMembers}
                groups={groups}
                highlightId={highlightReportId}
              />
           </div>
        )}
        
        {(view === 'team' || view === 'settings') && (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400">
            <Settings className="w-12 h-12 mb-4 opacity-20" />
            <p>Admin feature coming soon.</p>
          </div>
        )}
      </main>
    </div>
  );
}