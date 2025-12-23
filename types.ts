export type UserRole = 'admin' | 'trainer' | 'trainee';

export interface User {
  id: number;
  email: string;
  password?: string; // Optional for display purposes
  role: UserRole;
  name: string;
  phone?: string;
  assigned_trainer_id?: number | null;
}

export interface FileRecord {
  id: number;
  user_id: number;
  filename: string;
  upload_date: string;
  description: string;
  user_name?: string; // Joined field
  trainer_name?: string; // Joined field
  score?: number; // 0-100
  feedback?: string;
  status: 'pending' | 'graded';
}

export interface Resource {
  id: number;
  title: string;
  description?: string;
  type: 'pdf' | 'video' | 'link';
  link: string;
  uploaded_by: number; // User ID (Admin or Trainer)
  target_audience: 'all' | 'group'; // All (by Admin) or Group (by Trainer)
  created_at: string;
}

export interface Meeting {
  id: number;
  link: string;
  topic: string;
  target_audience: 'all' | 'trainers' | 'group';
  target_group_id?: number; // Optional: ID of the trainer whose group is targeted
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  trainee_id: number;
  trainer_id: number;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
}

export interface LoginLog {
  id: number;
  user_id: number;
  user_name: string;
  role: UserRole;
  timestamp: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}