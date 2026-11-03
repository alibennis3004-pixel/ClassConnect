import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LessonComments } from '../components/LessonComments';
import {
  GraduationCap,
  BookOpen,
  BookMarked,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Paperclip,
  Download,
  File,
  FileSpreadsheet,
  Image as ImageIcon,
  Music,
  Video,
  Search,
  Filter,
  User,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldAlert
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    lessons,
    loans,
    announcements,
    warnings,
    markWarningRead,
    lessonProgress,
    toggleLessonProgress,
    schoolName
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [expandedCommentsLessonId, setExpandedCommentsLessonId] = useState<string | null>(null);

  const studentEmail = currentUser?.email?.toLowerCase().trim() || '';
  const studentId = currentUser?.studentId;

  // Filtrer les avertissements de cet élève
  const myWarnings = useMemo(() => {
    return warnings.filter(w =>
      (studentId && w.studentId === studentId) ||
      (studentEmail && w.studentEmail.toLowerCase() === studentEmail)
    );
  }, [warnings, studentId, studentEmail]);

  const unreadWarnings = myWarnings.filter(w => !w.read);

  // Filtrer les emprunts de cet élève
  const myLoans = loans.filter(l =>
    (studentId && l.studentId === studentId) ||
    (studentEmail && l.studentEmail.toLowerCase() === studentEmail)
  );

  const today = new Date().toISOString().slice(0, 10);
  const activeLoans = myLoans.filter(l => l.status === 'active' || l.status === 'overdue');

  // Filtrer les cours publiés pour les élèves
  const publishedLessons = useMemo(() => {
    return lessons
      .filter(l => l.status !== 'draft')
      .filter(l => {
        if (selectedSubject !== 'all' && l.subject !== selectedSubject) {
          return false;
        }
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = l.title.toLowerCase().includes(query);
          const matchDesc = l.description.toLowerCase().includes(query);
          const matchSub = l.subject.toLowerCase().includes(query);
          const matchContent = l.content ? l.content.toLowerCase().includes(query) : false;
          return matchTitle || matchDesc || matchSub || matchContent;
        }
        return true;
      });
  }, [lessons, selectedSubject, searchQuery]);

  // Liste des matières uniques
  const subjectList = useMemo(() => {
    const set = new Set<string>();
    lessons.forEach(l => {
      if (l.status !== 'draft') set.add(l.subject);
    });
    return Array.from(set);
  }, [lessons]);

  const formatDateToFrench = (isoDate?: string | null): string => {
    if (!isoDate) return '';
    try {
      const [year, month, day] = isoDate.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return isoDate;
    } catch {
      return isoDate || '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-500" />;
    if (['doc', 'docx', 'rtf'].includes(ext || '')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (['ppt', 'pptx'].includes(ext || '')) return <FileText className="w-4 h-4 text-amber-600" />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return <ImageIcon className="w-4 h-4 text-purple-600" />;
    if (['mp3', 'wav', 'm4a'].includes(ext || '')) return <Music className="w-4 h-4 text-cyan-600" />;
    if (['mp4', 'webm'].includes(ext || '')) return <Video className="w-4 h-4 text-pink-600" />;
    return <File className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      {/* BANNIÈRE AVERTISSEMENTS OFFICIELS REÇUS PAR L'ÉLÈVE */}
      {myWarnings.length > 0 && (
        <div className="space-y-3">
          {myWarnings.map((warn) => (
            <div
              key={warn.id}
              className={`p-4 sm:p-5 rounded-3xl border shadow-md transition-all ${
                warn.severity === 'high'
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-rose-950/10'
                  : warn.severity === 'medium'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-amber-950/10'
                  : 'bg-yellow-50/90 border-yellow-300 text-yellow-950'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    warn.severity === 'high' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm uppercase tracking-wide">
                        Avertissement officiel de l'établissement
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/70 border border-current">
                        {warn.severity === 'high' ? 'Niveau Élevé' : warn.severity === 'medium' ? 'Rappel formel' : 'Information'}
                      </span>
                    </div>

                    <p className="text-xs font-bold mt-1">
                      Motif : {warn.reason}
                    </p>

                    <p className="text-xs leading-relaxed whitespace-pre-line bg-white/80 p-3 rounded-2xl border border-current/20 mt-1 font-normal">
                      {warn.message}
                    </p>

                    <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-2">
                      <span>Émis par : <strong>{warn.issuedBy}</strong></span>
                      <span>•</span>
                      <span>Le {new Date(warn.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                </div>

                {/* Accusé de réception */}
                {!warn.read ? (
                  <button
                    onClick={() => markWarningRead(warn.id)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 self-start sm:self-center shadow-xs cursor-pointer transition-colors"
                  >
                    J'ai bien pris note de cet avertissement
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full shrink-0 self-start sm:self-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pris en compte</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bannière de l'espace élève */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl shadow-cyan-950/20">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            <Sparkles className="w-3.5 h-3.5" /> {schoolName || 'Laval Academy'} • Classe 2APIC-1 • Mon Espace Personnel
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Bonjour, {currentUser?.displayName} 🎓
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Consultez toutes les leçons et cours de vos enseignants (Ali Bennis & Madame Sarah), téléchargez les documents joints, marquez vos leçons terminées et posez vos questions en commentaire.
          </p>

          <div className="pt-1 flex flex-wrap gap-2 text-xs">
            <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-cyan-200">
              Établissement : <strong>{schoolName || 'Laval Academy'}</strong>
            </span>
            <span className="bg-cyan-500/20 px-3 py-1.5 rounded-xl border border-cyan-400/40 text-cyan-200 font-bold">
              Classe : <strong>2APIC-1</strong>
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-slate-200 font-mono">
              Rôle : <strong>Élève</strong>
            </span>
            {currentUser?.studentNumber && (
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-slate-200 font-mono">
                Matricule : <strong>{currentUser.studentNumber}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grille principale : Cours & Emprunts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne 1 : Leçons et cours (7 colonnes) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                Leçons et cours publiés
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {publishedLessons.length} cours disponible(s)
            </span>
          </div>

          {/* Recherche & Filtre de matières */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par mot-clé, cours ou matière..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
              />
            </div>
            {subjectList.length > 0 && (
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-auto"
              >
                <option value="all">Toutes les matières</option>
                {subjectList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-4">
            {publishedLessons.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400 space-y-1">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Aucun cours publié pour le moment.</p>
                <p className="text-[11px] text-slate-400">
                  Dès qu'Ali Bennis ou Madame Sarah publie une leçon, elle apparaîtra automatiquement ici.
                </p>
              </div>
            ) : (
              publishedLessons.map((lsn) => {
                const formattedPubDate = formatDateToFrench(lsn.publishedAt);
                const formattedDueDate = formatDateToFrench(lsn.dueDate);

                const currentStudentId = currentUser?.studentId || currentUser?.uid;
                const isLessonDone = lessonProgress.some(p =>
                  p.lessonId === lsn.id &&
                  (p.studentId === currentStudentId || p.studentEmail.toLowerCase() === studentEmail) &&
                  p.isCompleted
                );

                const isCommentsOpen = expandedCommentsLessonId === lsn.id;

                return (
                  <div
                    key={lsn.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
                  >
                    {/* En-tête : Titre, matière, date de publication */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200">
                          {lsn.subject}
                        </span>
                        <h3 className="font-black text-slate-900 text-base mt-2">
                          {lsn.title}
                        </h3>
                      </div>

                      <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                        <Calendar className="w-3.5 h-3.5" /> Publié le {formattedPubDate}
                      </span>
                    </div>

                    {/* MENTION OFFICIELLE DATE LIMITE DE RENDU */}
                    {lsn.dueDate ? (
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center gap-2.5 text-xs font-bold shadow-2xs">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>À rendre à l'école le : {formattedDueDate}</span>
                      </div>
                    ) : null}

                    {/* Description et consignes */}
                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                      {lsn.description}
                    </div>

                    {/* Contenu du cours si disponible */}
                    {lsn.content && (
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-sky-50/40 p-3.5 rounded-2xl border border-sky-100/70">
                        <div className="font-bold text-sky-900 mb-1 text-[11px] uppercase tracking-wider">
                          Notes et cours :
                        </div>
                        {lsn.content}
                      </div>
                    )}

                    {/* Auteur du cours */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Publié par : <strong className="text-slate-700">{lsn.createdBy}</strong></span>
                    </div>

                    {/* Pièces jointes téléchargeables */}
                    {lsn.attachments.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-cyan-600" />
                          Fichiers joints à télécharger ({lsn.attachments.length}) :
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {lsn.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {getFileIcon(att.name)}
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800 truncate block text-[11px]" title={att.name}>
                                    {att.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {formatFileSize(att.size)}
                                  </span>
                                </div>
                              </div>

                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
                                title="Télécharger le fichier"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Télécharger</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* BOUTON OFFICIEL « FAIT / NON FAIT » & BOUTON COMMENTAIRES */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Bouton Fait / Non fait */}
                      <div>
                        {isLessonDone ? (
                          <button
                            onClick={() => toggleLessonProgress(lsn.id, false)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-900/20 cursor-pointer transition-all"
                            title="Vous avez indiqué avoir fait cette leçon. Cliquer pour annuler."
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>✓ Cours terminé / Fait</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleLessonProgress(lsn.id, true)}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition-all"
                          >
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>Marquer comme fait</span>
                          </button>
                        )}
                      </div>

                      {/* Bouton ouvrir les commentaires */}
                      <button
                        onClick={() => setExpandedCommentsLessonId(isCommentsOpen ? null : lsn.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Commentaires & Questions</span>
                        {isCommentsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Section de commentaires sous ce cours */}
                    {isCommentsOpen && (
                      <div className="pt-2">
                        <LessonComments lessonId={lsn.id} lessonTitle={lsn.title} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne 2 : Mes Emprunts de Livres (5 colonnes) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <BookMarked className="w-4 h-4" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Mes Livres empruntés
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {activeLoans.length} en cours
              </span>
            </div>

            {myLoans.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400 space-y-2">
                <p>Aucun livre emprunté actuellement.</p>
                <p className="text-cyan-700 font-bold">
                  Consultez la bibliothèque du club de lecture gérée par Awab pour choisir votre prochain livre !
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myLoans.map((loan) => {
                  const isOverdue = loan.status !== 'returned' && loan.dueDate < today;
                  return (
                    <div
                      key={loan.id}
                      className={`p-4 rounded-3xl border shadow-2xs transition-colors ${
                        isOverdue
                          ? 'bg-rose-50/70 border-rose-300'
                          : loan.status === 'returned'
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{loan.bookTitle}</h4>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Emprunté le {loan.loanDate}
                          </div>
                        </div>

                        {loan.status === 'returned' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Rendu le {loan.returnDate}
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-200/80 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> En retard !
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-900 bg-cyan-100 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Retour avant le {loan.dueDate}
                          </span>
                        )}
                      </div>

                      {loan.notes && (
                        <div className="text-[11px] text-slate-500 mt-2 italic">
                          Remarque : {loan.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Annonces officielles */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📢 Dernières annonces de Laval Academy</span>
            </h3>

            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
                  Aucune annonce publiée pour le moment.
                </div>
              ) : (
                announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold text-cyan-700 uppercase">{ann.category}</span>
                      <span>{ann.createdAt.slice(0, 10)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">{ann.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
