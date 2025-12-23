import React, { useState, useRef, useEffect } from 'react';
import { User, FileRecord } from '../types';
import { db } from '../services/db';
import { LogOut, Search, X, User as UserIcon, FileText, Moon, Sun, Bell } from 'lucide-react';

export default function Layout({ 
    children, 
    user, 
    onLogout, 
    isDarkMode, 
    toggleTheme 
}: { 
    children?: React.ReactNode; 
    user: User; 
    onLogout: () => void; 
    isDarkMode: boolean; 
    toggleTheme: () => void; 
}) {
    const roleLabels: Record<string, string> = {
        admin: 'مسؤول النظام',
        trainer: 'مسئول المجموعة',
        trainee: 'متدرب'
    };

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{users: User[], files: FileRecord[]}>({users: [], files: []});
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [announcement, setAnnouncement] = useState('');

    useEffect(() => {
        // Load Announcement
        setAnnouncement(db.getAnnouncement());
    }, []);

    // Handle click outside to close search results
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (query.trim().length === 0) {
            setSearchResults({ users: [], files: [] });
            setShowResults(false);
            return;
        }

        setShowResults(true);
        const lowerQuery = query.toLowerCase();
        
        let foundUsers: User[] = [];
        let foundFiles: FileRecord[] = [];

        // Permission Logic for Search
        if (user.role === 'admin') {
            foundUsers = db.getUsers().filter(u => 
                u.name.toLowerCase().includes(lowerQuery) || 
                u.email.toLowerCase().includes(lowerQuery)
            );
            foundFiles = db.getFiles().filter(f => 
                f.filename.toLowerCase().includes(lowerQuery) || 
                f.description.toLowerCase().includes(lowerQuery) ||
                (f.user_name && f.user_name.toLowerCase().includes(lowerQuery))
            );
        } else if (user.role === 'trainer') {
             // Trainers can only search for THEIR assigned trainees
             const myTrainees = db.getTraineesByTrainer(user.id);
             foundUsers = myTrainees.filter(u => 
                u.name.toLowerCase().includes(lowerQuery) || 
                u.email.toLowerCase().includes(lowerQuery)
             );
             
             // Trainers can only search for files uploaded by THEIR trainees
             const traineeIds = myTrainees.map(t => t.id);
             foundFiles = db.getFiles().filter(f => 
                traineeIds.includes(f.user_id) && (
                    f.filename.toLowerCase().includes(lowerQuery) || 
                    f.description.toLowerCase().includes(lowerQuery) ||
                    (f.user_name && f.user_name.toLowerCase().includes(lowerQuery))
                )
             );
        } else if (user.role === 'trainee') {
            // Trainees can only search their OWN files
            foundFiles = db.getFiles().filter(f => 
                f.user_id === user.id && (
                    f.filename.toLowerCase().includes(lowerQuery) || 
                    f.description.toLowerCase().includes(lowerQuery)
                )
            );
        }

        setSearchResults({ users: foundUsers, files: foundFiles });
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults({ users: [], files: [] });
        setShowResults(false);
    };

    return (
        <div className="min-h-screen bg-surface dark:bg-gray-900 flex flex-col transition-colors duration-200">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    {/* Brand */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <img 
                            src="https://cdn-icons-png.flaticon.com/512/3406/3406828.png" 
                            alt="Logo" 
                            className="w-14 h-14 animate-pulse"
                        />
                        <div>
                            <h1 className="text-xl font-extrabold text-navy dark:text-white leading-tight hidden sm:block">تدريب مصممي الحقائب</h1>
                            <h1 className="text-xl font-extrabold text-navy dark:text-white leading-tight block sm:hidden">Training</h1>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-2xl relative hidden md:block" ref={searchRef}>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                <Search size={18} />
                            </div>
                            <input 
                                type="text"
                                className={`block w-full pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all ${searchQuery ? 'pl-10' : 'pl-3'}`}
                                placeholder="بحث عن مستخدمين أو ملفات..."
                                value={searchQuery}
                                onChange={handleSearch}
                                onFocus={() => { if(searchQuery) setShowResults(true); }}
                            />
                            {searchQuery && (
                                <button 
                                    type="button"
                                    onClick={clearSearch} 
                                    className="absolute inset-y-0 left-0 w-10 flex items-center justify-center cursor-pointer text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors h-full"
                                    title="مسح البحث"
                                    aria-label="مسح البحث"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showResults && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-100 dark:border-gray-700 py-2 text-base overflow-hidden max-h-[70vh] overflow-y-auto">
                                {searchResults.users.length === 0 && searchResults.files.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center">
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-full mb-3">
                                            <Search size={24} className="text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <p className="font-medium text-navy dark:text-white">لا توجد نتائج مطابقة</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">لم يتم العثور على نتائج لـ "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    <>
                                        {searchResults.users.length > 0 && (
                                            <div>
                                                <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 uppercase tracking-wider">
                                                    المستخدمين ({searchResults.users.length})
                                                </div>
                                                {searchResults.users.map(u => (
                                                    <div key={`u-${u.id}`} className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700/50 flex items-center gap-3 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                                                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full text-primary dark:text-blue-400">
                                                            <UserIcon size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-navy dark:text-white">{u.name}</p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                <span>{u.email}</span>
                                                                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                                                <span>{roleLabels[u.role]}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {searchResults.files.length > 0 && (
                                            <div>
                                                <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 uppercase tracking-wider border-t border-gray-100 dark:border-gray-700 mt-2">
                                                    الملفات ({searchResults.files.length})
                                                </div>
                                                {searchResults.files.map(f => (
                                                    <div key={`f-${f.id}`} className="px-4 py-3 hover:bg-orange-50 dark:hover:bg-gray-700/50 flex items-center gap-3 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                                                        <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-full text-orange-600 dark:text-orange-400">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-navy dark:text-white">{f.filename}</p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                <span>{f.description}</span>
                                                                {f.user_name && (
                                                                    <>
                                                                        <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                                                        <span className="text-primary dark:text-blue-400">بواسطة: {f.user_name}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Theme Toggle */}
                        <button 
                            onClick={toggleTheme}
                            className="p-2 text-navy dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-300 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                            title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                        {/* User Info & Logout */}
                        <div className="flex items-center gap-4">
                            <div className="text-left hidden sm:block">
                                <p className="text-sm font-bold text-navy dark:text-gray-200">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabels[user.role]}</p>
                            </div>
                            <button 
                                onClick={onLogout}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-full transition-colors"
                                title="تسجيل الخروج"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {announcement && (
                    <div className="mb-6 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-800 text-center animate-fadeIn shadow-sm">
                        <div className="flex items-center justify-center gap-2 font-bold mb-1">
                            <Bell size={18} className="animate-pulse" />
                            <span>تنبيه هام:</span>
                        </div>
                        <p>{announcement}</p>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}