import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  Megaphone,
  Bell,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  UserX,
  TrendingUp,
  Activity,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const StatisticsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    students,
    books,
    loans,
    lessons,
    lessonProgress,
    comments,
    announcements,
    notifications
  } = useData();

  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'activity'>('overview');

  // --- A. STATISTIQUES GÉNÉRALES ---
  const generalStats = useMemo(() => {
    const totalStudents = students.filter(s => s.role === 'student').length;
    const totalTeachers = students.filter(s => s.role === 'teacher').length;
    const activeAccounts = students.filter(s => s.status === 'active').length;
    const suspendedOrBanned = students.filter(s => s.status === 'banned' || s.status === 'suspended').length;
    const pendingRequests = students.filter(s => s.status === 'pending').length;
    const totalLessons = lessons.length;
    const totalLessonComments = comments.length;
    const totalAnnouncementComments = announcements.reduce((acc, a) => acc + (a.comments?.length || 0), 0);
    const totalComments = totalLessonComments + totalAnnouncementComments;
    const totalAnnouncements = announcements.length;
    const totalNotifications = notifications.length;

    return {
      totalStudents,
      totalTeachers,
      activeAccounts,
      suspendedOrBanned,
      pendingRequests,
      totalLessons,
      totalComments,
      totalLessonComments,
      totalAnnouncementComments,
      totalAnnouncements,
      totalNotifications
    };
  }, [students, lessons, comments, announcements, notifications]);

  // --- B. STATISTIQUES DES COURS & PROGRESSION ---
  const coursesStats = useMemo(() => {
    const activeStudentsCount = generalStats.totalStudents;
    const totalLessonsCount = lessons.length;

    // Nombre de complétions enregistrées
    const completedProgressList = lessonProgress.filter(p => p.isCompleted);
    const completedCount = completedProgressList.length;

    // Taux global : complétions réelles rapportées au nombre potentiel (élèves actifs * leçons)
    const potentialCompletions = activeStudentsCount * totalLessonsCount;
    const globalProgressRate = potentialCompletions > 0
      ? Math.min(100, Math.round((completedCount / potentialCompletions) * 100))
      : (totalLessonsCount > 0 && completedCount > 0 ? 100 : 0);

    const pendingCount = Math.max(0, potentialCompletions - completedCount);

    // Activité par matière
    const subjectCounts: Record<string, number> = {};
    lessons.forEach(l => {
      const subj = l.subject || 'Autre';
      subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
    });

    const subjectsData = Object.entries(subjectCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Cours les plus suivis (avec complétions ou commentaires)
    const popularLessons = lessons.map(l => {
      const lessonCompletions = completedProgressList.filter(p => p.lessonId === l.id).length;
      const lessonComments = comments.filter(c => c.lessonId === l.id).length;
      const attachmentCount = l.attachments?.length || 0;
      return {
        ...l,
        completionsCount: lessonCompletions,
        commentsCount: lessonComments,
        attachmentCount
      };
    }).sort((a, b) => (b.completionsCount + b.commentsCount) - (a.completionsCount + a.commentsCount));

    return {
      totalLessonsCount,
      completedCount,
      pendingCount,
      globalProgressRate,
      subjectsData,
      popularLessons
    };
  }, [lessons, lessonProgress, comments, generalStats.totalStudents]);

  // --- C. ACTIVITÉ DE LA PLATEFORME & LECTURES D'ANNONCES ---
  const platformActivity = useMemo(() => {
    const totalAnnouncementsRead = announcements.reduce((acc, a) => acc + (a.readBy?.length || 0), 0);
    const totalAnnouncementLikes = announcements.reduce((acc, a) => acc + (a.likes?.length || 0), 0);

    // Activité récente réelle (fusion ordonnée des dates de création d'élèves, leçons, commentaires, annonces)
    interface ActivityItem {
      id: string;
      title: string;
      type: 'student' | 'lesson' | 'comment' | 'announcement';
      date: string;
      actor: string;
      details?: string;
    }

    const items: ActivityItem[] = [];

    students.forEach(s => {
      if (s.createdAt) {
        items.push({
          id: `st_${s.id}`,
          title: `Compte élève (${s.status === 'active' ? 'Actif' : s.status})`,
          type: 'student',
          date: s.createdAt,
          actor: `${s.firstName} ${s.lastName}`.trim(),
          details: `Classe : ${s.className || '2APIC-1'}`
        });
      }
    });

    lessons.forEach(l => {
      if (l.createdAt) {
        items.push({
          id: `ls_${l.id}`,
          title: `Publication du cours « ${l.title} »`,
          type: 'lesson',
          date: l.createdAt,
          actor: l.createdBy || 'Corps enseignant',
          details: `Matière : ${l.subject}`
        });
      }
    });

    comments.forEach(c => {
      if (c.createdAt) {
        items.push({
          id: `cm_${c.id}`,
          title: `Commentaire pédagogique déposé`,
          type: 'comment',
          date: c.createdAt,
          actor: c.authorName,
          details: `« ${c.content.slice(0, 50)}${c.content.length > 50 ? '...' : ''} »`
        });
      }
    });

    announcements.forEach(a => {
      if (a.createdAt) {
        items.push({
          id: `an_${a.id}`,
          title: `Annonce : ${a.title}`,
          type: 'announcement',
          date: a.createdAt,
          actor: a.authorName,
          details: `Catégorie : ${a.category}`
        });
      }
    });

    const recentActivities = items
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

    // Répartition des annonces par catégorie
    const annCategoryCounts: Record<string, number> = {};
    announcements.forEach(a => {
      const cat = a.category || 'general';
      annCategoryCounts[cat] = (annCategoryCounts[cat] || 0) + 1;
    });

    const annCategoryData = Object.entries(annCategoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalAnnouncementsRead,
      totalAnnouncementLikes,
      recentActivities,
      annCategoryData
    };
  }, [students, lessons, comments, announcements]);

  // Formattage date
  const formatDateFr = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'general':
        return 'Informations générales';
      case 'important':
        return 'Annonces importantes';
      case 'homework':
        return 'Devoirs et rappels';
      case 'event':
        return 'Événements scolaires';
      case 'teachers':
        return 'Infos professeurs';
      case 'activities':
        return 'Activités scolaires';
      case 'club':
        return 'Club de lecture';
      case 'course':
        return 'Cours & leçons';
      default:
        return cat;
    }
  };

  const hasAnyData =
    generalStats.totalStudents > 0 ||
    generalStats.totalLessons > 0 ||
    generalStats.totalAnnouncements > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* En-tête officiel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tableau de Bord des Statistiques
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-200">
              Données Firebase en direct
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Indicateurs d'activité réelle, progression pédagogique et engagement des élèves de Laval Academy.
          </p>
        </div>

        {/* Navigation par onglets */}
        <div className="flex items-center bg-slate-200/60 p-1 rounded-2xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vue Générale
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'courses'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cours & Progression
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'activity'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activité & Journal
          </button>
        </div>
      </div>

      {!hasAnyData && (
        <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong className="font-bold">Aucune donnée statistique enregistrée pour le moment.</strong>
            <p className="mt-0.5 text-amber-800">
              Les statistiques s'actualisent automatiquement à mesure que les élèves s'inscrivent, que les cours sont publiés et que les annonces sont partagées.
            </p>
          </div>
        </div>
      )}

      {/* --- ONGLET 1 : VUE GÉNÉRALE --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cartes KPI Générales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total élèves inscrits */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold">Élèves Inscrits</span>
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900">
                {generalStats.totalStudents}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Classe 2APIC-1 • Laval Academy
              </div>
            </div>

            {/* 2. Total professeurs */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold">Professeurs</span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-purple-950">
                {generalStats.totalTeachers}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Enseignants autorisés
              </div>
            </div>

            {/* 3. Total comptes actifs */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold">Comptes Actifs</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-700">
                {generalStats.activeAccounts}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Accès autorisé à la plateforme
              </div>
            </div>

            {/* 4. Comptes suspendus ou bannis */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold">Comptes Suspendus</span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-rose-700">
                {generalStats.suspendedOrBanned}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {generalStats.pendingRequests > 0
                  ? `${generalStats.pendingRequests} demande(s) en attente`
                  : 'Aucun blocage'}
              </div>
            </div>

            {/* 5. Cours publiés */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold">Cours Publiés</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-indigo-950">
                {generalStats.totalLessons}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Supports et leçons en ligne
              </div>
            </div>

            {/* 6. Commentaires totaux */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold">Commentaires Publiés</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-cyan-800">
                {generalStats.totalComments}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {generalStats.totalLessonComments} sur cours, {generalStats.totalAnnouncementComments} sur annonces
              </div>
            </div>

            {/* 7. Demandes d'inscription en attente */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold">Inscriptions en Attente</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-amber-700">
                {generalStats.pendingRequests}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {generalStats.pendingRequests === 0 ? 'Toutes les demandes sont traitées' : 'À valider par l\'admin'}
              </div>
            </div>

            {/* 8. Annonces publiées */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold">Annonces & Communication</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-800">
                {generalStats.totalAnnouncements}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Publications officielles diffusées
              </div>
            </div>
          </div>

          {/* Graphiques Section 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique A : Répartition des Rôles */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-600" />
                    <span>Répartition des Comptes et Rôles</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structure des utilisateurs inscrits dans ClassConnect
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {students.length} utilisateur{students.length > 1 ? 's' : ''}
                </span>
              </div>

              {students.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Aucun compte enregistré pour le moment.
                </div>
              ) : (
                <div className="space-y-3.5 pt-2">
                  {[
                    { label: 'Élèves', count: generalStats.totalStudents, color: 'bg-emerald-500', barBg: 'bg-emerald-100' },
                    { label: 'Professeurs', count: generalStats.totalTeachers, color: 'bg-purple-500', barBg: 'bg-purple-100' },
                    { label: 'Responsable Club', count: students.filter(s => s.role === 'club_manager').length, color: 'bg-cyan-500', barBg: 'bg-cyan-100' },
                    { label: 'Administrateur', count: students.filter(s => s.role === 'admin').length, color: 'bg-indigo-600', barBg: 'bg-indigo-100' }
                  ].map((item, idx) => {
                    const pct = students.length > 0 ? Math.round((item.count / students.length) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-800">{item.label}</span>
                          <span className="text-slate-600 font-bold">{item.count} ({pct}%)</span>
                        </div>
                        <div className={`w-full h-3 rounded-full overflow-hidden ${item.barBg}`}>
                          <div
                            className={`h-full ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Graphique B : Progression Globale des Leçons */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Progression Globale des Élèves</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Suivi des leçons terminées par les élèves inscrits
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {coursesStats.globalProgressRate}% achevé
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
                    <span className="text-xs text-emerald-800 font-medium">Leçons Terminées</span>
                    <div className="text-2xl font-black text-emerald-700 mt-1">
                      {coursesStats.completedCount}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
                    <span className="text-xs text-slate-600 font-medium">Leçons Non Terminées</span>
                    <div className="text-2xl font-black text-slate-800 mt-1">
                      {coursesStats.pendingCount}
                    </div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Avancement des élèves</span>
                    <span>{coursesStats.globalProgressRate}%</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${coursesStats.globalProgressRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-4 text-center">
                Calculé d'après les actions « Fait / Non fait » validées par les élèves.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET 2 : COURS & PROGRESSION DÉTAILLÉE --- */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {/* Répartition par matière */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Activité des Cours par Matière</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Nombre de cours publiés selon les disciplines d'enseignement
              </p>

              {coursesStats.subjectsData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Aucun cours publié pour le moment.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {coursesStats.subjectsData.map((subj, idx) => {
                    const pct = Math.round((subj.count / lessons.length) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{subj.name}</span>
                          <span className="text-slate-600">{subj.count} cours ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Répartition des annonces par catégorie */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-cyan-600" />
                <span>Activité des Annonces par Catégorie</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Distribution thématique des messages officiels diffusés
              </p>

              {platformActivity.annCategoryData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Aucune annonce publiée pour le moment.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {platformActivity.annCategoryData.map((cat, idx) => {
                    const pct = Math.round((cat.count / announcements.length) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{getCategoryLabel(cat.name)}</span>
                          <span className="text-slate-600">{cat.count} publication(s) ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-600 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tableau des cours les plus consultés / suivis */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Cours les Plus Consultés & Engagés</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Classement basé sur le nombre de complétions par les élèves et de commentaires déposés
            </p>

            {coursesStats.popularLessons.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Aucun cours disponible pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">Titre du cours</th>
                      <th className="py-2.5 px-3">Matière</th>
                      <th className="py-2.5 px-3">Auteur</th>
                      <th className="py-2.5 px-3 text-center">Ressources</th>
                      <th className="py-2.5 px-3 text-center">Élèves ayant terminé</th>
                      <th className="py-2.5 px-3 text-center">Commentaires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coursesStats.popularLessons.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 max-w-[240px] truncate">
                          {l.title}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {l.subject}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {l.createdBy || 'Enseignant'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {l.attachmentCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {l.completionsCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-cyan-700">
                          {l.commentsCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ONGLET 3 : ACTIVITÉ DE LA PLATEFORME & JOURNAL --- */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* Métriques d'interactions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Lectures d'Annonces</span>
              <div className="text-3xl font-black text-cyan-800 mt-2">
                {platformActivity.totalAnnouncementsRead}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Lectures réelles confirmées par les destinataires
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Réactions « J'aime »</span>
              <div className="text-3xl font-black text-rose-600 mt-2">
                {platformActivity.totalAnnouncementLikes}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Interactions positives sur les annonces
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Notifications Transmises</span>
              <div className="text-3xl font-black text-indigo-900 mt-2">
                {generalStats.totalNotifications}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Alertes automatiques en temps réel
              </p>
            </div>
          </div>

          {/* Journal chronologique d'activité réelle */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" />
              <span>Activité Récente des Utilisateurs</span>
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Historique réel des événements et actions enregistrés sur ClassConnect
            </p>

            {platformActivity.recentActivities.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Aucune activité enregistrée pour le moment.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {platformActivity.recentActivities.map((act) => (
                  <div key={act.id} className="relative group">
                    <span className="absolute -left-[1.85rem] top-1 w-3 h-3 rounded-full bg-white border-2 border-cyan-500 group-hover:scale-125 transition-transform" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900">
                        {act.title}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDateFr(act.date)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Par <strong className="text-slate-800">{act.actor}</strong>
                      {act.details && <span className="text-slate-500"> — {act.details}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
