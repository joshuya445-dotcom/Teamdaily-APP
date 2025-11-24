import React, { useMemo, useState, useEffect } from 'react';
import { 
  Sparkles, Heart, CalendarDays, TrendingUp, ChevronLeft, ChevronRight,
  Flame, Trophy, Search, Filter, X, Calendar, User as UserIcon, Layers, SlidersHorizontal
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { DailyReport, User, AppSettings, Group } from '../types';
import { Button, Card, Badge, MoodIcon, getMoodLabel } from './UIComponents';

// --- Dashboard View (Admin) ---
export const DashboardView = ({ 
  user, 
  reports, 
  groups, 
  teamMembers, 
  generatedSummary, 
  onGenerateSummary, 
  isGenerating 
}: any) => {
  const [selectedGroup, setSelectedGroup] = useState('all');

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayReports = reports.filter((r: DailyReport) => r.date === today);
    
    // Last 7 days chart data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const count = reports.filter((r: DailyReport) => {
        if (selectedGroup !== 'all' && r.groupId !== selectedGroup) return false;
        return r.date === dStr;
      }).length;
      last7Days.push({ name: dStr.slice(5), count });
    }

    return { todayCount: todayReports.length, last7Days };
  }, [reports, selectedGroup]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400">Welcome back, {user.name}. Here's the team pulse.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedGroup} 
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="all">所有小组</option>
            {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <Button onClick={onGenerateSummary} disabled={isGenerating} icon={Sparkles}>
            {isGenerating ? 'AI Thinking...' : '生成今日总结'}
          </Button>
        </div>
      </header>

      {generatedSummary && (
        <Card className="p-6 border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-800 dark:to-indigo-900/10">
          <div className="flex items-center space-x-2 mb-4">
            <Badge type="purple">AI Insight</Badge>
          </div>
          <div className="prose dark:prose-invert max-w-none text-sm">
            {generatedSummary.split('\n').map((line: string, i: number) => {
              if (line.trim().startsWith('##')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-indigo-900 dark:text-indigo-300">{line.replace(/#/g, '')}</h3>;
              return <p key={i} className="mb-1 text-slate-600 dark:text-slate-300 leading-relaxed">{line}</p>;
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">今日提交</p>
          <p className="text-3xl font-bold mt-2 text-indigo-600 dark:text-indigo-400">{stats.todayCount}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">团队人数</p>
          <p className="text-3xl font-bold mt-2">{teamMembers.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">提交率</p>
          <p className="text-3xl font-bold mt-2">
            {teamMembers.length ? Math.round((stats.todayCount / teamMembers.length) * 100) : 0}%
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-6 text-slate-800 dark:text-slate-200">
          近7天提交趋势 {selectedGroup !== 'all' && `(${groups.find((g:any)=>g.id===selectedGroup)?.name})`}
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.last7Days}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#6366f1', strokeWidth: 2, opacity: 0.1 }}
              />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

// --- Analytics View ---
export const AnalyticsView = ({ reports, user, teamMembers, settings }: { reports: DailyReport[], user: User, teamMembers: User[], settings: AppSettings }) => {
  const [targetUserId, setTargetUserId] = useState(user.uid);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [displayMode, setDisplayMode] = useState<'calendar' | 'chart'>('calendar');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthlyReports = useMemo(() => {
    return reports.filter(r => {
      if (r.userId !== targetUserId) return false;
      const d = new Date(r.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [reports, targetUserId, year, month]);

  const countWork = (text: string) => text ? text.split('\n').filter(l => l.trim().length > 0).length : 0;

  const chartData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const report = monthlyReports.find(r => r.date === dateStr);
      data.push({
        day: i,
        count: report ? countWork(report.todayWork) : 0,
      });
    }
    return data;
  }, [monthlyReports, year, month]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const report = monthlyReports.find(r => r.date === dateStr);
      days.push({
        day: i,
        date: dateStr,
        report,
        count: report ? countWork(report.todayWork) : 0
      });
    }
    return days;
  }, [monthlyReports, year, month]);

  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-slate-50 dark:bg-slate-800/50 text-slate-400';
    if (count <= 3) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    if (count <= 6) return 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200';
    if (count < 8) return 'bg-emerald-400 dark:bg-emerald-600 text-white';
    return 'bg-emerald-600 dark:bg-emerald-500 text-white font-bold ring-2 ring-emerald-200 dark:ring-emerald-900';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
           {user.role === 'admin' ? (
             <div className="flex items-center gap-2">
               <span className="text-sm font-medium text-slate-500">成员:</span>
               <select 
                 className="bg-slate-100 dark:bg-slate-900 border-none rounded-md text-sm px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                 value={targetUserId}
                 onChange={(e) => setTargetUserId(e.target.value)}
               >
                 {teamMembers.map(m => (
                   <option key={m.uid} value={m.uid}>{m.name}</option>
                 ))}
               </select>
             </div>
           ) : (
             <h2 className="text-lg font-bold flex items-center gap-2">
               <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs">{teamMembers.find(u => u.uid === targetUserId)?.name?.[0] || 'U'}</span>
               我的数据
             </h2>
           )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
            <button onClick={() => setDisplayMode('calendar')} className={`p-1.5 rounded-md transition-all ${displayMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}><CalendarDays className="w-4 h-4" /></button>
            <button onClick={() => setDisplayMode('chart')} className={`p-1.5 rounded-md transition-all ${displayMode === 'chart' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}><TrendingUp className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 rounded-lg px-2 py-1">
             <button onClick={prevMonth} className="p-1 hover:text-indigo-600"><ChevronLeft className="w-4 h-4" /></button>
             <span className="text-sm font-mono font-bold min-w-[80px] text-center">{year}-{String(month + 1).padStart(2, '0')}</span>
             <button onClick={nextMonth} className="p-1 hover:text-indigo-600"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2">
           <Card className="p-6 h-full min-h-[400px]">
             {displayMode === 'calendar' ? (
               <div className="h-full flex flex-col">
                 <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-slate-400 font-medium">{['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}</div>
                 <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                   {calendarDays.map((d, i) => (d ? (
                       <div key={i} className={`relative rounded-lg p-2 flex flex-col justify-between transition-all hover:scale-[1.02] cursor-default border border-transparent hover:border-slate-200 dark:hover:border-slate-600 ${getIntensityColor(d.count)}`}>
                         <span className="text-xs font-medium opacity-60">{d.day}</span>
                         {d.count > 0 && <div className="self-end">{d.count >= 8 ? <Flame className="w-3 h-3 text-white fill-white" /> : <span className="text-xs font-bold">{d.count}</span>}</div>}
                         {d.report?.mood && <div className="absolute top-1 right-1"><div className="w-1.5 h-1.5 rounded-full bg-white opacity-80"></div></div>}
                       </div>
                     ) : <div key={i} className="bg-transparent" />
                   ))}
                 </div>
               </div>
             ) : (
               <div className="h-full flex flex-col">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                     <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5}/>
                     <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                     <Tooltip contentStyle={{borderRadius: '8px', border:'none'}} />
                     <Area type="monotone" dataKey="count" stroke="#4f46e5" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             )}
           </Card>
         </div>
         <div className="space-y-6">
           <Card className="p-6">
             <h3 className="font-bold mb-4 text-slate-800 dark:text-slate-200">月度概览</h3>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"><span className="text-sm text-slate-500">提交天数</span><span className="font-bold text-lg text-slate-800 dark:text-slate-200">{monthlyReports.length} 天</span></div>
               <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"><span className="text-sm text-slate-500">工作项</span><span className="font-bold text-lg text-slate-800 dark:text-slate-200">{monthlyReports.reduce((acc, curr) => acc + countWork(curr.todayWork), 0)}</span></div>
             </div>
           </Card>
           <Card className="p-6">
             <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200"><Trophy className="w-4 h-4 text-amber-500" /> 成就</h3>
             <div className="space-y-3">
               {(() => {
                 const t = settings.thresholds || { daily: 8, weekly: 4 };
                 const badges = [];
                 if (monthlyReports.some(r => countWork(r.todayWork) >= t.daily)) badges.push({name:'单日爆肝', icon:'⚡', color:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'});
                 if (monthlyReports.length >= 20) badges.push({name:'全勤达人', icon:'🏅', color:'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'});
                 return badges.length > 0 ? badges.map((b, i) => <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${b.color}`}><span className="text-lg">{b.icon}</span><span className="text-sm font-bold">{b.name}</span></div>) : <p className="text-sm text-slate-400">本月暂无成就，继续加油！</p>;
               })()}
             </div>
           </Card>
         </div>
      </div>
    </div>
  );
};

// --- Report List View ---
export const ReportListView = ({ 
  reports, 
  user, 
  onLike, 
  teamMembers = [], 
  groups = [],
  highlightId
}: { 
  reports: DailyReport[], 
  user: User, 
  onLike: Function, 
  teamMembers?: User[], 
  groups?: Group[],
  highlightId?: string | null
}) => {
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterMood, setFilterMood] = useState('');

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Search Text
      if (search) {
        const query = search.toLowerCase();
        const content = `${r.todayWork} ${r.problems} ${r.tomorrowPlan} ${r.workItems?.map(w => w.text).join(' ') || ''}`.toLowerCase();
        if (!content.includes(query)) return false;
      }
      
      // Date Range
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      
      // Select Filters
      if (filterUser && r.userId !== filterUser) return false;
      if (filterGroup && r.groupId !== filterGroup) return false;
      if (filterMood && r.mood !== filterMood) return false;
      
      return true;
    });
  }, [reports, search, startDate, endDate, filterUser, filterGroup, filterMood]);

  const activeFiltersCount = [startDate, endDate, filterUser, filterGroup, filterMood].filter(Boolean).length;

  // Auto-scroll to highlighted report
  useEffect(() => {
    if (highlightId) {
      const el = document.getElementById(`report-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightId, filteredReports]);

  const clearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setFilterUser('');
    setFilterGroup('');
    setFilterMood('');
  };
  
  const getProgressColor = (p: number) => {
    if (p < 30) return 'bg-rose-500';
    if (p < 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-10">
      
      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search reports (work, issues, plans)..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-800 text-xs">{activeFiltersCount}</span>}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="p-4 animate-in slide-in-from-top-2 duration-200">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1">
                   <label className="text-xs font-semibold text-slate-500">Date Range</label>
                   <div className="flex gap-2">
                     <input type="date" className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs" value={startDate} onChange={e=>setStartDate(e.target.value)} />
                     <input type="date" className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs" value={endDate} onChange={e=>setEndDate(e.target.value)} />
                   </div>
                </div>
                
                <div className="space-y-1">
                   <label className="text-xs font-semibold text-slate-500">Member</label>
                   <div className="relative">
                     <UserIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                     <select className="w-full pl-7 pr-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs appearance-none" value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
                       <option value="">All Members</option>
                       {teamMembers.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                     </select>
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-semibold text-slate-500">Group</label>
                   <div className="relative">
                     <Layers className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                     <select className="w-full pl-7 pr-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs appearance-none" value={filterGroup} onChange={e=>setFilterGroup(e.target.value)}>
                       <option value="">All Groups</option>
                       {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                     </select>
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-semibold text-slate-500">Mood</label>
                   <div className="relative">
                     <select className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs" value={filterMood} onChange={e=>setFilterMood(e.target.value)}>
                       <option value="">All Moods</option>
                       {['energetic','happy','neutral','tired','stressed'].map(m => <option key={m} value={m}>{getMoodLabel(m)}</option>)}
                     </select>
                   </div>
                </div>
                
                <div className="flex items-end">
                   <button onClick={clearFilters} className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-1 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded transition-all">
                     <X className="w-3 h-3" /> Clear Filters
                   </button>
                </div>
             </div>
          </Card>
        )}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
      {filteredReports.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
           <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
           <p>No reports match your filters</p>
           <button onClick={clearFilters} className="text-indigo-500 text-sm mt-2 hover:underline">Clear filters</button>
        </div>
      ) : (
        filteredReports.map((report: DailyReport) => (
        <Card 
           key={report.id} 
           id={`report-${report.id}`}
           className={`p-6 hover:shadow-md transition-all relative overflow-hidden group ${highlightId === report.id ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.01]' : ''}`}
        >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold relative text-slate-600 dark:text-slate-200">
                  {report.userName[0]}
                  {report.mood && <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5"><MoodIcon mood={report.mood} className="w-3 h-3"/></div>}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{report.userName} <span className="text-slate-400 font-normal ml-1 text-xs">{report.groupName}</span></p>
                  <p className="text-xs text-slate-500">{report.date}</p>
                </div>
              </div>
              <button onClick={()=>onLike(report.id, report.likes)} className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${report.likes?.includes(user.uid)?'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400':'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                <Heart className={`w-3 h-3 ${report.likes?.includes(user.uid)?'fill-current':''}`}/><span>{report.likes?.length||0}</span>
              </button>
            </div>
            {report.workItems ? (
              <div className="space-y-3 mt-4">
                {report.workItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.progress === 100 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className={`font-medium ${item.progress === 100 ? 'text-slate-500 dark:text-slate-400 line-through opacity-80' : 'text-slate-800 dark:text-slate-200'}`}>{item.text}</span>
                        <span className="text-xs font-mono text-slate-400">{item.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(item.progress)}`} style={{width: `${item.progress}%`}}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-300 pl-2 border-l-2 border-slate-100 dark:border-slate-800">{report.todayWork}</div>
            )}
            {(report.problems || report.tomorrowPlan) && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                {report.problems && <p className="flex items-start gap-2"><span className="font-bold text-rose-500 shrink-0">Blocked:</span> <span>{report.problems}</span></p>}
                {report.tomorrowPlan && <p className="flex items-start gap-2"><span className="font-bold text-indigo-500 shrink-0">Next:</span> <span>{report.tomorrowPlan}</span></p>}
              </div>
            )}
        </Card>
      )))}
    </div>
    </div>
  );
};