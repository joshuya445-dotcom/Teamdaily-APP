import React from 'react';
import { Loader2, Smile, Zap, Meh, Coffee, Frown } from 'lucide-react';

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false, 
  type = 'button',
  icon: Icon 
}: any) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-offset-slate-900";
  
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md hover:-translate-y-0.5",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      disabled={disabled}
    >
      {disabled && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!disabled && Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

export const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, type = 'default', className = '' }: any) => {
  const styles: any = {
    default: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    purple: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[type]} ${className}`}>{children}</span>;
};

export const MoodIcon = ({ mood, className = "w-5 h-5" }: { mood: string, className?: string }) => {
  switch(mood) {
    case 'energetic': return <Zap className={`text-yellow-500 ${className}`} />;
    case 'happy': return <Smile className={`text-emerald-500 ${className}`} />;
    case 'neutral': return <Meh className={`text-slate-400 ${className}`} />;
    case 'tired': return <Coffee className={`text-orange-400 ${className}`} />;
    case 'stressed': return <Frown className={`text-rose-500 ${className}`} />;
    default: return <Meh className={`text-slate-400 ${className}`} />;
  }
};

export const getMoodLabel = (m: string) => ({
  energetic:'能量满满',
  happy:'开心顺利',
  neutral:'平稳正常',
  tired:'有点疲惫',
  stressed:'压力山大'
}[m] || m);