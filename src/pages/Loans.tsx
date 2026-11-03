import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Loan, LoanStatus } from '../types';
import { exportLoansToExcel } from '../utils/excel';
import {
  ArrowLeftRight,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  BookOpen,
  User,
  Calendar,
  X,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface LoansProps {
  initialBookId?: string | null;
  onClearInitialBookId?: () => void;
}

export const LoansPage: React.FC<LoansProps> = ({ initialBookId, onClearInitialBookId }) => {
  const { currentUser } = useAuth();
  const { loans, books, students, createLoan, returnLoan } = useData();

  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';
  const isClubManager = currentUser?.role === 'club_manager';
  const canManage = isAdmin || isTeacher || isClubManager;

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [returnModalLoan, setReturnModalLoan] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState('');

  // Formulaire d'emprunt
  const [selectedBookId, setSelectedBookId] = useState(initialBookId || '');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 semaines par défaut pour le club de lecture
    return d.toISOString().slice(0, 10);
  });
  const [loanNotes, setLoanNotes] = useState('');

  // Ouvrir automatiquement le modal si initialBookId est passé depuis la bibliothèque
  React.useEffect(() => {
    if (initialBookId) {
      setSelectedBookId(initialBookId);
      setIsNewLoanModalOpen(true);
      if (onClearInitialBookId) onClearInitialBookId();
    }
  }, [initialBookId, onClearInitialBookId]);

  // Calcul dynamique des retards
  const today = new Date().toISOString().slice(0, 10);

  const enrichedLoans = useMemo(() => {
    return loans.map(l => {
      const isActuallyOverdue = l.status !== 'returned' && l.dueDate < today;
      const status: LoanStatus = l.status === 'returned' ? 'returned' : isActuallyOverdue ? 'overdue' : 'active';

      // Calcul des jours de retard
      let daysLate = 0;
      if (isActuallyOverdue) {
        const diffTime = Math.abs(new Date(today).getTime() - new Date(l.dueDate).getTime());
        daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...l,
        status,
        daysLate
      };
    });
  }, [loans, today]);

  // Filtrage
  const filteredLoans = useMemo(() => {
    return enrichedLoans.filter(l => {
      const matchSearch =
        l.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchTab =
        activeTab === 'all'
          ? true
          : activeTab === 'overdue'
            ? l.status === 'overdue'
            : l.status === activeTab;

      return matchSearch && matchTab;
    });
  }, [enrichedLoans, searchQuery, activeTab]);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || !selectedStudentId) {
      alert('Veuillez sélectionner un livre et un élève.');
      return;
    }

    try {
      await createLoan(selectedBookId, selectedStudentId, dueDate, loanNotes);
      setIsNewLoanModalOpen(false);
      setSelectedBookId('');
      setSelectedStudentId('');
      setLoanNotes('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement du prêt.');
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnModalLoan) return;
    try {
      await returnLoan(returnModalLoan.id, returnNotes);
      setReturnModalLoan(null);
      setReturnNotes('');
    } catch {
      alert('Erreur lors de l\'enregistrement du retour.');
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Emprunts et Retours
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900">
              {loans.length} opérations enregistrées
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestion autorisée des prêts de livres • Mise à jour automatique des stocks et suivi des retards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Excel du registre */}
          <button
            onClick={() => exportLoansToExcel(enrichedLoans, 'xlsx')}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exporter registre (.xlsx)</span>
          </button>

          {/* Bouton Nouvel Emprunt */}
          {canManage && (
            <button
              onClick={() => setIsNewLoanModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Enregistrer un emprunt</span>
            </button>
          )}
        </div>
      </div>

      {/* Onglets et Recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs w-full md:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'active'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En cours ({loans.filter(l => l.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'overdue'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En retard ! ({enrichedLoans.filter(l => l.status === 'overdue').length})
          </button>
          <button
            onClick={() => setActiveTab('returned')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'returned'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rendus ({loans.filter(l => l.status === 'returned').length})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un livre ou un élève..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Tableau des emprunts */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Livre</th>
                <th className="py-3 px-4">Élève emprunteur</th>
                <th className="py-3 px-4">Date emprunt</th>
                <th className="py-3 px-4">Date prévue de retour</th>
                <th className="py-3 px-4">Date réelle</th>
                <th className="py-3 px-4">État & Retard</th>
                <th className="py-3 px-4">Validateur & Notes</th>
                {canManage && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {loans.length === 0
                      ? 'Aucun emprunt enregistré.'
                      : 'Aucun emprunt ne correspond à votre filtre.'}
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Titre du livre */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                        <span>{loan.bookTitle}</span>
                      </div>
                    </td>

                    {/* Élève */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{loan.studentName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{loan.studentEmail}</div>
                    </td>

                    {/* Date d'emprunt */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {loan.loanDate}
                    </td>

                    {/* Date prévue */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {loan.dueDate}
                    </td>

                    {/* Date réelle */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {loan.returnDate || <span className="text-slate-400 italic">Non rendu</span>}
                    </td>

                    {/* Statut & Alerte de retard */}
                    <td className="py-3.5 px-4">
                      {loan.status === 'returned' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Rendu
                        </span>
                      )}
                      {loan.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-900">
                          <Clock className="w-3.5 h-3.5 text-cyan-700" /> En cours
                        </span>
                      )}
                      {loan.status === 'overdue' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> En retard ({loan.daysLate}j)
                        </span>
                      )}
                    </td>

                    {/* Notes & Enregistré par */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {loan.notes || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400">Par {loan.processedBy}</div>
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td className="py-3.5 px-4 text-right">
                        {loan.status !== 'returned' ? (
                          <button
                            onClick={() => {
                              setReturnModalLoan(loan);
                              setReturnNotes('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Valider le retour</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Clôturé</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOUVEL EMPRUNT */}
      {isNewLoanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Enregistrer un nouvel emprunt
                </h3>
              </div>
              <button
                onClick={() => setIsNewLoanModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-4 mt-4">
              {/* Choix du livre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sélectionner le livre à prêter *
                </label>
                <select
                  required
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                >
                  <option value="">-- Choisir un livre disponible --</option>
                  {books.map((b) => (
                    <option
                      key={b.id}
                      value={b.id}
                      disabled={b.availableCopies <= 0}
                    >
                      {b.title} - {b.author} ({b.availableCopies} dispo / {b.totalCopies})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Seuls les livres ayant au moins 1 exemplaire en stock peuvent être sélectionnés.
                </p>
              </div>

              {/* Choix de l'élève */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sélectionner l'élève emprunteur *
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                >
                  <option value="">-- Choisir un élève de la classe --</option>
                  {students.filter(s => s.status === 'active').map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.studentNumber}) - {st.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date prévue de retour */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date prévue de retour *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Délai recommandé du club : 14 jours (2 semaines).
                </p>
              </div>

              {/* Remarques */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarques / État du livre (optionnel)
                </label>
                <input
                  type="text"
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  placeholder="Ex: Exemplaire n°2, très bon état..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewLoanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs"
                >
                  Valider l'emprunt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VALIDATION DU RETOUR */}
      {returnModalLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Confirmer la restitution du livre
              </h3>
              <button
                onClick={() => setReturnModalLoan(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 text-xs space-y-1">
                <div className="font-extrabold text-sm">{returnModalLoan.bookTitle}</div>
                <div>Emprunté par : <strong>{returnModalLoan.studentName}</strong></div>
                <div>Date prévue : {returnModalLoan.dueDate}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observations sur l'état du livre au retour :
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Ex: Rendu en parfait état. A complété sa fiche de lecture."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModalLoan(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReturn}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer le retour (+1 exemplaire)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
