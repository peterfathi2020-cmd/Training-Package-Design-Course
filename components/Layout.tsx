import React, { useState, useRef, useEffect } from 'react';
import { User, FileRecord, Resource } from '../types';
import { db } from '../services/db';
import { LogOut, Search, X, User as UserIcon, FileText, Moon, Sun, Bell, Check, Trash2, BookOpen } from 'lucide-react';

// Unified Notification Type
type NotificationItem = {
    uniqueId: string;
    id: number;
    type: 'upload' | 'grade' | 'resource';
    title: string;
    subtitle: string;
    date: string;
    badge?: string;
    badgeColor?: string;
    icon?: React.ReactNode;
};

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

    // Notifications State
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load Announcement
        setAnnouncement(db.getAnnouncement());
    }, []);

    // Handle click outside to close search and notifications
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Fetch Notifications System
    useEffect(() => {
        const fetchNotifs = () => {
            // Using v2 for string IDs
            const seenIds = JSON.parse(localStorage.getItem(`seen_notifs_v2_${user.id}`) || '[]');
            let notifList: NotificationItem[] = [];
    
            if (user.role === 'trainer') {
                const myTrainees = db.getTraineesByTrainer(user.id).map(t => t.id);
                const allFiles = db.getFiles();
                
                // Trainers see NEW uploads
                allFiles.forEach(f => {
                    if (myTrainees.includes(f.user_id)) {
                        const uniqueId = `file_${f.id}`;
                        // We consider it "new" if not seen. We can also check status 'pending' if we only want pending ones.
                        // But let's show all unseen uploads.
                        if (!seenIds.includes(uniqueId)) {
                            notifList.push({
                                uniqueId,
                                id: f.id,
                                type: 'upload',
                                title: f.user_name || 'متدرب',
                                subtitle: `قام برفع ملف: ${f.filename}`,
                                date: f.upload_date,
                                icon: <FileText size={16} />,
                                badge: 'جديد',
                                badgeColor: 'bg-orange-100 text-orange-700'
                            });
                        }
                    }
                });
            } else if (user.role === 'trainee') {
                 const allFiles = db.getFiles();
                 
                 // 1. Graded Files
                 allFiles.forEach(f => {
                     if (f.user_id === user.id && f.status === 'graded') {
                         const uniqueId = `grade_${f.id}`;
                         if (!seenIds.includes(uniqueId)) {
                             notifList.push({
                                 uniqueId,
                                 id: f.id,
                                 type: 'grade',
                                 title: 'تم تصحيح الواجب',
                                 subtitle: f.filename,
                                 date: f.upload_date, // approximate date
                                 badge: f.score ? `${f.score}/100` : undefined,
                                 badgeColor: (f.score || 0) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                                 icon: <Check size={16} />
                             });
                         }
                     }
                 });

                 // 2. New Resources
                 const allResources = db.getResources();
                 allResources.forEach(r => {
                     const isForMe = r.target_audience === 'all' || (r.target_audience === 'group' && r.uploaded_by === user.assigned_trainer_id);
                     if (isForMe) {
                         const uniqueId = `res_${r.id}`;
                         if (!seenIds.includes(uniqueId)) {
                             const sender = r.uploaded_by === 1 ? 'الإدارة' : 'مسئول المجموعة';
                             notifList.push({
                                 uniqueId,
                                 id: r.id,
                                 type: 'resource',
                                 title: `مصدر جديد (${sender})`,
                                 subtitle: r.title,
                                 date: new Date(r.created_at).toLocaleDateString('ar-EG'),
                                 icon: <BookOpen size={16} />,
                                 badgeColor: 'bg-purple-100 text-purple-700'
                             });
                         }
                     }
                 });
            }
            
            // Sort by ID (approximate time order if IDs are timestamps)
            notifList.sort((a, b) => b.id - a.id);
            setNotifications(notifList);
        };
    
        fetchNotifs();
        const unsub = db.subscribe(fetchNotifs);
        return unsub;
    }, [user.id, user.role]);
    
    const dismissNotification = (uniqueId: string) => {
        const seenIds = JSON.parse(localStorage.getItem(`seen_notifs_v2_${user.id}`) || '[]');
        if (!seenIds.includes(uniqueId)) {
            localStorage.setItem(`seen_notifs_v2_${user.id}`, JSON.stringify([...seenIds, uniqueId]));
        }
        setNotifications(prev => prev.filter(n => n.uniqueId !== uniqueId));
    };
    
    const clearAllNotifications = () => {
        const seenIds = JSON.parse(localStorage.getItem(`seen_notifs_v2_${user.id}`) || '[]');
        const currentIds = notifications.map(n => n.uniqueId);
        localStorage.setItem(`seen_notifs_v2_${user.id}`, JSON.stringify([...seenIds, ...currentIds]));
        setNotifications([]);
        setShowNotifications(false);
    };

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
                            loading="lazy"
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
                        {/* Notifications Bell */}
                        {(user.role === 'trainer' || user.role === 'trainee') && (
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-2 relative text-navy dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-300 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                                    title="التنبيهات"
                                >
                                    <Bell size={20} />
                                    {notifications.length > 0 && (
                                        <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
                                    )}
                                </button>
                                
                                {showNotifications && (
                                    <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fadeIn origin-top-left">
                                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
                                            <h3 className="font-bold text-sm text-navy dark:text-white">التنبيهات</h3>
                                            {notifications.length > 0 && (
                                                <button onClick={clearAllNotifications} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                                    تحديد الكل كمقروء
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-gray-400">
                                                    <Check size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">لا توجد تنبيهات جديدة</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {notifications.map(n => (
                                                        <div key={n.uniqueId} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex gap-3 relative group">
                                                            <div className={`p-2 rounded-full h-fit flex-shrink-0 ${n.type === 'upload' ? 'bg-orange-100 text-orange-600' : n.type === 'grade' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                                                                {n.icon || <FileText size={16} />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-bold text-navy dark:text-gray-200 mb-0.5">
                                                                    {n.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                                    {n.subtitle}
                                                                </p>
                                                                {n.badge && (
                                                                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${n.badgeColor}`}>
                                                                        {n.badge}
                                                                     </span>
                                                                )}
                                                                <p className="text-[10px] text-gray-400 mt-1 text-left" dir="ltr">{n.date}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => dismissNotification(n.uniqueId)}
                                                                className="absolute top-2 left-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                                                title="إخفاء"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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