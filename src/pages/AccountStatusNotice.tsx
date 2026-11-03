import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Logo } from '../components/Logo';
import {
  Clock,
  Ban,
  XCircle,
  LogOut,
  Mail,
  User,
  ShieldAlert,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const AccountStatusNotice: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { students } = useData();

  if (!currentUser) return null;

  const status = currentUser.status;
  const matchingStudent = students.find(s => 
    s.id === currentUser.studentId || 
    s.email.toLowerCase() === currentUser.email.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between p-6">
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Logo size="md" variant="light" showSlogan={true} />
        <button
          onClick={() => logout()}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>

      <main className="max-w-md w-full mx-auto my-auto">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          {/* STATUT EN ATTENTE */}
          {status === 'pending' && (
            <>
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-950/30">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  En attente de validation
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  Demande d'inscription transmise
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bonjour <strong>{currentUser.displayName}</strong>. Votre compte a bien été créé. Pour protéger la confidentialité de la classe, un administrateur doit approuver votre accès avant que vous puissiez consulter les leçons et les ressources.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs text-left space-y-2 font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Adresse e-mail :</span>
                  <span className="text-cyan-300">{currentUser.email}</span>
                </div>
                {currentUser.studentNumber && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Matricule attribué :</span>
                    <span className="text-white">{currentUser.studentNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-400">
                  <span>Statut :</span>
                  <span className="text-amber-400 font-bold">À valider par la professeure</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Vous serez automatiquement redirigé vers votre espace dès validation par l'administration.
              </p>
            </>
          )}

          {/* STATUT BANNI OU SUSPENDU */}
          {(status === 'banned' || status === 'suspended') && (
            <>
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/30">
                <Ban className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 uppercase tracking-wider">
                  {status === 'banned' ? 'Compte Banni' : 'Compte Suspendu'}
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  Accès temporairement ou définitivement restreint
                </h2>
                <p className="text-xs text-rose-200 leading-relaxed">
                  L'accès à ClassConnect a été bloqué pour ce compte par l'administration de Laval Academy.
                </p>
              </div>

              {/* Détails officiels du bannissement */}
              <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-xs text-left space-y-2.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Compte :</span>
                  <span className="font-mono text-cyan-300 font-bold">{currentUser.email}</span>
                </div>

                {matchingStudent?.banReason && (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-200">
                    <span className="text-[11px] font-bold block text-rose-300 mb-0.5">Motif de la sanction :</span>
                    <p className="font-medium text-xs leading-relaxed">{matchingStudent.banReason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Durée de la sanction</span>
                    <span className="font-bold text-white">
                      {matchingStudent?.banDuration === '24h'
                        ? '24 heures (1 jour)'
                        : matchingStudent?.banDuration === '3d'
                        ? '3 jours'
                        : matchingStudent?.banDuration === '7d'
                        ? '7 jours (1 semaine)'
                        : matchingStudent?.banDuration === '30d'
                        ? '30 jours (1 mois)'
                        : matchingStudent?.banDuration === 'permanent'
                        ? 'Indéfini / Permanent'
                        : 'Temporaire'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Date d'expiration</span>
                    <span className="font-bold text-amber-300">
                      {matchingStudent?.banExpiresAt
                        ? new Date(matchingStudent.banExpiresAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Décision permanente'}
                    </span>
                  </div>
                </div>

                {matchingStudent?.bannedBy && (
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-700/50">
                    Sanction prononcée par : <strong className="text-slate-300">{matchingStudent.bannedBy}</strong>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 leading-snug pt-1">
                  Pour tout recours ou explication, veuillez vous adresser directement à la direction (Ali Bennis) ou à votre professeure (Madame Sarah).
                </div>
              </div>
            </>
          )}

          {/* STATUT REFUSÉ */}
          {status === 'rejected' && (
            <>
              <div className="w-16 h-16 rounded-3xl bg-slate-500/10 border border-slate-500/30 text-slate-400 flex items-center justify-center mx-auto shadow-lg">
                <XCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                  Inscription non retenue
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  Demande refusée
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Votre demande d'inscription n'a pas été validée par la professeure principale.
                </p>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              onClick={() => logout()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Quitter la session</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500">
        ClassConnect • Collège au Maroc • « Connecter la classe, faciliter la réussite. »
      </footer>
    </div>
  );
};
