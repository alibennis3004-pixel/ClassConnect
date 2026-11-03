import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth, ADMIN_ALI_EMAIL } from '../context/AuthContext';
import { Student, StudentStatus, UserRole, WarningSeverity } from '../types';
import {
  exportStudentsToExcel,
  parseStudentsFromExcel,
  ImportResult
} from '../utils/excel';
import {
  Search,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  X,
  Eye,
  RotateCcw,
  PauseCircle,
  Check,
  UserX,
  Trash2,
  User,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  Send,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export interface StudentsProps {
  initialStatusFilter?: 'all' | StudentStatus;
}

export const Students: React.FC<StudentsProps> = ({ initialStatusFilter = 'all' }) => {
  const {
    students,
    loans,
    warnings,
    approveAccount,
    rejectAccount,
    promoteToRole,
    demoteToStudent,
    banAccount,
    reactivateAccount,
    suspendAccount,
    deleteStudent,
    importStudentsBatch,
    addWarning,
    deleteWarning,
    cleanRogueAccounts
  } = useData();

  const { currentUser } = useAuth();

  // Recherche et filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>(initialStatusFilter);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [activeTab, setActiveTab] = useState<'accounts' | 'warnings'>('accounts');

  // Notification toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [detailsStudent, setDetailsStudent] = useState<Student | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCleaningAccounts, setIsCleaningAccounts] = useState(false);

  // Modal Avertissement
  const [warningStudent, setWarningStudent] = useState<Student | null>(null);
  const [warningReason, setWarningReason] = useState('Commentaires inappropriés sous les cours');
  const [warningMessage, setWarningMessage] = useState('');
  const [warningSeverity, setWarningSeverity] = useState<WarningSeverity>('medium');
  const [isSubmittingWarning, setIsSubmittingWarning] = useState(false);

  // Modal Bannissement
  const [banStudentModal, setBanStudentModal] = useState<Student | null>(null);
  const [banReason, setBanReason] = useState('Non-respect des règles de la classe');
  const [banDuration, setBanDuration] = useState<'24h' | '3d' | '7d' | '30d' | 'permanent'>('7d');
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  // Modal Suppression Définitive
  const [deleteStudentModal, setDeleteStudentModal] = useState<Student | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Action générique directe
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Import Excel
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(curr => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Enrichissement avec les emprunts
  const enrichedStudents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return students.map(st => {
      const studentLoans = loans.filter(
        l => l.studentId === st.id || l.studentEmail.toLowerCase() === st.email.toLowerCase()
      );
      const activeLoans = studentLoans.filter(l => l.status === 'active' || l.status === 'overdue');
      const overdueLoans = studentLoans.filter(
        l => l.status === 'overdue' || (l.status === 'active' && l.dueDate < today)
      );

      return {
        ...st,
        activeLoansCount: activeLoans.length,
        overdueLoansCount: overdueLoans.length
      };
    });
  }, [students, loans]);

  // Filtrage des comptes
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter(st => {
      const matchSearch =
        st.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (st.studentNumber && st.studentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (st.identifier && st.identifier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        st.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'all' || st.status === statusFilter;
      const matchRole = roleFilter === 'all' || st.role === roleFilter;

      return matchSearch && matchStatus && matchRole;
    });
  }, [enrichedStudents, searchQuery, statusFilter, roleFilter]);

  // Compteurs
  const counts = useMemo(() => {
    return {
      all: students.length,
      pending: students.filter(s => s.status === 'pending').length,
      active: students.filter(s => s.status === 'active').length,
      suspended: students.filter(s => s.status === 'suspended').length,
      banned: students.filter(s => s.status === 'banned').length,
      rejected: students.filter(s => s.status === 'rejected').length
    };
  }, [students]);

  // Déclencher le nettoyage des comptes
  const handleCleanAccounts = async () => {
    setIsCleaningAccounts(true);
    try {
      const count = await cleanRogueAccounts();
      if (count > 0) {
        showNotification('success', `Nettoyage effectué : ${count} compte(s) non conformes ont été purgés avec succès.`);
      } else {
        showNotification('success', 'Tous les comptes sont conformes. Les 3 comptes officiels sont bien sécurisés.');
      }
    } catch {
      showNotification('error', 'Erreur lors du nettoyage des comptes.');
    } finally {
      setIsCleaningAccounts(false);
    }
  };

  // Actions directes
  const handleDirectApprove = async (st: Student) => {
    setActionInProgress(st.id);
    try {
      await approveAccount(st.id);
      showNotification('success', `Compte de ${st.firstName} ${st.lastName} validé avec succès.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Erreur lors de l\'approbation.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDirectReactivate = async (st: Student) => {
    setActionInProgress(st.id);
    try {
      await reactivateAccount(st.id);
      showNotification('success', `Compte de ${st.firstName} ${st.lastName} réactivé.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Erreur lors de la réactivation.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Bannissement avec durée et motif
  const handleExecuteBan = async () => {
    if (!banStudentModal) return;
    if (!banReason.trim()) {
      showNotification('error', 'Veuillez préciser le motif du bannissement.');
      return;
    }

    setIsSubmittingBan(true);
    try {
      await banAccount(banStudentModal.id, banReason.trim(), banDuration);
      showNotification('success', `L'élève ${banStudentModal.firstName} ${banStudentModal.lastName} a été banni (${banDuration === 'permanent' ? 'Permanent' : banDuration}).`);
      setBanStudentModal(null);
      setBanReason('');
    } catch (err: any) {
      showNotification('error', err.message || 'Erreur lors du bannissement.');
    } finally {
      setIsSubmittingBan(false);
    }
  };

  // Envoi d'un avertissement
  const handleExecuteWarning = async () => {
    if (!warningStudent) return;
    if (!warningReason.trim()) {
      showNotification('error', 'Veuillez sélectionner ou saisir un motif.');
      return;
    }
    if (!warningMessage.trim()) {
      showNotification('error', 'Veuillez saisir le message explicatif de l\'avertissement.');
      return;
    }

    setIsSubmittingWarning(true);
    try {
      await addWarning(warningStudent.id, warningReason.trim(), warningMessage.trim(), warningSeverity);
      showNotification('success', `Avertissement officiel transmis à ${warningStudent.firstName} ${warningStudent.lastName}.`);
      setWarningStudent(null);
      setWarningMessage('');
    } catch (err: any) {
      showNotification('error', err.message || 'Erreur lors de l\'envoi de l\'avertissement.');
    } finally {
      setIsSubmittingWarning(false);
    }
  };

  // Suppression Définitive
  const handleExecuteDelete = async () => {
    if (!deleteStudentModal) return;

    setIsSubmittingDelete(true);
    try {
      await deleteStudent(deleteStudentModal.id);
      showNotification('success', `Le compte de ${deleteStudentModal.firstName} ${deleteStudentModal.lastName} a été définitivement supprimé.`);
      setDeleteStudentModal(null);
      setDeleteConfirmationText('');
    } catch (err: any) {
      showNotification('error', err.message || 'Erreur lors de la suppression.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Import Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      const res = await parseStudentsFromExcel(file, students);
      setImportResult(res);
    } catch {
      alert('Impossible de lire le fichier. Veuillez sélectionner un fichier .xlsx ou .csv valide.');
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult || importResult.validStudents.length === 0) return;
    setIsImporting(true);
    try {
      const count = await importStudentsBatch(importResult.validStudents);
      showNotification('success', `${count} compte(s) importé(s) avec succès !`);
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportResult(null);
    } catch {
      showNotification('error', 'Erreur lors de l\'importation.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de notification */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Gestion des comptes & Modération
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-200">
              Laval Academy • 2APIC-1
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contrôle total des accès : validation des élèves, bannissement temporaire ou définitif, émission d'avertissements et nettoyage des comptes.
          </p>
        </div>

        {/* Boutons d'actions globales */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton de nettoyage des comptes en doublon / fictifs */}
          <button
            onClick={handleCleanAccounts}
            disabled={isCleaningAccounts}
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Vérifier et purger automatiquement les comptes de démonstration ou doublons"
          >
            {isCleaningAccounts ? (
              <Clock className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
            )}
            <span>Nettoyer les comptes en doublon</span>
          </button>

          {/* Exportation Excel */}
          <div className="inline-flex rounded-xl border border-slate-300 bg-white shadow-2xs overflow-hidden">
            <button
              onClick={() => exportStudentsToExcel(enrichedStudents, 'xlsx')}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors border-r border-slate-200 cursor-pointer"
              title="Exporter au format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exporter (.xlsx)</span>
            </button>
            <button
              onClick={() => exportStudentsToExcel(enrichedStudents, 'csv')}
              className="px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Exporter au format CSV"
            >
              CSV
            </button>
          </div>

          {/* Importer */}
          <button
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-cyan-600" />
            <span>Importer une liste</span>
          </button>
        </div>
      </div>

      {/* Bascule Onglets : Comptes utilisateurs / Historique des avertissements */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'accounts'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Comptes utilisateurs ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warnings')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'warnings'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Historique des avertissements ({warnings.length})</span>
        </button>
      </div>

      {activeTab === 'accounts' ? (
        <>
          {/* Filtres par statut */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tous ({counts.all})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Actifs ({counts.active})</span>
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>En attente ({counts.pending})</span>
            </button>
            <button
              onClick={() => setStatusFilter('banned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'banned'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Bannis ({counts.banned})</span>
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'suspended'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 border border-orange-200 text-orange-800 hover:bg-orange-100'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Suspendus ({counts.suspended})</span>
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'rejected'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Refusés ({counts.rejected})</span>
            </button>
          </div>

          {/* Recherche et filtre de rôle */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, email, identifiant ou matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Rôle :</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-cyan-500 font-semibold"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="admin">Admin (Ali Bennis)</option>
                  <option value="teacher">Professeur (Madame Sarah)</option>
                  <option value="club_manager">Responsable du club (Awab Fellah)</option>
                  <option value="student">Élève</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tableau complet des utilisateurs */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-4">Identifiant / E-mail</th>
                    <th className="py-3 px-4">Rôle</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-center">Avertissements</th>
                    <th className="py-3 px-4 text-right min-w-[280px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Aucun compte trouvé correspondant aux critères.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const isPrimaryAdmin = st.email.toLowerCase() === ADMIN_ALI_EMAIL.toLowerCase() || st.role === 'admin';
                      const isCurrentSelf = currentUser?.email.toLowerCase() === st.email.toLowerCase();
                      const studentWarnings = warnings.filter(w => w.studentId === st.id || w.studentEmail.toLowerCase() === st.email.toLowerCase());

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Utilisateur */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                {st.firstName.charAt(0)}{st.lastName ? st.lastName.charAt(0) : ''}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{st.firstName} {st.lastName}</span>
                                  {isPrimaryAdmin && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-black border border-indigo-200">
                                      Admin Principal
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {st.studentNumber || 'Sans matricule'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Email & Identifiant */}
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <div className="text-slate-800 font-semibold">{st.email}</div>
                            {st.identifier && (
                              <div className="text-[10px] text-cyan-700 font-medium mt-0.5">
                                @{st.identifier}
                              </div>
                            )}
                          </td>

                          {/* Rôle */}
                          <td className="py-3.5 px-4">
                            {st.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200">
                                <ShieldCheck className="w-3 h-3 text-indigo-700" /> Admin
                              </span>
                            ) : st.role === 'teacher' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                <GraduationCap className="w-3 h-3 text-purple-700" /> Professeur
                              </span>
                            ) : st.role === 'club_manager' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-200">
                                <BookOpen className="w-3 h-3 text-cyan-700" /> Resp. Club
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                                Élève
                              </span>
                            )}
                          </td>

                          {/* Statut */}
                          <td className="py-3.5 px-4">
                            {st.status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Actif
                              </span>
                            )}
                            {st.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                                <Clock className="w-3 h-3" /> En attente
                              </span>
                            )}
                            {st.status === 'banned' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title={st.banReason || 'Banni'}>
                                <Ban className="w-3 h-3" /> Banni {st.banDuration ? `(${st.banDuration})` : ''}
                              </span>
                            )}
                            {st.status === 'suspended' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                                <PauseCircle className="w-3 h-3" /> Suspendu
                              </span>
                            )}
                            {st.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <UserX className="w-3 h-3" /> Refusé
                              </span>
                            )}
                          </td>

                          {/* Avertissements */}
                          <td className="py-3.5 px-4 text-center">
                            {studentWarnings.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                {studentWarnings.length}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">0</span>
                            )}
                          </td>

                          {/* Actions alignées proprement */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              {/* 1. Voir profil */}
                              <button
                                onClick={() => setDetailsStudent(st)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Consulter le dossier complet"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {isPrimaryAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200">
                                  <ShieldCheck className="w-3 h-3" /> Protégé
                                </span>
                              ) : (
                                <>
                                  {/* Approuver si en attente */}
                                  {st.status === 'pending' && (
                                    <button
                                      onClick={() => handleDirectApprove(st)}
                                      disabled={actionInProgress === st.id}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                      title="Valider l'accès"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Valider</span>
                                    </button>
                                  )}

                                  {/* Réactiver si banni ou suspendu */}
                                  {(st.status === 'banned' || st.status === 'suspended') && (
                                    <button
                                      onClick={() => handleDirectReactivate(st)}
                                      disabled={actionInProgress === st.id}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                      title="Débannir et réactiver le compte"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Réactiver</span>
                                    </button>
                                  )}

                                  {/* Envoyer un avertissement */}
                                  <button
                                    onClick={() => {
                                      setWarningStudent(st);
                                      setWarningReason('Commentaires inappropriés sous les cours');
                                      setWarningMessage('');
                                      setWarningSeverity('medium');
                                    }}
                                    className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                    title="Envoyer un avertissement formel"
                                  >
                                    <AlertTriangle className="w-4 h-4" />
                                  </button>

                                  {/* Bannir */}
                                  {st.status !== 'banned' && !isCurrentSelf && (
                                    <button
                                      onClick={() => {
                                        setBanStudentModal(st);
                                        setBanReason('Non-respect de la charte de vie de classe');
                                        setBanDuration('7d');
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Bannir ce compte (choisir durée et motif)"
                                    >
                                      <Ban className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Rôles rapides */}
                                  {st.role === 'student' ? (
                                    <button
                                      onClick={() => promoteToRole(st.id, 'teacher')}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                      title="Nommer Enseignant"
                                    >
                                      <GraduationCap className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => demoteToStudent(st.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="Rétrograder au rôle Élève"
                                    >
                                      <User className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Supprimer définitivement */}
                                  {!isCurrentSelf && (
                                    <button
                                      onClick={() => {
                                        setDeleteStudentModal(st);
                                        setDeleteConfirmationText('');
                                      }}
                                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Supprimer définitivement le compte"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* VUE : HISTORIQUE COMPLET DES AVERTISSEMENTS */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Registre disciplinaire & Avertissements émis
              </h3>
              <p className="text-xs text-slate-500">
                Consultez tous les avertissements transmis aux élèves avec motif, niveau de gravité et accusé de réception.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {warnings.length} avertissement(s) actif(s)
            </span>
          </div>

          {warnings.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
              <p className="font-bold text-slate-700">Aucun avertissement n'a été émis.</p>
              <p className="text-[11px] text-slate-400">Le comportement des élèves et les échanges sont conformes aux règles de la classe.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.map((warn) => (
                <div
                  key={warn.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        warn.severity === 'high'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : warn.severity === 'medium'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        Gravité : {warn.severity === 'high' ? 'Élevée' : warn.severity === 'medium' ? 'Modérée' : 'Information'}
                      </span>

                      <span className="text-xs font-black text-slate-900">
                        Élève : {warn.studentName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({warn.studentEmail})
                      </span>
                    </div>

                    <div className="text-xs font-bold text-amber-900">
                      Motif : {warn.reason}
                    </div>

                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-line">
                      {warn.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Émis par : <strong>{warn.issuedBy}</strong></span>
                      <span>•</span>
                      <span>Date : {new Date(warn.createdAt).toLocaleString('fr-FR')}</span>
                      <span>•</span>
                      {warn.read ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lu par l'élève {warn.acknowledgedAt ? `le ${new Date(warn.acknowledgedAt).toLocaleDateString('fr-FR')}` : ''}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Non encore consulté par l'élève
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteWarning(warn.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer self-start"
                    title="Supprimer cet avertissement du registre"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1 : BANNIR UN ÉLÈVE AVEC DURÉE ET MOTIF */}
      {banStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Bannir l'élève
                  </h3>
                  <p className="text-xs text-slate-500">
                    {banStudentModal.firstName} {banStudentModal.lastName} ({banStudentModal.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBanStudentModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              L'élève ne pourra plus se connecter ni consulter les leçons pendant la période choisie. Vous pourrez réactiver son compte à tout moment.
            </p>

            {/* Choix de la durée */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Durée du bannissement *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                {(['24h', '3d', '7d', '30d', 'permanent'] as const).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setBanDuration(dur)}
                    className={`py-2 px-1 rounded-xl font-bold text-center border transition-all cursor-pointer ${
                      banDuration === dur
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dur === '24h'
                      ? '24 heures'
                      : dur === '3d'
                      ? '3 jours'
                      : dur === '7d'
                      ? '7 jours'
                      : dur === '30d'
                      ? '30 jours'
                      : 'Permanent'}
                  </button>
                ))}
              </div>
            </div>

            {/* Motifs prédéfinis rapides */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Motifs fréquents :
              </label>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  'Commentaires inappropriés sous les cours',
                  'Comportement déplacé ou irrespectueux',
                  'Non-respect de la charte de vie de classe',
                  'Plagiat ou triche'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBanReason(preset)}
                    className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      banReason === preset
                        ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Motif personnalisé */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Motif officiel communiqué à l'élève *
              </label>
              <textarea
                rows={3}
                required
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Expliquez clairement la raison du bannissement..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBanStudentModal(null)}
                disabled={isSubmittingBan}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteBan}
                disabled={isSubmittingBan}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingBan ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>Confirmer le bannissement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2 : ENVOYER UN AVERTISSEMENT */}
      {warningStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Envoyer un avertissement officiel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Destinataire : {warningStudent.firstName} {warningStudent.lastName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWarningStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cet avertissement apparaîtra immédiatement dans l'espace personnel de l'élève. Il devra en accuser réception.
            </p>

            {/* Niveau de gravité */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Niveau de gravité :
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setWarningSeverity('low')}
                  className={`py-2 px-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    warningSeverity === 'low'
                      ? 'bg-yellow-50 text-yellow-900 border-yellow-400 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Faible / Info
                </button>
                <button
                  type="button"
                  onClick={() => setWarningSeverity('medium')}
                  className={`py-2 px-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    warningSeverity === 'medium'
                      ? 'bg-amber-100 text-amber-900 border-amber-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Modérée (Formel)
                </button>
                <button
                  type="button"
                  onClick={() => setWarningSeverity('high')}
                  className={`py-2 px-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    warningSeverity === 'high'
                      ? 'bg-rose-100 text-rose-900 border-rose-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Élevée (Avant ban)
                </button>
              </div>
            </div>

            {/* Motif rapide */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Motif principal :
              </label>
              <select
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              >
                <option value="Commentaires inappropriés sous les cours">Commentaires inappropriés sous les cours</option>
                <option value="Comportement non conforme aux règles">Comportement non conforme aux règles de vie de classe</option>
                <option value="Retards répétés dans la remise des devoirs">Retards répétés dans la remise des devoirs</option>
                <option value="Non-respect du matériel ou des livres">Non-respect des livres de la bibliothèque</option>
                <option value="Autre motif">Autre motif disciplinaire</option>
              </select>
            </div>

            {/* Message détaillé */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Message explicatif pour l'élève *
              </label>
              <textarea
                rows={4}
                required
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                placeholder="Rédigez les faits reprochés et le rappel à l'ordre formel..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed font-normal"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWarningStudent(null)}
                disabled={isSubmittingWarning}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteWarning}
                disabled={isSubmittingWarning}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingWarning ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Transmettre l'avertissement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3 : SUPPRESSION DÉFINITIVE D'UN ÉLÈVE */}
      {deleteStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Supprimer définitivement ce compte
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteStudentModal.firstName} {deleteStudentModal.lastName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <span className="font-extrabold block">ATTENTION : Action irréversible !</span>
              <p className="leading-relaxed">
                Toutes les données associées à cet élève (historique des emprunts, suivi des cours terminés et avertissements) seront définitivement supprimées du serveur.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tapez « SUPPRIMER » pour confirmer la suppression :
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteStudentModal(null);
                  setDeleteConfirmationText('');
                }}
                disabled={isSubmittingDelete}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isSubmittingDelete || deleteConfirmationText.trim().toUpperCase() !== 'SUPPRIMER'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingDelete && <Clock className="w-3.5 h-3.5 animate-spin" />}
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4 : DOSSIER ÉLÈVE & HISTORIQUE DES AVERTISSEMENTS */}
      {detailsStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 text-cyan-700 font-extrabold flex items-center justify-center text-lg">
                  {detailsStudent.firstName.charAt(0)}{detailsStudent.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {detailsStudent.firstName} {detailsStudent.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {detailsStudent.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block mb-0.5">Statut actuel</span>
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  {detailsStudent.status}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block mb-0.5">Rôle</span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {detailsStudent.role === 'admin' ? 'Admin' : detailsStudent.role === 'teacher' ? 'Professeur' : detailsStudent.role === 'club_manager' ? 'Resp. Club' : 'Élève'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block mb-0.5">Matricule</span>
                <span className="font-mono font-bold text-slate-800">
                  {detailsStudent.studentNumber || 'Non attribué'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block mb-0.5">Classe</span>
                <span className="font-bold text-slate-800">
                  {detailsStudent.className || '2APIC-1'}
                </span>
              </div>
            </div>

            {/* Détails du bannissement si existant */}
            {detailsStudent.status === 'banned' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
                <span className="font-bold block">Sanction en cours : Banni ({detailsStudent.banDuration || 'Permanent'})</span>
                <p>Motif : {detailsStudent.banReason || 'Non précisé'}</p>
                {detailsStudent.banExpiresAt && (
                  <p className="text-[11px] font-mono text-rose-600">
                    Expiration : {new Date(detailsStudent.banExpiresAt).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            )}

            {/* Historique des avertissements de cet élève */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                <span>Historique des avertissements ({warnings.filter(w => w.studentId === detailsStudent.id).length})</span>
              </h4>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {warnings.filter(w => w.studentId === detailsStudent.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucun avertissement enregistré pour cet élève.</p>
                ) : (
                  warnings.filter(w => w.studentId === detailsStudent.id).map(w => (
                    <div key={w.id} className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900">{w.reason}</span>
                        <span className="text-[10px] text-slate-400">{new Date(w.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="text-slate-700 text-[11px] leading-relaxed">{w.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Emprunts */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                Historique des emprunts de livres
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1.5">
                {loans.filter(l => l.studentId === detailsStudent.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucun emprunt enregistré.</p>
                ) : (
                  loans.filter(l => l.studentId === detailsStudent.id).map(loan => (
                    <div key={loan.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{loan.bookTitle}</div>
                        <div className="text-[10px] text-slate-400">Échéance : {loan.dueDate}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        {loan.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailsStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5 : IMPORT EXCEL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Importer une liste d'élèves (Excel / CSV)
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Sélectionnez un classeur Excel (.xlsx) ou un fichier CSV contenant les colonnes : <strong>Nom</strong>, <strong>Prénom</strong>, <strong>Email</strong> (et optionnellement Matricule).
            </p>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-cyan-500 transition-colors">
              <input
                type="file"
                id="excelInput"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="excelInput"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <FileSpreadsheet className="w-8 h-8 text-cyan-600" />
                <span className="text-xs font-bold text-slate-700">
                  {importFile ? importFile.name : 'Choisir un fichier Excel ou CSV'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Cliquez pour parcourir votre ordinateur
                </span>
              </label>
            </div>

            {importResult && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                <div className="text-slate-700">
                  Comptes valides prêts à l'import : <strong className="text-emerald-700">{importResult.validStudents.length}</strong>
                </div>
                {importResult.duplicates.length > 0 && (
                  <div className="text-amber-700">
                    Doublons ignorés : <strong>{importResult.duplicates.length}</strong>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="text-rose-600">
                    Lignes invalides : <strong>{importResult.errors.length}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!importResult || importResult.validStudents.length === 0 || isImporting}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isImporting ? 'Importation en cours...' : 'Valider l\'importation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
