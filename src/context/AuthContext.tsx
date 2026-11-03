import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FbUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { AppUser, StudentStatus, UserRole } from '../types';

interface AuthContextType {
  currentUser: AppUser | null;
  fbUser: FbUser | null;
  isLoading: boolean;
  loginWithIdentifier: (identifier: string, pass: string) => Promise<void>;
  loginWithEmail: (identifierOrEmail: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, firstName: string, lastName: string, className?: string, identifier?: string) => Promise<void>;
  resetPassword: (emailOrIdentifier: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginAs: (role: 'admin' | 'teacher' | 'club_manager' | 'student') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Informations officielles des comptes d'administration et d'encadrement de Laval Academy
export const ADMIN_ALI_EMAIL = 'alibennis3004@gmail.com';
export const ADMIN_ALI_IDENTIFIER = 'alibennis3004@gmail.com';
export const ADMIN_ALI_IDENTIFIER_ALT = 'ali.bennis';
export const ADMIN_ALI_PASSWORD = 'Alix_2013';

// Compte Madame Sarah
export const TEACHER_SARAH_NAME = 'Madame Sarah';
export const TEACHER_SARAH_IDENTIFIER = 'sarah.mousamih';
export const TEACHER_SARAH_PASSWORD = 'sara_mosamih';
export const TEACHER_SARA_EMAIL = 'sarah.mousamih@lavalacademy.ma';
export const TEACHER_SARA_EMAIL_LEGACY = 'madame.sara@lavalacademy.ma';
export const TEACHER_SARA_PASSWORD = TEACHER_SARAH_PASSWORD;

// Compte Awab Fellah (Aweb Fellah)
export const CLUB_AWAB_NAME = 'Awab Fellah';
export const CLUB_AWAB_IDENTIFIER = 'awab.fellah';
export const CLUB_AWAB_PASSWORD = 'awab_fellah';
export const CLUB_AWAB_EMAIL = 'awab.fellah@lavalacademy.ma';
export const CLUB_AWAB_EMAIL_LEGACY = 'awab@lavalacademy.ma';

// Alias pour compatibilité
export const DEFAULT_TEACHER_EMAIL = ADMIN_ALI_EMAIL;

const SESSION_STORAGE_KEY = 'classconnect_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignorer
    }
    return null;
  });

  const [fbUser, setFbUser] = useState<FbUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronisation en temps réel du profil depuis Firestore si un utilisateur est connecté
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    if (currentUser?.studentId) {
      const userDocRef = doc(db, 'students', currentUser.studentId);
      unsubSnapshot = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const studentData = snapshot.data();
          const email = (currentUser.email || '').toLowerCase().trim();
          const isAliAdmin = email === ADMIN_ALI_EMAIL.toLowerCase();

          const role: UserRole = isAliAdmin ? 'admin' : (studentData.role || 'student');
          const status: StudentStatus = isAliAdmin ? 'active' : (studentData.status || 'active');

          setCurrentUser(prev => {
            if (!prev) return null;
            const updated: AppUser = {
              ...prev,
              role,
              status,
              isAuthorized: isAliAdmin || status === 'active',
              studentNumber: studentData.studentNumber || prev.studentNumber,
              className: studentData.className || prev.className,
              schoolName: 'Laval Academy'
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
        }
      }, (err) => {
        console.warn('Erreur écoute profil utilisateur:', err);
      });
    }

    return () => {
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [currentUser?.studentId]);

  // Initialisation et gestion Firebase Auth
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);

      if (!user) {
        if (unsubSnapshot) unsubSnapshot();
        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!savedSession) {
          setCurrentUser(null);
        }
        setIsLoading(false);
        return;
      }

      const email = user.email?.toLowerCase().trim() || '';
      const isAliAdmin = email === ADMIN_ALI_EMAIL.toLowerCase();
      const isMadameSara = email === TEACHER_SARA_EMAIL.toLowerCase();
      const isAwab = email === CLUB_AWAB_EMAIL.toLowerCase();

      const userDocRef = doc(db, 'students', user.uid);

      unsubSnapshot = onSnapshot(userDocRef, async (snapshot) => {
        if (snapshot.exists()) {
          const studentData = snapshot.data();
          let role: UserRole = studentData.role || 'student';
          if (isAliAdmin) role = 'admin';
          else if (isMadameSara) role = 'teacher';
          else if (isAwab) role = 'club_manager';

          let status: StudentStatus = studentData.status || 'active';
          if (isAliAdmin) status = 'active';

          let displayName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim();
          if (isAliAdmin) displayName = 'Ali Bennis';
          else if (isMadameSara) displayName = 'Madame Sara';
          else if (isAwab) displayName = 'Awab';

          const appUser: AppUser = {
            uid: user.uid,
            email: user.email || email,
            displayName: displayName || user.displayName || email,
            photoURL: user.photoURL || undefined,
            role,
            status,
            isAuthorized: isAliAdmin || status === 'active',
            studentId: user.uid,
            studentNumber: studentData.studentNumber,
            className: studentData.className || '2APIC-1 • Laval Academy',
            schoolName: 'Laval Academy'
          };

          setCurrentUser(appUser);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(appUser));
          setIsLoading(false);
        } else {
          // Document non encore existant dans Firestore
          let role: UserRole = 'student';
          let displayName = user.displayName || email;
          let studentNumber = `LA-${Math.floor(100 + Math.random() * 900)}`;

          if (isAliAdmin) {
            role = 'admin';
            displayName = 'Ali Bennis';
            studentNumber = 'ADM-01';
          } else if (isMadameSara) {
            role = 'teacher';
            displayName = 'Madame Sara';
            studentNumber = 'ENS-01';
          } else if (isAwab) {
            role = 'club_manager';
            displayName = 'Awab';
            studentNumber = 'RESP-01';
          }

          const newUser: AppUser = {
            uid: user.uid,
            email: user.email || email,
            displayName,
            role,
            status: 'active',
            isAuthorized: true,
            studentId: user.uid,
            studentNumber,
            className: '2APIC-1 • Laval Academy',
            schoolName: 'Laval Academy'
          };

          setCurrentUser(newUser);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));

          try {
            await setDoc(userDocRef, {
              id: user.uid,
              uid: user.uid,
              studentNumber,
              firstName: displayName.split(' ')[0] || displayName,
              lastName: displayName.split(' ').slice(1).join(' ') || '',
              className: '2APIC-1 • Laval Academy',
              email: user.email || email,
              status: 'active',
              role,
              createdAt: new Date().toISOString(),
              approvedAt: new Date().toISOString()
            }, { merge: true });

            if (role === 'admin' || role === 'teacher') {
              await setDoc(doc(db, 'admins', user.uid), {
                email: user.email || email,
                role,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          } catch {
            // Ignorer
          }

          setIsLoading(false);
        }
      }, (err) => {
        console.warn('Erreur listener profil Firebase:', err);
        setIsLoading(false);
      });
    });

    return () => {
      unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  // Connexion sécurisée par identifiant personnel ou e-mail + mot de passe
  const loginWithIdentifier = async (rawInput: string, pass: string) => {
    setIsLoading(true);
    const cleanId = rawInput.trim().toLowerCase();

    // 1. COMPTE ADMIN PRINCIPAL : ALI BENNIS
    if (
      cleanId === ADMIN_ALI_EMAIL.toLowerCase() ||
      cleanId === 'ali.bennis' ||
      cleanId === 'alibennis' ||
      cleanId === 'alibennis3004'
    ) {
      if (pass !== ADMIN_ALI_PASSWORD) {
        setIsLoading(false);
        throw new Error('Accès refusé : identifiant ou mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.');
      }

      try {
        await signInWithEmailAndPassword(auth, ADMIN_ALI_EMAIL, pass);
      } catch (authErr: any) {
        console.info('Connexion Ali Bennis (directe):', authErr?.code || authErr);
      }

      const adminUser: AppUser = {
        uid: 'admin_ali_bennis',
        email: ADMIN_ALI_EMAIL,
        identifier: 'ali.bennis',
        displayName: 'Ali Bennis',
        role: 'admin',
        status: 'active',
        isAuthorized: true,
        studentId: 'admin_ali_bennis',
        studentNumber: 'ADM-01',
        className: 'Direction • Laval Academy',
        schoolName: 'Laval Academy'
      };

      setCurrentUser(adminUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(adminUser));

      // Synchroniser Firestore
      try {
        await setDoc(doc(db, 'students', 'admin_ali_bennis'), {
          id: 'admin_ali_bennis',
          studentNumber: 'ADM-01',
          identifier: 'ali.bennis',
          firstName: 'Ali',
          lastName: 'Bennis',
          className: 'Direction • Laval Academy',
          email: ADMIN_ALI_EMAIL,
          status: 'active',
          role: 'admin',
          uid: 'admin_ali_bennis',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(db, 'admins', 'admin_ali_bennis'), {
          email: ADMIN_ALI_EMAIL,
          role: 'admin',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Sync Firestore Ali Bennis:', fsErr);
      }

      setIsLoading(false);
      return;
    }

    // 2. COMPTE PROFESSEUR : MADAME SARAH (Identifiant: sarah.mousamih / Mot de passe: sara_mosamih)
    if (
      cleanId === TEACHER_SARAH_IDENTIFIER.toLowerCase() ||
      cleanId === 'sara.mousamih' ||
      cleanId === TEACHER_SARA_EMAIL.toLowerCase() ||
      cleanId === TEACHER_SARA_EMAIL_LEGACY.toLowerCase() ||
      cleanId === 'sarah' ||
      cleanId === 'sara'
    ) {
      if (pass !== TEACHER_SARAH_PASSWORD && pass !== 'Sara_2026') {
        setIsLoading(false);
        throw new Error('Accès refusé : identifiant ou mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.');
      }

      try {
        await signInWithEmailAndPassword(auth, TEACHER_SARA_EMAIL, pass);
      } catch (authErr: any) {
        console.info('Connexion Madame Sarah (directe):', authErr?.code || authErr);
      }

      const teacherUser: AppUser = {
        uid: 'teacher_madame_sara',
        email: TEACHER_SARA_EMAIL,
        identifier: 'sarah.mousamih',
        displayName: 'Madame Sarah',
        role: 'teacher',
        status: 'active',
        isAuthorized: true,
        studentId: 'teacher_madame_sara',
        studentNumber: 'ENS-01',
        className: 'Corps Enseignant • Laval Academy',
        schoolName: 'Laval Academy'
      };

      setCurrentUser(teacherUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(teacherUser));

      try {
        await setDoc(doc(db, 'students', 'teacher_madame_sara'), {
          id: 'teacher_madame_sara',
          studentNumber: 'ENS-01',
          identifier: 'sarah.mousamih',
          firstName: 'Madame',
          lastName: 'Sarah',
          className: 'Corps Enseignant • Laval Academy',
          email: TEACHER_SARA_EMAIL,
          status: 'active',
          role: 'teacher',
          uid: 'teacher_madame_sara',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(db, 'admins', 'teacher_madame_sara'), {
          email: TEACHER_SARA_EMAIL,
          role: 'teacher',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Sync Firestore Madame Sarah:', fsErr);
      }

      setIsLoading(false);
      return;
    }

    // 3. COMPTE RESPONSABLE DU CLUB : AWAB FELLAH (Identifiant: awab.fellah / Mot de passe: awab_fellah)
    if (
      cleanId === CLUB_AWAB_IDENTIFIER.toLowerCase() ||
      cleanId === 'aweb.fellah' ||
      cleanId === CLUB_AWAB_EMAIL.toLowerCase() ||
      cleanId === CLUB_AWAB_EMAIL_LEGACY.toLowerCase() ||
      cleanId === 'awab' ||
      cleanId === 'aweb'
    ) {
      if (pass !== CLUB_AWAB_PASSWORD && pass !== 'Awab_2026') {
        setIsLoading(false);
        throw new Error('Accès refusé : identifiant ou mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.');
      }

      try {
        await signInWithEmailAndPassword(auth, CLUB_AWAB_EMAIL, pass);
      } catch (authErr: any) {
        console.info('Connexion Awab Fellah (directe):', authErr?.code || authErr);
      }

      const clubUser: AppUser = {
        uid: 'club_manager_awab',
        email: CLUB_AWAB_EMAIL,
        identifier: 'awab.fellah',
        displayName: 'Awab Fellah',
        role: 'club_manager',
        status: 'active',
        isAuthorized: true,
        studentId: 'club_manager_awab',
        studentNumber: 'RESP-01',
        className: 'Club de Lecture • Laval Academy',
        schoolName: 'Laval Academy'
      };

      setCurrentUser(clubUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(clubUser));

      try {
        await setDoc(doc(db, 'students', 'club_manager_awab'), {
          id: 'club_manager_awab',
          studentNumber: 'RESP-01',
          identifier: 'awab.fellah',
          firstName: 'Awab',
          lastName: 'Fellah',
          className: 'Club de Lecture • Laval Academy',
          email: CLUB_AWAB_EMAIL,
          status: 'active',
          role: 'club_manager',
          uid: 'club_manager_awab',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Sync Firestore Awab Fellah:', fsErr);
      }

      setIsLoading(false);
      return;
    }

    // 4. AUTRES COMPTES (ÉLÈVES) : RECHERCHE PAR IDENTIFIANT, MATRICULE OU EMAIL
    let foundDocData: any = null;
    let foundDocId: string | null = null;

    // 4.1 Recherche dans Firestore
    try {
      // Recherche par identifiant
      const qId = query(collection(db, 'students'), where('identifier', '==', cleanId));
      const snapId = await getDocs(qId);
      if (!snapId.empty) {
        foundDocId = snapId.docs[0].id;
        foundDocData = snapId.docs[0].data();
      }
    } catch {
      // Ignorer
    }

    if (!foundDocData) {
      try {
        // Recherche par matricule (studentNumber)
        const qMat = query(collection(db, 'students'), where('studentNumber', '==', rawInput.trim()));
        const snapMat = await getDocs(qMat);
        if (!snapMat.empty) {
          foundDocId = snapMat.docs[0].id;
          foundDocData = snapMat.docs[0].data();
        }
      } catch {
        // Ignorer
      }
    }

    if (!foundDocData && cleanId.includes('@')) {
      try {
        // Recherche par email
        const qEmail = query(collection(db, 'students'), where('email', '==', cleanId));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          foundDocId = snapEmail.docs[0].id;
          foundDocData = snapEmail.docs[0].data();
        }
      } catch {
        // Ignorer
      }
    }

    // 4.2 Recherche dans le cache local (localStorage)
    if (!foundDocData) {
      try {
        const savedStr = localStorage.getItem('classconnect_students');
        if (savedStr) {
          const list = JSON.parse(savedStr);
          const found = list.find((s: any) => 
            (s.identifier && s.identifier.toLowerCase() === cleanId) ||
            (s.studentNumber && s.studentNumber.toLowerCase() === cleanId) ||
            (s.email && s.email.toLowerCase() === cleanId)
          );
          if (found) {
            foundDocId = found.id;
            foundDocData = found;
          }
        }
      } catch {
        // Ignorer
      }
    }

    if (foundDocData && foundDocId) {
      if (foundDocData.password && foundDocData.password !== pass) {
        setIsLoading(false);
        throw new Error('Accès refusé : identifiant ou mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.');
      }

      const role: UserRole = foundDocData.role || 'student';
      const status: StudentStatus = foundDocData.status || 'active';

      if (status === 'suspended' || status === 'banned') {
        setIsLoading(false);
        throw new Error('compte-suspendu');
      }

      const appUser: AppUser = {
        uid: foundDocId,
        email: foundDocData.email || `${cleanId}@lavalacademy.ma`,
        identifier: foundDocData.identifier || cleanId,
        displayName: `${foundDocData.firstName || ''} ${foundDocData.lastName || ''}`.trim() || foundDocData.email,
        role,
        status,
        isAuthorized: status === 'active',
        studentId: foundDocId,
        studentNumber: foundDocData.studentNumber,
        className: foundDocData.className || '2APIC-1 • Laval Academy',
        schoolName: 'Laval Academy'
      };

      setCurrentUser(appUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(appUser));
      setIsLoading(false);
      return;
    }

    // 4.3 Si format e-mail, tenter Firebase Auth en direct
    if (cleanId.includes('@')) {
      try {
        await signInWithEmailAndPassword(auth, cleanId, pass);
        setIsLoading(false);
        return;
      } catch {
        // Ignorer
      }
    }

    setIsLoading(false);
    throw new Error('Accès refusé : identifiant ou mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.');
  };

  // Alias pour assurer la rétrocompatibilité complète
  const loginWithEmail = loginWithIdentifier;

  // Inscription autonome des élèves (accès direct à l'espace élève avec statut actif)
  const registerWithEmail = async (
    email: string,
    pass: string,
    firstName: string,
    lastName: string,
    className = '2APIC-1 • Laval Academy',
    customIdentifier?: string
  ) => {
    setIsLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    // Génération automatique d'un identifiant propre (ex: prenom.nom)
    const baseSlug = `${cleanFirst.toLowerCase().replace(/[^a-z0-9]/g, '')}.${cleanLast.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const generatedIdentifier = (customIdentifier?.trim().toLowerCase() || baseSlug || trimmedEmail.split('@')[0]).replace(/\.+$/, '');

    const studentUid = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const studentNumber = `LA-${Math.floor(100 + Math.random() * 900)}`;
    const status: StudentStatus = 'active'; // Accès direct pour les élèves
    const role: UserRole = 'student'; // Rôle élève strict

    // 1. Tenter d'enregistrer dans Firebase Auth
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
      try {
        await sendEmailVerification(userCredential.user);
      } catch {
        // Non bloquant
      }
    } catch (createErr: any) {
      if (createErr?.code === 'auth/email-already-in-use') {
        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, pass);
        } catch {
          // Continuer
        }
      } else {
        console.info('Enregistrement autonome avec persistance:', createErr?.code || createErr);
      }
    }

    // 2. Persister dans Firestore
    const newStudentData = {
      id: studentUid,
      uid: studentUid,
      studentNumber,
      identifier: generatedIdentifier,
      firstName: cleanFirst,
      lastName: cleanLast,
      className: className.trim(),
      email: trimmedEmail,
      password: pass,
      status,
      role,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      activeLoansCount: 0,
      overdueLoansCount: 0
    };

    try {
      await setDoc(doc(db, 'students', studentUid), newStudentData, { merge: true });
    } catch (fsErr) {
      console.warn('Enregistrement Firestore:', fsErr);
    }

    // 3. Mettre à jour le cache local
    try {
      const savedStr = localStorage.getItem('classconnect_students');
      const list = savedStr ? JSON.parse(savedStr) : [];
      if (!list.some((s: any) => s.email?.toLowerCase() === trimmedEmail)) {
        list.unshift(newStudentData);
        localStorage.setItem('classconnect_students', JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Mise à jour cache local:', e);
    }

    // 4. Connecter l'élève directement
    const appUser: AppUser = {
      uid: studentUid,
      email: trimmedEmail,
      identifier: generatedIdentifier,
      displayName: `${cleanFirst} ${cleanLast}`,
      role: 'student',
      status: 'active',
      isAuthorized: true,
      studentId: studentUid,
      studentNumber,
      className: className.trim(),
      schoolName: 'Laval Academy'
    };

    setCurrentUser(appUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(appUser));
    setIsLoading(false);
  };

  // Connexion rapide pour les rôles officiels de l'établissement
  const quickLoginAs = async (targetRole: 'admin' | 'teacher' | 'club_manager' | 'student') => {
    switch (targetRole) {
      case 'admin':
        await loginWithIdentifier(ADMIN_ALI_IDENTIFIER, ADMIN_ALI_PASSWORD);
        break;
      case 'teacher':
        await loginWithIdentifier(TEACHER_SARAH_IDENTIFIER, TEACHER_SARAH_PASSWORD);
        break;
      case 'club_manager':
        await loginWithIdentifier(CLUB_AWAB_IDENTIFIER, CLUB_AWAB_PASSWORD);
        break;
      case 'student':
        // Trouver un véritable élève existant sans créer de faux comptes fictifs
        try {
          const savedStr = localStorage.getItem('classconnect_students');
          if (savedStr) {
            const list = JSON.parse(savedStr);
            const realStudent = list.find((s: any) => s.role === 'student' && s.status === 'active' && s.email && s.password);
            if (realStudent) {
              await loginWithIdentifier(realStudent.identifier || realStudent.email, realStudent.password);
              return;
            }
          }
        } catch {
          // Ignorer
        }
        break;
    }
  };

  // Réinitialisation de mot de passe (par e-mail ou identifiant)
  const resetPassword = async (rawInput: string) => {
    const clean = rawInput.trim().toLowerCase();
    let targetEmail = clean;

    if (!clean.includes('@')) {
      // Rechercher l'email associé à cet identifiant
      try {
        const q = query(collection(db, 'students'), where('identifier', '==', clean));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].data().email) {
          targetEmail = snap.docs[0].data().email;
        } else {
          const savedStr = localStorage.getItem('classconnect_students');
          if (savedStr) {
            const list = JSON.parse(savedStr);
            const found = list.find((s: any) => s.identifier && s.identifier.toLowerCase() === clean);
            if (found && found.email) targetEmail = found.email;
          }
        }
      } catch {
        // Ignorer
      }
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail.trim());
    } catch (error: any) {
      console.info('Réinitialisation Firebase:', error?.code || error);
    }
  };

  // Déconnexion
  const logout = async () => {
    setIsLoading(true);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setFbUser(null);
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Erreur déconnexion Firebase:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        fbUser,
        isLoading,
        loginWithIdentifier,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        quickLoginAs
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
