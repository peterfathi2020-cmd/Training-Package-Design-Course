import { User, FileRecord, Meeting, UserRole, Resource, AttendanceRecord, LoginLog } from '../types';

const STORAGE_KEYS = {
  USERS: 'bd_users',
  FILES: 'bd_files',
  MEETINGS: 'bd_meetings',
  RESOURCES: 'bd_resources',
  ATTENDANCE: 'bd_attendance',
  ANNOUNCEMENT: 'bd_announcement',
  LOGIN_LOGS: 'bd_login_logs',
};

// Seed Data
const DEFAULT_ADMIN: User = {
  id: 1,
  email: 'peterfathi2020@gmail.com',
  password: 'pepo_1759',
  role: 'admin',
  name: 'المدير العام',
  phone: '0000000000',
};

// Pre-defined Trainers List
const DEFAULT_TRAINERS: User[] = [
    {
        id: 101,
        name: 'يارا شاكر',
        email: 'yaraaa.shaker@gmail.com',
        phone: '01096806661',
        role: 'trainer',
        password: '01096806661'
    },
    {
        id: 102,
        name: 'أسامة سويفي',
        email: 'Usamaswify@gmail.com',
        phone: '01012850998',
        role: 'trainer',
        password: '01012850998'
    },
    {
        id: 103,
        name: 'هيام حسيني',
        email: 'hayamhussiny2013@gmail.com',
        phone: '01220784649',
        role: 'trainer',
        password: '01220784649'
    },
    {
        id: 104,
        name: 'عبير السيد',
        email: 'abeerelsayed881@gmail.com',
        phone: '01000165790',
        role: 'trainer',
        password: '01000165790'
    },
    {
        id: 105,
        name: 'مشيرة الكردي',
        email: 'moshera.elkordy@gmail.com',
        phone: '01284535418',
        role: 'trainer',
        password: '01284535418'
    }
];

class MockDatabase {
  // In-Memory Cache
  private _users: User[] = [];
  private _files: FileRecord[] = [];
  private _meetings: Meeting[] = [];
  private _resources: Resource[] = [];
  private _attendance: AttendanceRecord[] = [];
  private _loginLogs: LoginLog[] = [];
  private _announcement: string = '';

  // Performance Caches (Memoization)
  private _filesViewCache: FileRecord[] | null = null;
  private _trainersCache: User[] | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Load raw data from LocalStorage into Memory
    try {
        this._users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        this._files = JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES) || '[]');
        this._meetings = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEETINGS) || '[]');
        this._resources = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESOURCES) || '[]');
        this._attendance = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
        this._loginLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGIN_LOGS) || '[]');
        this._announcement = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENT) || '';
    } catch (e) {
        console.error("Error loading DB", e);
        // Fallback to empty if corruption
        this._users = [];
    }

    // 2. Seed Data Logic (Runs only if data is missing or specific users missing)
    let hasChanges = false;

    // Ensure Admin Exists or Update Admin Credentials
    const adminIndex = this._users.findIndex(u => u.role === 'admin' && u.id === 1);
    if (adminIndex === -1) {
        this._users.push(DEFAULT_ADMIN);
        hasChanges = true;
    } else {
        // Force update admin credentials if they don't match (for the request to change password)
        if (this._users[adminIndex].email !== DEFAULT_ADMIN.email || 
            this._users[adminIndex].password !== DEFAULT_ADMIN.password) {
            this._users[adminIndex].email = DEFAULT_ADMIN.email;
            this._users[adminIndex].password = DEFAULT_ADMIN.password;
            hasChanges = true;
        }
    }

    // Ensure Default Trainers Exist and Update Passwords if needed
    DEFAULT_TRAINERS.forEach(dt => {
        const index = this._users.findIndex(u => u.email.toLowerCase() === dt.email.toLowerCase());
        if (index === -1) {
            // New trainer
            this._users.push(dt);
            hasChanges = true;
        } else {
            // Existing trainer - Update password to match phone if currently different
            // This ensures existing users get the new password policy applied
            if (this._users[index].password !== dt.password) {
                this._users[index].password = dt.password;
                this._users[index].phone = dt.phone; // Ensure phone matches too
                hasChanges = true;
            }
        }
    });

    // 3. Persist seed data if added
    if (hasChanges) {
        this.saveToStorage(STORAGE_KEYS.USERS, this._users);
        this.clearCaches();
    }
  }

  // Helper to sync memory to disk
  private saveToStorage(key: string, data: any) {
      if (typeof data === 'string') {
          localStorage.setItem(key, data);
      } else {
          localStorage.setItem(key, JSON.stringify(data));
      }
  }

  // Helper to invalidate memoized data
  private clearCaches() {
      this._filesViewCache = null;
      this._trainersCache = null;
  }

  // --- Users ---

  getUsers(): User[] {
    return this._users;
  }

  saveUser(user: Omit<User, 'id'>): User {
    // Check email uniqueness from memory
    if (this._users.find((u) => u.email === user.email)) {
      throw new Error('البريد الإلكتروني مسجل مسبقاً');
    }
    const newUser = { ...user, id: Date.now() };
    this._users.push(newUser);
    this.saveToStorage(STORAGE_KEYS.USERS, this._users);
    this.clearCaches(); // Invalidate caches
    return newUser;
  }

  updatePassword(email: string, newPass: string) {
    const index = this._users.findIndex((u) => u.email === email);
    if (index !== -1) {
      this._users[index].password = newPass;
      this.saveToStorage(STORAGE_KEYS.USERS, this._users);
      this.clearCaches(); // Invalidate caches
      return true;
    }
    return false;
  }
  
  updateUserProfile(id: number, updates: { phone?: string; password?: string }) {
      const index = this._users.findIndex((u) => u.id === id);
      if (index !== -1) {
          if (updates.phone) this._users[index].phone = updates.phone;
          if (updates.password) this._users[index].password = updates.password;
          this.saveToStorage(STORAGE_KEYS.USERS, this._users);
          this.clearCaches(); // Invalidate caches
          return this._users[index];
      }
      return null;
  }

  // Generic Update User (Admin use)
  updateUser(id: number, data: Partial<User>) {
      const index = this._users.findIndex((u) => u.id === id);
      if (index !== -1) {
          this._users[index] = { ...this._users[index], ...data };
          this.saveToStorage(STORAGE_KEYS.USERS, this._users);
          this.clearCaches(); // Invalidate caches
          return true;
      }
      return false;
  }

  // Delete User
  deleteUser(id: number) {
      // Prevent deleting the main admin
      const user = this.getUserById(id);
      if (user?.role === 'admin' && user.id === 1) {
          throw new Error("لا يمكن حذف المدير العام الرئيسي");
      }

      this._users = this._users.filter(u => u.id !== id);
      this.saveToStorage(STORAGE_KEYS.USERS, this._users);
      this.clearCaches(); // Invalidate caches to remove deleted user from files view
  }

  login(email: string, pass: string): User | null {
    const user = this._users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass) || null;
    
    if (user) {
        this.logLogin(user);
    }
    
    return user;
  }

  // --- Login Analytics ---
  
  private logLogin(user: User) {
      const newLog: LoginLog = {
          id: Date.now(),
          user_id: user.id,
          user_name: user.name,
          role: user.role,
          timestamp: new Date().toLocaleString('ar-EG')
      };
      
      // Update memory first
      this._loginLogs = [newLog, ...this._loginLogs].slice(0, 500);
      // Then persist
      this.saveToStorage(STORAGE_KEYS.LOGIN_LOGS, this._loginLogs);
  }

  getLoginLogs(): LoginLog[] {
      return this._loginLogs;
  }

  getTrainers(): User[] {
    // Memoized access
    if (this._trainersCache) return this._trainersCache;

    this._trainersCache = this._users.filter((u) => u.role === 'trainer');
    return this._trainersCache;
  }

  getTraineesByTrainer(trainerId: number): User[] {
    return this._users.filter((u) => u.assigned_trainer_id === trainerId);
  }
  
  getUserById(id: number): User | undefined {
      return this._users.find(u => u.id === id);
  }

  // --- Files (Assignments) ---

  // Highly Optimized: Uses memoization and O(1) Map lookup
  getFiles(): FileRecord[] {
    // Return cached result if valid
    if (this._filesViewCache) return this._filesViewCache;

    // 1. Create a Map for O(1) user lookup. 
    const userMap = new Map<number, User>();
    this._users.forEach(u => userMap.set(u.id, u));

    // 2. Map files to include user details
    this._filesViewCache = this._files.map((f: FileRecord) => {
      const uploader = userMap.get(f.user_id);
      const trainer = uploader?.assigned_trainer_id 
        ? userMap.get(uploader.assigned_trainer_id) 
        : null;

      return {
        ...f,
        user_name: uploader?.name || 'مستخدم محذوف',
        trainer_name: trainer?.name || 'غير معين'
      };
    });

    return this._filesViewCache;
  }

  addFile(userId: number, filename: string, description: string) {
    const newFile: FileRecord = {
      id: Date.now(),
      user_id: userId,
      filename,
      description,
      upload_date: new Date().toLocaleString('ar-EG'),
      status: 'pending'
    };
    this._files.push(newFile);
    this.saveToStorage(STORAGE_KEYS.FILES, this._files);
    this._filesViewCache = null; // Invalidate files cache
  }

  gradeFile(fileId: number, score: number, feedback: string) {
      const index = this._files.findIndex((f) => f.id === fileId);
      if (index !== -1) {
          this._files[index].score = score;
          this._files[index].feedback = feedback;
          this._files[index].status = 'graded';
          this.saveToStorage(STORAGE_KEYS.FILES, this._files);
          this._filesViewCache = null; // Invalidate files cache
          return true;
      }
      return false;
  }

  // --- Resources (Library) ---

  getResources(): Resource[] {
      return this._resources;
  }

  addResource(resource: Omit<Resource, 'id' | 'created_at'>) {
      const newResource = {
          ...resource,
          id: Date.now(),
          created_at: new Date().toLocaleString('ar-EG')
      };
      this._resources.push(newResource);
      this.saveToStorage(STORAGE_KEYS.RESOURCES, this._resources);
  }

  deleteResource(id: number) {
      this._resources = this._resources.filter(r => r.id !== id);
      this.saveToStorage(STORAGE_KEYS.RESOURCES, this._resources);
  }

  // --- Meetings ---

  getMeetings(): Meeting[] {
    return this._meetings;
  }

  addMeeting(meeting: Omit<Meeting, 'id' | 'created_at'>) {
    const newMeeting = {
      ...meeting,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    this._meetings.push(newMeeting);
    this.saveToStorage(STORAGE_KEYS.MEETINGS, this._meetings);
  }
  
  // --- Attendance ---

  getAttendance(trainerId: number, date: string): AttendanceRecord[] {
      // Memory filter is fast
      return this._attendance.filter((r) => r.trainer_id === trainerId && r.date === date);
  }

  saveAttendance(records: Omit<AttendanceRecord, 'id'>[]) {
      // Key: trainee_id + date (to identify what to overwrite)
      const keysToRemove = new Set(records.map(r => `${r.trainee_id}_${r.date}`));
      
      // Filter memory
      const kept = this._attendance.filter((r) => !keysToRemove.has(`${r.trainee_id}_${r.date}`));
      const newRecords = records.map(r => ({ ...r, id: Date.now() + Math.random() }));
      
      this._attendance = [...kept, ...newRecords];
      this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this._attendance);
  }

  // --- Announcement ---

  getAnnouncement(): string {
      return this._announcement;
  }

  setAnnouncement(text: string) {
      this._announcement = text;
      this.saveToStorage(STORAGE_KEYS.ANNOUNCEMENT, text);
  }

  // --- Backup & Export ---

  exportDB() {
      // Use in-memory data for export
      const data = {
          users: this._users,
          files: this._files,
          meetings: this._meetings,
          resources: this._resources,
          attendance: this._attendance,
          loginLogs: this._loginLogs,
          version: '1.2',
          exported_at: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_FULL_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  }

  // Generate CSV for Excel
  exportUsersToCSV() {
      const userMap = new Map<number, User>();
      this._users.forEach(u => userMap.set(u.id, u));

      // CSV Header
      let csvContent = "المعرف,الاسم,البريد الإلكتروني,كلمة المرور,الدور,الهاتف,اسم مسئول المجموعة\n";
      
      this._users.forEach(u => {
          let trainerName = '-';
          if (u.assigned_trainer_id) {
              const trainer = userMap.get(u.assigned_trainer_id);
              trainerName = trainer ? trainer.name : '-';
          }

          const roleAr = u.role === 'admin' ? 'مدير' : u.role === 'trainer' ? 'مسئول مجموعة' : 'متدرب';
          
          // Escape quotes within content
          const cleanName = u.name.replace(/"/g, '""');
          const cleanPhone = u.phone ? `'${u.phone}` : ''; // Add ' to force string in Excel for phones

          const row = [
              u.id,
              `"${cleanName}"`,
              `"${u.email}"`,
              `"${u.password || ''}"`,
              roleAr,
              `"${cleanPhone}"`,
              `"${trainerName}"`
          ].join(",");
          
          csvContent += row + "\n";
      });

      // Add BOM for correct Arabic rendering in Excel
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_data_excel_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
  }

  importDB(jsonString: string): boolean {
      try {
          const data = JSON.parse(jsonString);
          
          // Basic Validation
          if (!data.users || !Array.isArray(data.users)) {
              throw new Error("Invalid Backup Format: Missing users");
          }

          // Update Memory
          this._users = data.users;
          this._files = data.files || [];
          this._meetings = data.meetings || [];
          this._resources = data.resources || [];
          this._attendance = data.attendance || [];
          this._loginLogs = data.loginLogs || [];

          // Persist all
          this.saveToStorage(STORAGE_KEYS.USERS, this._users);
          this.saveToStorage(STORAGE_KEYS.FILES, this._files);
          this.saveToStorage(STORAGE_KEYS.MEETINGS, this._meetings);
          this.saveToStorage(STORAGE_KEYS.RESOURCES, this._resources);
          this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this._attendance);
          this.saveToStorage(STORAGE_KEYS.LOGIN_LOGS, this._loginLogs);
          
          // Clear caches to force rebuild with new data
          this.clearCaches();

          return true;
      } catch (error) {
          console.error("Import Failed:", error);
          return false;
      }
  }
}

export const db = new MockDatabase();