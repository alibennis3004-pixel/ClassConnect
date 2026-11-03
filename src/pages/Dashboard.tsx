import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PageId } from '../components/Sidebar';
import {
  Users,
  BookOpen,
  Library,
  BookMarked,
  Clock,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Calendar,
  Paperclip,
  AlertTriangle
} from 'lucide-react';
import { StudentStatus } from '../types';

interface DashboardProps {
  onNavigate: (page: PageId, filter?: 'all' | StudentStatus) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { dashboardStats, loans, lessons, schoolName } = useData();

  if (!currentUser) return null;

  const overdueLoans = loans.filter(l => l.status === 'overdue' || (l.status === 'active' && l.dueDate < new Date().toISOString().slice(0, 10)));
  const isStaff = currentUser.role === 'admin' || currentUser.role === 'teacher';

  const formatDateToFrench = (isoDate?: string): string => {
    if (!isoDate) return '';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return isoDate;
    } catch {
      return isoDate || '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Bannière de bienvenue */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-sky-900 text-white p-6 sm:p-8 shadow-xl shadow-cyan-950/20">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            <Sparkles className="w-3.5 h-3.5" /> Classe 2APIC-1 • {schoolName || 'Laval Academy'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bienvenue, {currentUser.displayName} 👋
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            « Connecter la classe, faciliter la réussite. » Suivez les leçons de cours, les pièces jointes d'apprentissage et la dynamique du club de lecture.
          </p>

          {/* Raccourcis selon le rôle */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            {isStaff && (
              <>
                <button
                  onClick={() => onNavigate('lessons')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Publier un cours / une leçon
                </button>
                <button
                  onClick={() => onNavigate('students')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-md transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-cyan-300" /> Gestion des comptes
                </button>
                <button
                  onClick={() => onNavigate('loans')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-md transition-colors cursor-pointer"
                >
                  <BookMarked className="w-4 h-4 text-cyan-300" /> Enregistrer un prêt
                </button>
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => onNavigate('settings')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-md transition-colors cursor-pointer"
                  >
                    Paramètres école
                  </button>
                )}
              </>
            )}

            {currentUser.role === 'club_manager' && (
              <>
                <button
                  onClick={() => onNavigate('loans')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Nouvel emprunt club
                </button>
                <button
                  onClick={() => onNavigate('library')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-md transition-colors cursor-pointer"
                >
                  <Library className="w-4 h-4 text-cyan-300" /> Catalogue des livres
                </button>
              </>
            )}

            {currentUser.role === 'student' && (
              <>
                <button
                  onClick={() => onNavigate('student_portal')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer"
                >
                  Accéder à mon espace personnel <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('lessons')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-md transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-cyan-300" /> Consulter les cours & leçons
                </button>
              </>
            )}
          </div>
        </div>

        {/* Motif décoratif en arrière-plan */}
        <div className="absolute right-[-40px] bottom-[-40px] opacity-10 pointer-events-none">
          <BookMarked className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Grille des indicateurs épurée sans les devoirs ni les notes */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 1. Total Élèves */}
        <div
          onClick={() => isStaff && onNavigate('students')}
          className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all ${
            isStaff ? 'cursor-pointer hover:border-cyan-400' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Élèves</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{dashboardStats.totalStudents}</span>
            {dashboardStats.totalStudents === 0 ? (
              <span className="text-[11px] text-slate-400 font-medium">Aucun élève inscrit</span>
            ) : (
              <span className="text-[11px] text-emerald-600 font-semibold">{dashboardStats.activeStudents} actifs</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Classe 2APIC-1</div>
        </div>

        {/* 2. Leçons et cours */}
        <div
          onClick={() => onNavigate('lessons')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer hover:border-cyan-400"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Leçons et cours</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-950">{dashboardStats.totalLessons}</span>
            <span className="text-[11px] text-indigo-600 font-medium">publiés</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Ressources pédagogiques</div>
        </div>

        {/* 3. Livres disponibles */}
        <div
          onClick={() => onNavigate('library')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer hover:border-teal-400"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Livres disponibles</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Library className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-teal-700">{dashboardStats.availableBooks}</span>
            <span className="text-[11px] text-slate-500">/ {dashboardStats.totalBooks} titres</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Club de lecture</div>
        </div>

        {/* 4. Livres empruntés */}
        <div
          onClick={() => onNavigate('loans')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer hover:border-cyan-400"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Livres empruntés</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <BookMarked className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-cyan-800">{dashboardStats.borrowedBooks}</span>
            <span className="text-[11px] text-cyan-600 font-medium">en circulation</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Lectures en cours</div>
        </div>

        {/* 5. Livres non retournés */}
        <div
          onClick={() => onNavigate('loans')}
          className={`p-4 rounded-2xl bg-white border shadow-xs hover:shadow-md transition-all cursor-pointer ${
            dashboardStats.unreturnedBooks > 0 ? 'border-amber-300 hover:border-amber-500' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Livres non retournés</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700">{dashboardStats.unreturnedBooks}</span>
            <span className="text-[11px] text-amber-800 font-semibold">
              {overdueLoans.length > 0 ? `${overdueLoans.length} en retard` : 'en prêt'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Registre du club</div>
        </div>
      </div>

      {/* Alerte si des inscriptions sont en attente de validation par l'administration */}
      {isStaff && dashboardStats.pendingStudents > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                {dashboardStats.pendingStudents} demande(s) d'inscription en attente d'approbation
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Des élèves se sont inscrits en autonomie et attendent votre autorisation pour accéder à l'espace de la classe.
              </p>
            </div>
            <button
              onClick={() => onNavigate('students', 'pending')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors whitespace-nowrap self-start sm:self-center cursor-pointer shadow-2xs"
            >
              Examiner les demandes
            </button>
          </div>
        </div>
      )}

      {/* Alerte si des livres sont en retard */}
      {overdueLoans.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                Attention : {overdueLoans.length} emprunt(s) ont dépassé la date limite de retour
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Veuillez rappeler aux élèves concernés ({overdueLoans.map(l => l.studentName).join(', ')}) de rapporter les livres pour que les autres camarades puissent en profiter.
              </p>
            </div>
            <button
              onClick={() => onNavigate('loans')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors whitespace-nowrap self-start sm:self-center cursor-pointer"
            >
              Voir les retards
            </button>
          </div>
        </div>
      )}

      {/* Deux colonnes : Activités récentes du club & Leçons récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne 1 : Activités récentes du club */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                  📖
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Activités récentes du club</h3>
                  <p className="text-xs text-slate-500">Mouvements de livres et vie du club</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('loans')}
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
              >
                Tout voir <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {dashboardStats.recentClubActivities.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600">Aucune activité récente.</p>
                  <p className="text-[11px] text-slate-400">Les mouvements d'emprunts et annonces apparaîtront automatiquement ici.</p>
                </div>
              ) : (
                dashboardStats.recentClubActivities.map((act) => (
                  <div key={act.id} className="py-3.5 flex items-start gap-3">
                    <span className="text-lg">
                      {act.type === 'loan' ? '📤' : act.type === 'return' ? '📥' : '📢'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{act.title}</h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                          {act.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{act.description}</p>
                      <span className="text-[10px] text-slate-400">Par {act.actor}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Bibliothèque de classe</span>
            <button
              onClick={() => onNavigate('library')}
              className="text-cyan-600 font-semibold hover:underline cursor-pointer"
            >
              Consulter le catalogue
            </button>
          </div>
        </div>

        {/* Colonne 2 : Dernières leçons & cours */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  📚
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Leçons et cours récents</h3>
                  <p className="text-xs text-slate-500">Supports pédagogiques et documents joints</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('lessons')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Gérer les cours <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {lessons.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600">Aucun cours publié pour le moment.</p>
                  <p className="text-[11px] text-slate-400">Les cours et leçons publiés apparaîtront ici.</p>
                </div>
              ) : (
                lessons.slice(0, 3).map((lsn) => (
                  <div
                    key={lsn.id}
                    onClick={() => onNavigate('lessons')}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-slate-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-indigo-900">
                        {lsn.subject}
                      </span>
                      {lsn.dueDate && (
                        <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> À rendre à l'école le : {formatDateToFrench(lsn.dueDate)}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1">
                      {lsn.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {lsn.description}
                    </p>

                    {lsn.attachments.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-cyan-700 font-semibold">
                        <Paperclip className="w-3 h-3" />
                        <span>{lsn.attachments.length} fichier(s) joint(s)</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{schoolName || 'Laval Academy'} • Matière : Français</span>
            <button
              onClick={() => onNavigate('lessons')}
              className="text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Voir toutes les leçons
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
