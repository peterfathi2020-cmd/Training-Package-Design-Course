import React from 'react';
import { LucideIcon } from 'lucide-react';

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
  isLoading = false
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  isLoading?: boolean;
}) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed border";
  
  // Custom palette mapping
  const variants = {
    primary: "bg-primary text-white border-transparent hover:bg-primary-dark shadow-blue-200/50 dark:shadow-none",
    secondary: "bg-white dark:bg-gray-800 text-navy dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
    danger: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/50",
    success: "bg-emerald-600 text-white border-transparent hover:bg-emerald-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {isLoading && (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  icon: Icon
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  icon?: LucideIcon;
}) => (
  <div className="mb-5 group">
    <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
          <Icon size={18} />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`w-full ${Icon ? 'pr-10 pl-3' : 'px-3'} py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm`}
      />
    </div>
  </div>
);

export const Select = ({
    label,
    value,
    onChange,
    options,
    icon: Icon
}: {
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { label: string; value: string | number }[];
    icon?: LucideIcon;
}) => (
    <div className="mb-5 group">
        <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">{label}</label>
        <div className="relative">
             {Icon && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                <Icon size={18} />
                </div>
            )}
            <select
                value={value}
                onChange={onChange}
                className={`w-full ${Icon ? 'pr-10 pl-3' : 'px-3'} py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm appearance-none`}
            >
                <option value="">اختر من القائمة...</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    </div>
);

interface CardProps {
  children?: React.ReactNode;
  title?: string;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, className = '', action }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-6 transition-all hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20 ${className}`}>
    {(title || action) && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
            {title && <h3 className="text-xl font-extrabold text-navy dark:text-white tracking-tight">{title}</h3>}
            {action && <div>{action}</div>}
        </div>
    )}
    {children}
  </div>
);

export const Badge = ({ children, color = 'blue' }: { children?: React.ReactNode; color?: string }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800',
        green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800',
        purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800',
        red: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800',
        orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800',
        yellow: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800'
    }
    return (
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${colors[color] || colors.blue}`}>
            {children}
        </span>
    )
}

export const ProgressBar = ({ progress, label }: { progress: number, label?: string }) => (
    <div className="w-full">
        {label && (
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-navy dark:text-gray-300">{label}</span>
                <span className="text-sm font-medium text-primary dark:text-blue-400">{Math.round(progress)}%</span>
            </div>
        )}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
        </div>
    </div>
);