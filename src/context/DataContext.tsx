import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth, ADMIN_ALI_EMAIL, TEACHER_SARA_EMAIL, CLUB_AWAB_EMAIL } from './AuthContext';
import {
  Student,
  Book,
  Loan,
  Lesson,
  Announcement,
  DashboardStats,
  ClubActivity,
  UserRole,
  StudentWarning,
  LessonComment,
  LessonProgress,
  WarningSeverity,
  AppNotification,
  AnnouncementReadRecord,
  AnnouncementComment
} from '../types';

export const isRogueAccount = (s: Partial<Student>): boolean => {
  const email = (s.email || '').toLowerCase().trim();
  const firstName = (s.firstName || '').toLowerCase().trim();
  const lastName = (s.lastName || '').toLowerCase().trim();
  const id = s.id || '';

  // 1. Amina Benjelloun
  if (email.includes('amina') || email.includes('benjelloun') || firstName.includes('amina') || lastName.includes('benjelloun')) {
    return true;
  }
  // 2. Compte erroné avec adresse 304@gmail.com
  if (email === '304@gmail.com' || email.includes('304@')) {
    return true;
  }
  // 3. Faux élèves ou données de démonstration
  if (email === 'eleve.demo@lavalacademy.ma') {
    return true;
  }
  // 4. Doublon d'Ali Bennis non officiel
  if (
    (email === ADMIN_ALI_EMAIL.toLowerCase() || (firstName === 'ali' && (lastName === 'benis' || lastName === 'bennis'))) &&
    id !== 'admin_ali_bennis'
  ) {
    return true;
  }
  return false;
};

interface DataContextType {
  schoolName: string;
  updateSchoolName: (name: string) => Promise<void>;
  students: Student[];
  books: Book[];
  loans: Loan[];
  lessons: Lesson[];
  announcements: Announcement[];
  warnings: StudentWarning[];
  comments: LessonComment[];
  lessonProgress: LessonProgress[];
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  dashboardStats: DashboardStats;
  isUsingFirestore: boolean;
  isLoadingData: boolean;

  // Actions Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  createNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;

  // Actions Gestion des Comptes & Rôles
  approveAccount: (id: string) => Promise<void>;
  rejectAccount: (id: string) => Promise<void>;
  promoteToRole: (id: string, role: UserRole) => Promise<void>;
  promoteToAdmin: (id: string) => Promise<void>;
  demoteToStudent: (id: string) => Promise<void>;
  banAccount: (id: string, reason?: string, duration?: string) => Promise<void>;
  reactivateAccount: (id: string) => Promise<void>;
  suspendAccount: (id: string, reason?: string) => Promise<void>;
  cleanRogueAccounts: () => Promise<number>;

  // Actions Élèves
  addStudent: (data: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  importStudentsBatch: (newStudents: Omit<Student, 'id' | 'createdAt'>[]) => Promise<number>;

  // Actions Avertissements
  addWarning: (studentId: string, reason: string, message: string, severity?: WarningSeverity) => Promise<void>;
  markWarningRead: (warningId: string) => Promise<void>;
  deleteWarning: (warningId: string) => Promise<void>;

  // Actions Commentaires de cours
  addComment: (lessonId: string, content: string, parentId?: string | null) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  reportComment: (commentId: string, reason: string) => Promise<void>;
  resolveReport: (commentId: string, keepComment: boolean) => Promise<void>;

  // Actions Suivi / Progression Leçons ("Fait / Non fait")
  toggleLessonProgress: (lessonId: string, isCompleted: boolean) => Promise<void>;

  // Actions Bibliothèque & Club
  addBook: (data: Omit<Book, 'id' | 'createdAt'>) => Promise<void>;
  updateBook: (id: string, data: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;

  // Actions Emprunts & Retours
  createLoan: (bookId: string, studentId: string, dueDate: string, notes?: string) => Promise<void>;
  returnLoan: (loanId: string, notes?: string) => Promise<void>;

  // Actions Leçons et Cours
  addLesson: (data: Omit<Lesson, 'id' | 'createdAt'>) => Promise<void>;
  updateLesson: (id: string, data: Partial<Lesson>) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;

  // Actions Annonces & Communication
  addAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>) => Promise<void>;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  togglePinAnnouncement: (id: string) => Promise<void>;
  toggleLikeAnnouncement: (id: string) => Promise<void>;
  markAnnouncementAsRead: (id: string) => Promise<void>;
  addAnnouncementComment: (announcementId: string, content: string) => Promise<void>;
  deleteAnnouncementComment: (announcementId: string, commentId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Les 3 seuls comptes officiels de Laval Academy
export const INITIAL_OFFICIAL_USERS: Student[] = [
  {
    id: 'admin_ali_bennis',
    uid: 'admin_ali_bennis',
    studentNumber: 'ADM-01',
    identifier: 'ali.bennis',
    firstName: 'Ali',
    lastName: 'Bennis',
    className: 'Direction • Laval Academy',
    email: ADMIN_ALI_EMAIL,
    status: 'active',
    role: 'admin',
    createdAt: '2026-10-01T08:00:00.000Z',
    approvedAt: '2026-10-01T08:00:00.000Z',
    approvedBy: 'Système'
  },
  {
    id: 'teacher_madame_sara',
    uid: 'teacher_madame_sara',
    studentNumber: 'ENS-01',
    identifier: 'sarah.mousamih',
    firstName: 'Madame',
    lastName: 'Sarah',
    className: 'Corps Enseignant • Laval Academy',
    email: TEACHER_SARA_EMAIL,
    status: 'active',
    role: 'teacher',
    createdAt: '2026-10-01T08:30:00.000Z',
    approvedAt: '2026-10-01T08:30:00.000Z',
    approvedBy: 'Ali Bennis'
  },
  {
    id: 'club_manager_awab',
    uid: 'club_manager_awab',
    studentNumber: 'RESP-01',
    identifier: 'awab.fellah',
    firstName: 'Awab',
    lastName: 'Fellah',
    className: 'Club de Lecture • Laval Academy',
    email: CLUB_AWAB_EMAIL,
    status: 'active',
    role: 'club_manager',
    createdAt: '2026-10-02T09:00:00.000Z',
    approvedAt: '2026-10-02T09:00:00.000Z',
    approvedBy: 'Madame Sarah'
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Nom de l'établissement
  const [schoolName, setSchoolName] = useState<string>(() => {
    return localStorage.getItem('classconnect_school_name') || 'Laval Academy';
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('classconnect_students');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filtrer rigoureusement les comptes fictifs, doublons et erreurs
          const cleaned = parsed.filter(s => !isRogueAccount(s));
          const merged = [...cleaned];
          INITIAL_OFFICIAL_USERS.forEach(official => {
            const idx = merged.findIndex(s =>
              s.id === official.id ||
              s.email.toLowerCase() === official.email.toLowerCase() ||
              (official.identifier && s.identifier === official.identifier)
            );
            if (idx === -1) {
              merged.push(official);
            } else {
              merged[idx] = { ...merged[idx], ...official };
            }
          });
          return merged;
        }
      } catch {
        // Ignorer
      }
    }
    return INITIAL_OFFICIAL_USERS;
  });

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('classconnect_books');
    return saved ? JSON.parse(saved) : [];
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('classconnect_loans');
    return saved ? JSON.parse(saved) : [];
  });

  const [lessons, setLessons] = useState<Lesson[]>(() => {
    const saved = localStorage.getItem('classconnect_lessons');
    return saved ? JSON.parse(saved) : [];
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('classconnect_announcements');
    return saved ? JSON.parse(saved) : [];
  });

  const [warnings, setWarnings] = useState<StudentWarning[]>(() => {
    const saved = localStorage.getItem('classconnect_warnings');
    return saved ? JSON.parse(saved) : [];
  });

  const [comments, setComments] = useState<LessonComment[]>(() => {
    const saved = localStorage.getItem('classconnect_comments');
    return saved ? JSON.parse(saved) : [];
  });

  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>(() => {
    const saved = localStorage.getItem('classconnect_lesson_progress');
    return saved ? JSON.parse(saved) : [];
  });

  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('classconnect_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [isUsingFirestore, setIsUsingFirestore] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Sauvegarde locale de persistance
  useEffect(() => {
    localStorage.setItem('classconnect_school_name', schoolName);
    localStorage.setItem('classconnect_students', JSON.stringify(students));
    localStorage.setItem('classconnect_books', JSON.stringify(books));
    localStorage.setItem('classconnect_loans', JSON.stringify(loans));
    localStorage.setItem('classconnect_lessons', JSON.stringify(lessons));
    localStorage.setItem('classconnect_announcements', JSON.stringify(announcements));
    localStorage.setItem('classconnect_warnings', JSON.stringify(warnings));
    localStorage.setItem('classconnect_comments', JSON.stringify(comments));
    localStorage.setItem('classconnect_lesson_progress', JSON.stringify(lessonProgress));
    localStorage.setItem('classconnect_notifications', JSON.stringify(allNotifications));
  }, [schoolName, students, books, loans, lessons, announcements, warnings, comments, lessonProgress, allNotifications]);

  // Synchronisation Firestore en temps réel dès qu'un utilisateur est connecté
  useEffect(() => {
    if (!currentUser) {
      setIsUsingFirestore(false);
      return;
    }

    setIsLoadingData(true);

    // 0. Configuration de l'établissement
    const unsubSchool = onSnapshot(doc(db, 'settings', 'school'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.name) {
          setSchoolName(data.name);
        }
      }
    }, () => {});

    // 1. Livres
    const unsubBooks = onSnapshot(collection(db, 'books'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Book));
      setBooks(loaded);
      setIsUsingFirestore(true);
      setIsLoadingData(false);
    }, (err) => {
      console.warn('Firestore books listener:', err);
      setIsLoadingData(false);
    });

    // 2. Annonces
    const unsubAnn = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(loaded);
      setIsUsingFirestore(true);
    }, (err) => {
      console.warn('Firestore announcements listener:', err);
    });

    // 3. Leçons et cours
    const unsubLessons = onSnapshot(collection(db, 'lessons'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lesson));
      setLessons(loaded);
      setIsUsingFirestore(true);
    }, (err) => {
      console.warn('Firestore lessons listener:', err);
    });

    // 4. Comptes / Élèves (si Admin, Professeur ou Responsable du Club)
    let unsubStudents = () => {};
    if (currentUser.role === 'admin' || currentUser.role === 'teacher' || currentUser.role === 'club_manager') {
      unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
        const rawDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));

        // Nettoyage automatique des comptes erronés ou faux dans Firestore
        rawDocs.forEach(async (st) => {
          if (isRogueAccount(st)) {
            try {
              await deleteDoc(doc(db, 'students', st.id));
              await deleteDoc(doc(db, 'admins', st.id)).catch(() => {});
            } catch (delErr) {
              console.warn('Nettoyage compte Firestore:', st.id, delErr);
            }
          }
        });

        const validDocs = rawDocs.filter(s => !isRogueAccount(s));

        // S'assurer que les 3 comptes officiels sont bien présents et à jour
        const merged = [...validDocs];
        INITIAL_OFFICIAL_USERS.forEach(official => {
          const idx = merged.findIndex(s =>
            s.id === official.id ||
            s.email.toLowerCase() === official.email.toLowerCase() ||
            (official.identifier && s.identifier === official.identifier)
          );
          if (idx === -1) {
            merged.push(official);
          } else {
            merged[idx] = { ...merged[idx], ...official };
          }
        });

        // Vérifier l'expiration des bannissements temporaires
        const nowMs = Date.now();
        const checkedList = merged.map(s => {
          if (s.status === 'banned' && s.banExpiresAt) {
            const expMs = new Date(s.banExpiresAt).getTime();
            if (!isNaN(expMs) && expMs <= nowMs) {
              return { ...s, status: 'active' as const, banReason: undefined, banExpiresAt: undefined, banDuration: undefined };
            }
          }
          return s;
        });

        setStudents(checkedList);
        setIsUsingFirestore(true);
      }, (err) => {
        console.warn('Firestore students listener:', err);
      });
    }

    // 5. Emprunts
    const unsubLoans = onSnapshot(collection(db, 'loans'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Loan));
      setLoans(loaded);
      setIsUsingFirestore(true);
    }, (err) => {
      console.warn('Firestore loans listener:', err);
    });

    // 6. Avertissements
    const unsubWarnings = onSnapshot(collection(db, 'student_warnings'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentWarning));
      setWarnings(loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setIsUsingFirestore(true);
    }, (err) => {
      console.warn('Firestore student_warnings listener:', err);
    });

    // 7. Commentaires de cours
    const unsubComments = onSnapshot(collection(db, 'lesson_comments'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LessonComment));
      setComments(loaded.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setIsUsingFirestore(true);
    }, (err) => {
      console.warn('Firestore lesson_comments listener:', err);
    });

    // 8. Suivi / Progression Leçons ("Fait / Non fait")
    const unsubProgress = onSnapshot(collection(db, 'lesson_progress'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LessonProgress));
      setLessonProgress(loaded);
      setIsUsingFirestore(true);
    }, (err) => {
      console.warn('Firestore lesson_progress listener:', err);
    });

    // 9. Centre de notifications
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setAllNotifications(loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setIsUsingFirestore(true);
    }, (err) => {
      console.warn('Firestore notifications listener:', err);
    });

    return () => {
      unsubSchool();
      unsubBooks();
      unsubAnn();
      unsubLessons();
      unsubStudents();
      unsubLoans();
      unsubWarnings();
      unsubComments();
      unsubProgress();
      unsubNotifications();
    };
  }, [currentUser]);

  // Nettoyage explicite des comptes doublons et erronés
  const cleanRogueAccounts = async (): Promise<number> => {
    // 1. Sauvegarde avant suppression
    localStorage.setItem(`classconnect_students_backup_${Date.now()}`, JSON.stringify(students));

    const rogueAccounts = students.filter(s => isRogueAccount(s));
    const cleaned = students.filter(s => !isRogueAccount(s));

    // Conserver les 3 officiels
    const merged = [...cleaned];
    INITIAL_OFFICIAL_USERS.forEach(official => {
      const idx = merged.findIndex(s =>
        s.id === official.id ||
        s.email.toLowerCase() === official.email.toLowerCase() ||
        (official.identifier && s.identifier === official.identifier)
      );
      if (idx === -1) {
        merged.push(official);
      } else {
        merged[idx] = { ...merged[idx], ...official };
      }
    });

    setStudents(merged);
    localStorage.setItem('classconnect_students', JSON.stringify(merged));

    // Supprimer dans Firestore si connecté
    if (isUsingFirestore) {
      for (const st of rogueAccounts) {
        if (st.id) {
          try {
            await deleteDoc(doc(db, 'students', st.id));
            await deleteDoc(doc(db, 'admins', st.id)).catch(() => {});
          } catch (delErr) {
            console.warn('Suppression compte erroné:', st.id, delErr);
          }
        }
      }
    }

    return rogueAccounts.length;
  };

  // Modification du nom de l'établissement
  const updateSchoolName = async (name: string) => {
    const trimmed = name.trim() || 'Laval Academy';
    setSchoolName(trimmed);
    localStorage.setItem('classconnect_school_name', trimmed);

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'settings', 'school'), {
          name: trimmed,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.displayName || 'Admin'
        }, { merge: true });
      } catch (err) {
        console.warn('Erreur mise à jour nom école:', err);
      }
    }
  };

  // --- GESTION DU CENTRE DE NOTIFICATIONS ---
  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    const myEmail = (currentUser.email || '').toLowerCase().trim();
    const myId = currentUser.studentId || currentUser.uid;
    const isAdmin = currentUser.role === 'admin';
    const isTeacher = currentUser.role === 'teacher';

    return allNotifications.filter(n => {
      const recEmail = (n.recipientEmail || '').toLowerCase().trim();
      if (recEmail === myEmail) return true;
      if (n.recipientId && n.recipientId === myId) return true;
      if (isAdmin && (recEmail === 'admin' || n.recipientId === 'admin_ali_bennis')) return true;
      if (isTeacher && (recEmail === 'teacher' || n.recipientId === 'teacher_madame_sara')) return true;
      return false;
    });
  }, [allNotifications, currentUser]);

  const unreadNotificationsCount = useMemo(() => {
    return userNotifications.filter(n => !n.isRead).length;
  }, [userNotifications]);

  const createNotification = async (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newNotif: AppNotification = {
      ...notif,
      id,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    setAllNotifications(prev => [newNotif, ...prev]);

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'notifications', id), newNotif);
      } catch (err) {
        console.warn('Erreur Firestore createNotification:', err);
      }
    }
  };

  const markNotificationRead = async (id: string) => {
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
      } catch (err) {
        console.warn('Erreur Firestore markNotificationRead:', err);
      }
    }
  };

  const markAllNotificationsRead = async () => {
    const unreadIds = userNotifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    setAllNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, isRead: true } : n));

    if (isUsingFirestore) {
      try {
        const batch = writeBatch(db);
        unreadIds.forEach(nId => {
          batch.update(doc(db, 'notifications', nId), { isRead: true });
        });
        await batch.commit();
      } catch (err) {
        console.warn('Erreur Firestore markAllNotificationsRead:', err);
      }
    }
  };

  const deleteNotification = async (id: string) => {
    setAllNotifications(prev => prev.filter(n => n.id !== id));
    if (isUsingFirestore) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch (err) {
        console.warn('Erreur Firestore deleteNotification:', err);
      }
    }
  };

  // --- ACTIONS GESTION DES COMPTES & RÔLES ---
  const approveAccount = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    const now = new Date().toISOString();
    const approvedBy = currentUser?.displayName || 'Admin';

    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      status: 'active',
      approvedAt: now,
      approvedBy,
      updatedAt: now
    } : s));

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'students', id), {
          status: 'active',
          approvedAt: now,
          approvedBy,
          updatedAt: now
        }, { merge: true });
      } catch (err) {
        console.warn('Erreur Firestore approveAccount:', err);
      }
    }

    // Déclencher notification d'approbation à l'élève
    if (student.email) {
      createNotification({
        recipientEmail: student.email,
        recipientId: student.id,
        recipientName: `${student.firstName} ${student.lastName}`.trim(),
        title: 'Inscription approuvée',
        message: 'Félicitations ! Votre inscription à Laval Academy (classe 2APIC-1) a été validée avec succès.',
        type: 'account_approved',
        linkPage: 'dashboard',
        targetId: id
      });
    }
  };

  const rejectAccount = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    // Protection stricte d'Ali Bennis
    if (student.email.toLowerCase() === ADMIN_ALI_EMAIL.toLowerCase() || student.role === 'admin') {
      throw new Error("Action impossible : le statut de l'administrateur principal est protégé.");
    }

    const now = new Date().toISOString();

    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      status: 'rejected',
      updatedAt: now
    } : s));

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'students', id), {
          status: 'rejected',
          updatedAt: now
        }, { merge: true });
      } catch (err) {
        console.warn('Erreur Firestore rejectAccount:', err);
      }
    }

    // Déclencher notification de refus
    if (student.email) {
      createNotification({
        recipientEmail: student.email,
        recipientId: student.id,
        recipientName: `${student.firstName} ${student.lastName}`.trim(),
        title: 'Demande d\'inscription refusée',
        message: 'Votre demande d\'inscription à Laval Academy n\'a pas été retenue par l\'administration.',
        type: 'account_rejected',
        linkPage: 'dashboard',
        targetId: id
      });
    }
  };

  const promoteToRole = async (id: string, newRole: UserRole) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    // Protection stricte d'Ali Bennis
    if (student.email.toLowerCase() === ADMIN_ALI_EMAIL.toLowerCase() || student.role === 'admin') {
      throw new Error("Action impossible : le rôle de l'administrateur principal Ali Bennis est immuable et protégé.");
    }

    // Seul Ali Bennis ou Madame Sarah peuvent modifier les rôles
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'teacher') {
      throw new Error("Permissions insuffisantes pour modifier les rôles.");
    }

    const now = new Date().toISOString();

    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      role: newRole,
      updatedAt: now
    } : s));

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'students', id), {
          role: newRole,
          updatedAt: now
        }, { merge: true });

        if (newRole === 'admin' || newRole === 'teacher') {
          await setDoc(doc(db, 'admins', id), {
            email: student.email,
            role: newRole,
            promotedAt: now,
            promotedBy: currentUser?.displayName || 'Admin'
          }, { merge: true });
        } else {
          await deleteDoc(doc(db, 'admins', id)).catch(() => {});
        }
      } catch (err) {
        console.warn('Erreur Firestore promoteToRole:', err);
      }
    }
  };

  const promoteToAdmin = async (id: string) => {
    await promoteToRole(id, 'teacher');
  };

  const demoteToStudent = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    // Protection absolue d'Ali Bennis
    if (student.email.toLowerCase() === ADMIN_ALI_EMAIL.toLowerCase() || student.role === 'admin') {
      throw new Error("Action impossible : Ali Bennis est l'administrateur principal de Laval Academy et ne peut jamais être rétrogradé.");
    }

    if (currentUser && currentUser.email.toLowerCase() === student.email.toLowerCase()) {
      throw new Error("Vous ne pouvez pas rétrograder votre propre compte.");
    }

    await promoteToRole(id, 'student');
  };

  // Bannissement avec durée et motif
  const banAccount = async (id: string, reason?: string, duration?: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    // Protection absolue d'Ali Bennis
    if (student.email.toLowerCase() === ADMIN_ALI_EMAIL.toLowerCase() || student.role === 'admin') {
      throw new Error("Action impossible : l'administrateur principal Ali Bennis ne peut en aucun cas être banni.");
    }

    if (currentUser && currentUser.email.toLowerCase() === student.email.toLowerCase()) {
      throw new Error("Vous ne pouvez pas bannir votre propre compte.");
    }

    const now = new Date();
    const finalReason = reason?.trim() || 'Accès restreint par l\'administration de Laval Academy';
    const chosenDuration = duration || 'permanent';

    let banExpiresAt: string | undefined = undefined;
    if (chosenDuration === '24h') {
      banExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else if (chosenDuration === '3d') {
      banExpiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    } else if (chosenDuration === '7d') {
      banExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (chosenDuration === '30d') {
      banExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const updatedData: Partial<Student> = {
      status: 'banned',
      banReason: finalReason,
      banDuration: chosenDuration,
      banExpiresAt,
      bannedAt: now.toISOString(),
      bannedBy: currentUser?.displayName || 'Ali Bennis (Admin)',
      updatedAt: now.toISOString()
    };

    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'students', id), updatedData, { merge: true });
      } catch (err) {
        console.warn('Erreur Firestore banAccount:', err);
      }
    }
  };

  const reactivateAccount = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    const now = new Date().toISOString();

    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      status: 'active',
      banReason: undefined,
      banDuration: undefined,
      banExpiresAt: undefined,
      updatedAt: now
    } : s));

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'students', id), {
          status: 'active',
          banReason: '',
          banDuration: null,
          banExpiresAt: null,
          updatedAt: now
        }, { merge: true });
      } catch (err) {
        console.warn('Erreur Firestore reactivateAccount:', err);
      }
    }
  };

  const suspendAccount = async (id: string, reason?: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    if (student.email.toLowerCase() === ADMIN_ALI_EMAIL.toLowerCase() || student.role === 'admin') {
      throw new Error("Action impossible : l'administrateur principal Ali Bennis ne peut en aucun cas être suspendu.");
    }

    if (currentUser && currentUser.email.toLowerCase() === student.email.toLowerCase()) {
      throw new Error("Vous ne pouvez pas suspendre votre propre compte.");
    }

    const now = new Date().toISOString();
    const finalReason = reason?.trim() || 'Suspension temporaire';

    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      status: 'suspended',
      banReason: finalReason,
      updatedAt: now
    } : s));

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'students', id), {
          status: 'suspended',
          banReason: finalReason,
          updatedAt: now
        }, { merge: true });
      } catch (err) {
        console.warn('Erreur Firestore suspendAccount:', err);
      }
    }
  };

  // --- ACTIONS ÉLÈVES ---
  const addStudent = async (data: Omit<Student, 'id' | 'createdAt'>) => {
    const id = `std_${Date.now()}`;
    const newStudent: Student = {
      ...data,
      id,
      className: data.className || '2APIC-1 • Laval Academy',
      createdAt: new Date().toISOString(),
      activeLoansCount: 0,
      overdueLoansCount: 0
    };

    setStudents(prev => [newStudent, ...prev]);

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'students', id), newStudent);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `students/${id}`);
      }
    }
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    const target = students.find(s => s.id === id);
    if (target && (target.email.toLowerCase() === ADMIN_ALI_EMAIL.toLowerCase() || target.role === 'admin')) {
      if (data.role && data.role !== 'admin') {
        throw new Error("Impossible de modifier le rôle d'administrateur principal d'Ali Bennis.");
      }
    }

    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'students', id), {
          ...data,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `students/${id}`);
      }
    }
  };

  // Suppression définitive d'un élève avec nettoyage de ses données
  const deleteStudent = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (student && (student.email.toLowerCase() === ADMIN_ALI_EMAIL.toLowerCase() || student.role === 'admin')) {
      throw new Error("Action impossible : le compte administrateur principal d'Ali Bennis ne peut jamais être supprimé.");
    }

    setStudents(prev => prev.filter(s => s.id !== id));

    if (isUsingFirestore) {
      try {
        await deleteDoc(doc(db, 'students', id));
        await deleteDoc(doc(db, 'admins', id)).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
      }
    }
  };

  const importStudentsBatch = async (newStudents: Omit<Student, 'id' | 'createdAt'>[]) => {
    const now = new Date().toISOString();
    const formattedStudents: Student[] = newStudents.map((s, idx) => ({
      ...s,
      id: `std_imp_${Date.now()}_${idx}`,
      className: s.className || '2APIC-1 • Laval Academy',
      createdAt: now,
      activeLoansCount: 0,
      overdueLoansCount: 0
    }));

    setStudents(prev => [...formattedStudents, ...prev]);

    if (isUsingFirestore) {
      try {
        const batch = writeBatch(db);
        formattedStudents.forEach(st => {
          batch.set(doc(db, 'students', st.id), st);
        });
        await batch.commit();
      } catch (err) {
        console.error('Batch import failed:', err);
      }
    }

    return formattedStudents.length;
  };

  // --- ACTIONS AVERTISSEMENTS ---
  const addWarning = async (
    studentId: string,
    reason: string,
    message: string,
    severity: WarningSeverity = 'medium'
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) throw new Error("Élève introuvable");

    const id = `warn_${Date.now()}`;
    const authorTitle = currentUser?.role === 'admin'
      ? 'Ali Bennis (Admin)'
      : currentUser?.role === 'teacher'
      ? 'Madame Sarah (Professeur)'
      : (currentUser?.displayName || 'Administration');

    const newWarning: StudentWarning = {
      id,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      studentEmail: student.email,
      reason: reason.trim(),
      message: message.trim(),
      severity,
      issuedBy: authorTitle,
      issuedByRole: currentUser?.role || 'teacher',
      createdAt: new Date().toISOString(),
      read: false
    };

    setWarnings(prev => [newWarning, ...prev]);

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'student_warnings', id), newWarning);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `student_warnings/${id}`);
      }
    }

    // Déclencher notification à l'élève sanctionné
    if (student.email) {
      createNotification({
        recipientEmail: student.email,
        recipientId: student.id,
        recipientName: `${student.firstName} ${student.lastName}`.trim(),
        title: 'Avertissement disciplinaire',
        message: `Vous avez reçu un avertissement officiel : « ${reason.trim()} ».`,
        type: 'warning',
        linkPage: 'student_portal',
        targetId: id
      });
    }
  };

  const markWarningRead = async (warningId: string) => {
    const now = new Date().toISOString();
    setWarnings(prev => prev.map(w => w.id === warningId ? { ...w, read: true, acknowledgedAt: now } : w));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'student_warnings', warningId), {
          read: true,
          acknowledgedAt: now
        });
      } catch (err) {
        console.warn('Erreur Firestore markWarningRead:', err);
      }
    }
  };

  const deleteWarning = async (warningId: string) => {
    setWarnings(prev => prev.filter(w => w.id !== warningId));

    if (isUsingFirestore) {
      try {
        await deleteDoc(doc(db, 'student_warnings', warningId));
      } catch (err) {
        console.warn('Erreur Firestore deleteWarning:', err);
      }
    }
  };

  // --- ACTIONS COMMENTAIRES DE COURS ---
  const addComment = async (lessonId: string, content: string, parentId?: string | null) => {
    if (!currentUser) throw new Error("Vous devez être connecté pour commenter.");
    const trimmed = content.trim();
    if (!trimmed) throw new Error("Le commentaire ne peut pas être vide.");

    const id = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isTeacher = currentUser.role === 'teacher';
    const isAdmin = currentUser.role === 'admin';

    const newComment: LessonComment = {
      id,
      lessonId,
      authorId: currentUser.studentId || currentUser.uid,
      authorName: currentUser.displayName || 'Utilisateur',
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      content: trimmed,
      createdAt: new Date().toISOString(),
      parentId: parentId || null,
      isTeacherReply: isTeacher || isAdmin
    };

    setComments(prev => [...prev, newComment]);

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'lesson_comments', id), newComment);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `lesson_comments/${id}`);
      }
    }

    // Déclencher les notifications de commentaires
    if (parentId) {
      const parentComment = comments.find(c => c.id === parentId);
      if (parentComment && parentComment.authorEmail && parentComment.authorEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
        const isTeacherSender = currentUser.role === 'teacher' || currentUser.role === 'admin';
        createNotification({
          recipientEmail: parentComment.authorEmail,
          recipientId: parentComment.authorId,
          recipientName: parentComment.authorName,
          title: isTeacherSender ? 'Réponse de l\'enseignant' : 'Nouvelle réponse à votre commentaire',
          message: `${currentUser.displayName || 'Un utilisateur'} a répondu à votre commentaire.`,
          type: isTeacherSender ? 'teacher_reply' : 'discussion_reply',
          linkPage: 'lessons',
          targetId: lessonId
        });
      }

      // Notifier les autres participants du même fil
      const threadComments = comments.filter(c => c.parentId === parentId || c.id === parentId);
      const notifiedEmails = new Set<string>([
        currentUser.email.toLowerCase(),
        parentComment?.authorEmail.toLowerCase() || ''
      ]);

      for (const tc of threadComments) {
        const email = (tc.authorEmail || '').toLowerCase();
        if (email && !notifiedEmails.has(email)) {
          notifiedEmails.add(email);
          createNotification({
            recipientEmail: tc.authorEmail,
            recipientId: tc.authorId,
            recipientName: tc.authorName,
            title: 'Nouvelle réponse dans la discussion',
            message: `${currentUser.displayName || 'Un utilisateur'} a également répondu dans la discussion.`,
            type: 'discussion_reply',
            linkPage: 'lessons',
            targetId: lessonId
          });
        }
      }
    }
  };

  const deleteComment = async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));

    if (isUsingFirestore) {
      try {
        await deleteDoc(doc(db, 'lesson_comments', commentId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `lesson_comments/${commentId}`);
      }
    }
  };

  const reportComment = async (commentId: string, reason: string) => {
    const reporterName = currentUser?.displayName || 'Utilisateur';
    const now = new Date().toISOString();

    setComments(prev => prev.map(c => c.id === commentId ? {
      ...c,
      isReported: true,
      reportReason: reason,
      reportedBy: reporterName,
      reportedAt: now
    } : c));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'lesson_comments', commentId), {
          isReported: true,
          reportReason: reason,
          reportedBy: reporterName,
          reportedAt: now
        });
      } catch (err) {
        console.warn('Erreur Firestore reportComment:', err);
      }
    }
  };

  const resolveReport = async (commentId: string, keepComment: boolean) => {
    if (!keepComment) {
      await deleteComment(commentId);
      return;
    }

    setComments(prev => prev.map(c => c.id === commentId ? {
      ...c,
      isReported: false,
      reportReason: undefined,
      reportedBy: undefined,
      reportedAt: undefined
    } : c));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'lesson_comments', commentId), {
          isReported: false,
          reportReason: null,
          reportedBy: null,
          reportedAt: null
        });
      } catch (err) {
        console.warn('Erreur Firestore resolveReport:', err);
      }
    }
  };

  // --- ACTIONS PROGRESSION LEÇON ("Fait / Non fait") ---
  const toggleLessonProgress = async (lessonId: string, isCompleted: boolean) => {
    if (!currentUser) throw new Error("Vous devez être connecté.");

    const studentId = currentUser.studentId || currentUser.uid;
    const progressId = `${lessonId}_${studentId}`;
    const now = new Date().toISOString();

    const record: LessonProgress = {
      id: progressId,
      lessonId,
      studentId,
      studentName: currentUser.displayName || 'Élève',
      studentEmail: currentUser.email,
      isCompleted,
      completedAt: isCompleted ? now : null,
      updatedAt: now
    };

    setLessonProgress(prev => {
      const idx = prev.findIndex(p => p.id === progressId);
      if (idx === -1) {
        return [...prev, record];
      }
      const updated = [...prev];
      updated[idx] = record;
      return updated;
    });

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'lesson_progress', progressId), record, { merge: true });
      } catch (err) {
        console.warn('Erreur Firestore toggleLessonProgress:', err);
      }
    }
  };

  // --- ACTIONS LIVRES ---
  const addBook = async (data: Omit<Book, 'id' | 'createdAt'>) => {
    const id = `bk_${Date.now()}`;
    const newBook: Book = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };

    setBooks(prev => [newBook, ...prev]);

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'books', id), newBook);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `books/${id}`);
      }
    }
  };

  const updateBook = async (id: string, data: Partial<Book>) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'books', id), data);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `books/${id}`);
      }
    }
  };

  const deleteBook = async (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));

    if (isUsingFirestore) {
      try {
        await deleteDoc(doc(db, 'books', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `books/${id}`);
      }
    }
  };

  // --- ACTIONS EMPRUNTS & RETOURS ---
  const createLoan = async (bookId: string, studentId: string, dueDate: string, notes?: string) => {
    const book = books.find(b => b.id === bookId);
    const student = students.find(s => s.id === studentId);

    if (!book) throw new Error('Livre non trouvé');
    if (!student) throw new Error('Élève non trouvé');
    if (book.availableCopies <= 0) throw new Error('Aucun exemplaire disponible pour ce livre');

    const loanId = `ln_${Date.now()}`;
    const newLoan: Loan = {
      id: loanId,
      bookId,
      bookTitle: book.title,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      studentEmail: student.email,
      loanDate: new Date().toISOString().slice(0, 10),
      dueDate,
      returnDate: null,
      status: 'active',
      notes: notes || '',
      processedBy: currentUser?.displayName || 'Responsable',
      createdAt: new Date().toISOString()
    };

    setLoans(prev => [newLoan, ...prev]);

    const newAvailable = Math.max(0, book.availableCopies - 1);
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, availableCopies: newAvailable } : b));
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, activeLoansCount: (s.activeLoansCount || 0) + 1 } : s));

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'loans', loanId), newLoan);
        await updateDoc(doc(db, 'books', bookId), { availableCopies: newAvailable });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `loans/${loanId}`);
      }
    }
  };

  const returnLoan = async (loanId: string, notes?: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) throw new Error('Emprunt non trouvé');
    if (loan.status === 'returned') return;

    const returnDate = new Date().toISOString().slice(0, 10);
    const updatedNotes = notes ? (loan.notes ? `${loan.notes} | ${notes}` : notes) : loan.notes;

    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, returnDate, status: 'returned', notes: updatedNotes } : l));

    const book = books.find(b => b.id === loan.bookId);
    if (book) {
      const newAvailable = Math.min(book.totalCopies, book.availableCopies + 1);
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, availableCopies: newAvailable } : b));
      if (isUsingFirestore) {
        try {
          await updateDoc(doc(db, 'books', book.id), { availableCopies: newAvailable });
        } catch {
          // Ignorer
        }
      }
    }

    setStudents(prev => prev.map(s => {
      if (s.id === loan.studentId) {
        const wasOverdue = loan.status === 'overdue';
        return {
          ...s,
          activeLoansCount: Math.max(0, (s.activeLoansCount || 1) - 1),
          overdueLoansCount: wasOverdue ? Math.max(0, (s.overdueLoansCount || 1) - 1) : s.overdueLoansCount
        };
      }
      return s;
    }));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'loans', loanId), {
          returnDate,
          status: 'returned',
          notes: updatedNotes
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `loans/${loanId}`);
      }
    }
  };

  // --- ACTIONS LEÇONS ET COURS ---
  const addLesson = async (data: Omit<Lesson, 'id' | 'createdAt'>) => {
    const id = `lsn_${Date.now()}`;
    const newLesson: Lesson = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      status: data.status || 'published'
    };

    setLessons(prev => [newLesson, ...prev]);

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'lessons', id), newLesson);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `lessons/${id}`);
      }
    }

    // Notifier tous les élèves actifs de la classe
    const activeStudents = students.filter(s => s.role === 'student' && s.status === 'active');
    const teacherName = currentUser?.displayName || 'Votre professeur';
    for (const student of activeStudents) {
      createNotification({
        recipientEmail: student.email,
        recipientId: student.id,
        recipientName: `${student.firstName} ${student.lastName}`.trim(),
        title: `Nouveau cours : ${data.title}`,
        message: `${teacherName} a publié un nouveau cours (${data.subject}).`,
        type: 'new_lesson',
        linkPage: 'lessons',
        targetId: id
      });

      if (data.attachments && data.attachments.length > 0) {
        createNotification({
          recipientEmail: student.email,
          recipientId: student.id,
          recipientName: `${student.firstName} ${student.lastName}`.trim(),
          title: `Nouveau document partagé`,
          message: `${data.attachments.length} nouvelle(s) ressource(s) à télécharger pour « ${data.title} ».`,
          type: 'new_resource',
          linkPage: 'lessons',
          targetId: id
        });
      }
    }
  };

  const updateLesson = async (id: string, data: Partial<Lesson>) => {
    const prevLesson = lessons.find(l => l.id === id);
    setLessons(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'lessons', id), data);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `lessons/${id}`);
      }
    }

    // Si de nouvelles pièces jointes ou ressources ont été ajoutées
    const prevCount = prevLesson?.attachments?.length || 0;
    const newCount = data.attachments?.length || 0;
    if (newCount > prevCount) {
      const activeStudents = students.filter(s => s.role === 'student' && s.status === 'active');
      const lessonTitle = data.title || prevLesson?.title || 'Cours';
      for (const student of activeStudents) {
        createNotification({
          recipientEmail: student.email,
          recipientId: student.id,
          recipientName: `${student.firstName} ${student.lastName}`.trim(),
          title: 'Nouveau document partagé',
          message: `Une nouvelle ressource a été ajoutée au cours « ${lessonTitle} ».`,
          type: 'new_resource',
          linkPage: 'lessons',
          targetId: id
        });
      }
    }
  };

  const deleteLesson = async (id: string) => {
    setLessons(prev => prev.filter(l => l.id !== id));

    if (isUsingFirestore) {
      try {
        await deleteDoc(doc(db, 'lessons', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `lessons/${id}`);
      }
    }
  };

  // --- ACTIONS ANNONCES & COMMUNICATION MULTIMÉDIA ---
  const addAnnouncement = async (data: Omit<Announcement, 'id' | 'createdAt'>) => {
    const id = `ann_${Date.now()}`;
    const newAnn: Announcement = {
      ...data,
      id,
      likes: data.likes || [],
      readBy: data.readBy || [],
      comments: data.comments || [],
      createdAt: new Date().toISOString()
    };

    setAnnouncements(prev => [newAnn, ...prev]);

    if (isUsingFirestore) {
      try {
        await setDoc(doc(db, 'announcements', id), newAnn);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `announcements/${id}`);
      }
    }

    // Notifier les destinataires concernés selon audience
    const audience = data.audience || 'all';
    const targetRecipients: { email: string; id: string; name: string }[] = [];

    if (audience === 'all' || audience === 'class_2apic_1' || audience === 'all_students') {
      students.filter(s => s.role === 'student' && s.status === 'active').forEach(s => {
        targetRecipients.push({ email: s.email, id: s.id, name: `${s.firstName} ${s.lastName}`.trim() });
      });
    }

    if (audience === 'all' || audience === 'class_2apic_1' || audience === 'all_teachers') {
      students.filter(s => (s.role === 'teacher' || s.role === 'admin') && s.status === 'active').forEach(s => {
        targetRecipients.push({ email: s.email, id: s.id, name: `${s.firstName} ${s.lastName}`.trim() });
      });
    }

    const currentEmail = currentUser?.email?.toLowerCase();
    const uniqueMap = new Map<string, { email: string; id: string; name: string }>();
    targetRecipients.forEach(r => {
      if (r.email && r.email.toLowerCase() !== currentEmail) {
        uniqueMap.set(r.email.toLowerCase(), r);
      }
    });

    for (const r of uniqueMap.values()) {
      createNotification({
        recipientEmail: r.email,
        recipientId: r.id,
        recipientName: r.name,
        title: data.isImportant ? `Annonce importante : ${data.title}` : `Nouvelle annonce : ${data.title}`,
        message: `${data.authorName || 'Laval Academy'} : « ${data.content.slice(0, 90)}${data.content.length > 90 ? '...' : ''} »`,
        type: 'new_announcement',
        linkPage: 'announcements',
        targetId: id
      });
    }
  };

  const updateAnnouncement = async (id: string, data: Partial<Announcement>) => {
    const updated = { ...data, updatedAt: new Date().toISOString() };
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'announcements', id), updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `announcements/${id}`);
      }
    }
  };

  const deleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));

    if (isUsingFirestore) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
      }
    }
  };

  const togglePinAnnouncement = async (id: string) => {
    const ann = announcements.find(a => a.id === id);
    if (!ann) return;
    const newPinned = !ann.isPinned;

    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isPinned: newPinned } : a));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'announcements', id), { isPinned: newPinned });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `announcements/${id}`);
      }
    }
  };

  const toggleLikeAnnouncement = async (id: string) => {
    if (!currentUser) return;
    const userIdentifier = currentUser.email || currentUser.uid;
    const ann = announcements.find(a => a.id === id);
    if (!ann) return;

    const currentLikes = ann.likes || [];
    const hasLiked = currentLikes.includes(userIdentifier);
    const newLikes = hasLiked
      ? currentLikes.filter(u => u !== userIdentifier)
      : [...currentLikes, userIdentifier];

    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, likes: newLikes } : a));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'announcements', id), { likes: newLikes });
      } catch (err) {
        console.warn('Erreur like annonce:', err);
      }
    }
  };

  const markAnnouncementAsRead = async (id: string) => {
    if (!currentUser) return;
    const ann = announcements.find(a => a.id === id);
    if (!ann) return;

    const currentReads = ann.readBy || [];
    const alreadyRead = currentReads.some(r => r.userEmail?.toLowerCase() === currentUser.email?.toLowerCase());
    if (alreadyRead) return;

    const newRecord: AnnouncementReadRecord = {
      userId: currentUser.studentId || currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.displayName,
      readAt: new Date().toISOString()
    };
    const newReads = [...currentReads, newRecord];

    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, readBy: newReads } : a));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'announcements', id), { readBy: newReads });
      } catch (err) {
        console.warn('Erreur markAnnouncementAsRead:', err);
      }
    }
  };

  const addAnnouncementComment = async (announcementId: string, content: string) => {
    if (!currentUser) throw new Error('Vous devez être connecté.');
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Le commentaire ne peut pas être vide.');

    const ann = announcements.find(a => a.id === announcementId);
    if (!ann) throw new Error('Annonce introuvable.');

    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newComment: AnnouncementComment = {
      id: commentId,
      announcementId,
      authorId: currentUser.studentId || currentUser.uid,
      authorName: currentUser.displayName || 'Utilisateur',
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    const newComments = [...(ann.comments || []), newComment];
    setAnnouncements(prev => prev.map(a => a.id === announcementId ? { ...a, comments: newComments } : a));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'announcements', announcementId), { comments: newComments });
      } catch (err) {
        console.warn('Erreur addAnnouncementComment:', err);
      }
    }

    // Notifier l'auteur de l'annonce si différent du commentateur
    if (ann.authorEmail && ann.authorEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      createNotification({
        recipientEmail: ann.authorEmail,
        recipientId: ann.authorId,
        recipientName: ann.authorName,
        title: 'Nouveau commentaire sur votre annonce',
        message: `${currentUser.displayName || 'Un utilisateur'} a commenté votre publication « ${ann.title} ».`,
        type: 'announcement_reply',
        linkPage: 'announcements',
        targetId: announcementId
      });
    }
  };

  const deleteAnnouncementComment = async (announcementId: string, commentId: string) => {
    const ann = announcements.find(a => a.id === announcementId);
    if (!ann) return;

    const filtered = (ann.comments || []).filter(c => c.id !== commentId);
    setAnnouncements(prev => prev.map(a => a.id === announcementId ? { ...a, comments: filtered } : a));

    if (isUsingFirestore) {
      try {
        await updateDoc(doc(db, 'announcements', announcementId), { comments: filtered });
      } catch (err) {
        console.warn('Erreur deleteAnnouncementComment:', err);
      }
    }
  };

  // --- CALCUL DYNAMIQUE DU DASHBOARD ---
  const dashboardStats: DashboardStats = useMemo(() => {
    const studentUsers = students.filter(s => s.role === 'student');
    const totalStudents = studentUsers.length;
    const activeStudents = studentUsers.filter(s => s.status === 'active').length;
    const pendingStudents = studentUsers.filter(s => s.status === 'pending').length;
    const bannedStudents = studentUsers.filter(s => s.status === 'banned' || s.status === 'suspended').length;

    const totalCopies = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
    const availableBooks = books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
    const borrowedBooks = totalCopies - availableBooks;

    const unreturnedBooks = loans.filter(l => l.status === 'active' || l.status === 'overdue').length;

    const recentActivities: ClubActivity[] = [];

    loans.slice(0, 4).forEach(l => {
      recentActivities.push({
        id: `act_${l.id}`,
        type: l.status === 'returned' ? 'return' : 'loan',
        title: l.status === 'returned' ? `Retour : ${l.bookTitle}` : `Emprunt : ${l.bookTitle}`,
        description: `${l.studentName} (${l.dueDate ? `retour prévu le ${l.dueDate}` : ''})`,
        date: l.loanDate,
        actor: l.processedBy
      });
    });

    announcements.slice(0, 2).forEach(a => {
      recentActivities.push({
        id: `act_ann_${a.id}`,
        type: 'announcement',
        title: a.title,
        description: a.content.slice(0, 75) + '...',
        date: a.createdAt.slice(0, 10),
        actor: a.authorName
      });
    });

    return {
      totalStudents,
      activeStudents,
      pendingStudents,
      bannedStudents,
      totalLessons: lessons.length,
      totalBooks: books.length,
      availableBooks,
      borrowedBooks,
      unreturnedBooks,
      recentClubActivities: recentActivities.sort((a, b) => b.date.localeCompare(a.date))
    };
  }, [students, books, loans, lessons, announcements]);

  return (
    <DataContext.Provider
      value={{
        schoolName,
        updateSchoolName,
        students,
        books,
        loans,
        lessons,
        announcements,
        warnings,
        comments,
        lessonProgress,
        notifications: userNotifications,
        unreadNotificationsCount,
        dashboardStats,
        isUsingFirestore,
        isLoadingData,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        createNotification,
        approveAccount,
        rejectAccount,
        promoteToRole,
        promoteToAdmin,
        demoteToStudent,
        banAccount,
        reactivateAccount,
        suspendAccount,
        cleanRogueAccounts,
        addStudent,
        updateStudent,
        deleteStudent,
        importStudentsBatch,
        addWarning,
        markWarningRead,
        deleteWarning,
        addComment,
        deleteComment,
        reportComment,
        resolveReport,
        toggleLessonProgress,
        addBook,
        updateBook,
        deleteBook,
        createLoan,
        returnLoan,
        addLesson,
        updateLesson,
        deleteLesson,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        togglePinAnnouncement,
        toggleLikeAnnouncement,
        markAnnouncementAsRead,
        addAnnouncementComment,
        deleteAnnouncementComment
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
