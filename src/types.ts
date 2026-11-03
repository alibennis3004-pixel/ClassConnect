/**
 * Types et interfaces pour ClassConnect
 * Slogan : « Connecter la classe, faciliter la réussite. »
 */

export type UserRole = 'admin' | 'teacher' | 'club_manager' | 'student';

export type StudentStatus = 'active' | 'pending' | 'suspended' | 'banned' | 'rejected';

export interface AppUser {
  uid: string;
  email: string;
  identifier?: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: StudentStatus;
  isAuthorized: boolean;
  studentId?: string;
  studentNumber?: string;
  className?: string;
  schoolName?: string;
}

export interface Student {
  id: string;
  studentNumber: string; // Numéro d'ordre ou matricule (ex: LA-101)
  identifier?: string; // Identifiant unique de connexion (ex: sarah.mousamih)
  firstName: string;
  lastName: string;
  className: string; // Ex: "3ème Année - Laval Academy"
  email: string; // Adresse e-mail de l'élève
  status: StudentStatus;
  role: UserRole;
  uid?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  banReason?: string;
  banDuration?: string; // '24h' | '3d' | '7d' | '30d' | 'permanent'
  banExpiresAt?: string; // ISO date string
  bannedAt?: string;
  bannedBy?: string;
  password?: string;
  // Métriques d'emprunts
  activeLoansCount?: number;
  overdueLoansCount?: number;
}

export type WarningSeverity = 'low' | 'medium' | 'high';

export interface StudentWarning {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  reason: string;
  message: string;
  severity: WarningSeverity;
  issuedBy: string; // Ex: Ali Bennis (Admin) ou Madame Sarah (Professeur)
  issuedByRole: UserRole;
  createdAt: string;
  read?: boolean;
  acknowledgedAt?: string;
}

export interface LessonComment {
  id: string;
  lessonId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  parentId?: string | null;
  isTeacherReply?: boolean;
  isReported?: boolean;
  reportReason?: string;
  reportedBy?: string;
  reportedAt?: string;
}

export interface LessonProgress {
  id: string; // `${lessonId}_${studentId}`
  lessonId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  isCompleted: boolean;
  completedAt?: string | null;
  updatedAt: string;
}

export interface LessonAttachment {
  id: string;
  name: string;
  size: number; // Taille en octets
  type: string; // Type MIME
  dataUrl: string; // Contenu téléchargeable (Base64 Data URL)
  uploadedAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  subject: string; // Ex: Français, Mathématiques, Histoire-Géo, Sciences...
  description: string;
  content?: string; // Contenu détaillé du cours
  publishedAt: string; // YYYY-MM-DD
  courseDate?: string | null; // Date du cours si nécessaire
  dueDate?: string | null; // Date limite de rendu à l'école facultative
  attachments: LessonAttachment[];
  createdBy: string;
  authorRole?: string;
  createdAt: string;
  status?: 'published' | 'draft';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string; // Ex: Littérature marocaine, Roman jeunesse, Conte, Poésie, Théâtre
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  coverEmoji?: string;
  coverBg?: string;
  description: string;
  createdAt: string;
}

export type LoanStatus = 'active' | 'returned' | 'overdue';

export interface Loan {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  loanDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  returnDate?: string | null; // YYYY-MM-DD
  status: LoanStatus;
  notes?: string;
  processedBy: string; // Nom ou rôle du validateur
  createdAt: string;
}

export type AnnouncementCategory =
  | 'general'
  | 'important'
  | 'homework'
  | 'event'
  | 'teachers'
  | 'activities'
  | 'club'
  | 'course';

export type AudienceTarget = 'all' | 'all_students' | 'all_teachers' | 'class_2apic_1';

export interface AnnouncementAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface AnnouncementVideo {
  id: string;
  url: string;
  title?: string;
  type: 'upload' | 'external';
}

export interface AnnouncementComment {
  id: string;
  announcementId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface AnnouncementReadRecord {
  userId: string;
  userEmail: string;
  userName: string;
  readAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  authorId?: string;
  authorName: string;
  authorEmail?: string;
  authorRole?: UserRole;
  authorAvatar?: string;
  audience?: AudienceTarget;
  isPinned: boolean;
  isImportant?: boolean;
  images?: string[];
  videos?: AnnouncementVideo[];
  attachments?: AnnouncementAttachment[];
  externalLinks?: { title: string; url: string }[];
  likes?: string[];
  readBy?: AnnouncementReadRecord[];
  comments?: AnnouncementComment[];
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  pendingStudents: number;
  bannedStudents: number;
  totalLessons: number;
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  unreturnedBooks: number;
  recentClubActivities: ClubActivity[];
}

export interface ClubActivity {
  id: string;
  type: 'loan' | 'return' | 'new_book' | 'announcement';
  title: string;
  description: string;
  date: string;
  actor: string;
}

export type NotificationType =
  | 'new_lesson'
  | 'new_resource'
  | 'teacher_reply'
  | 'discussion_reply'
  | 'warning'
  | 'account_approved'
  | 'account_rejected'
  | 'new_announcement'
  | 'announcement_reply';

export interface AppNotification {
  id: string;
  recipientEmail: string;
  recipientId?: string;
  recipientName?: string;
  title: string;
  message: string;
  type: NotificationType;
  linkPage?: 'dashboard' | 'students' | 'lessons' | 'library' | 'loans' | 'statistics' | 'announcements' | 'student_portal' | 'settings';
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}


