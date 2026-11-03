import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Lesson, LessonAttachment } from '../types';
import { exportLessonsToExcel } from '../utils/excel';
import { LessonComments } from '../components/LessonComments';
import {
  BookOpen,
  Plus,
  Calendar,
  FileSpreadsheet,
  FileText,
  User,
  Paperclip,
  Download,
  Trash2,
  Edit3,
  X,
  File,
  Image as ImageIcon,
  Music,
  Video,
  AlertCircle,
  Clock,
  Search,
  CheckCircle2,
  BookmarkCheck,
  Send,
  Save,
  Filter,
  Check,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SUBJECT_PRESETS = [
  'Français',
  'Français - Lecture méthodique',
  'Français - Expression écrite',
  'Mathématiques',
  'Histoire-Géographie',
  'Sciences de la Vie et de la Terre (SVT)',
  'Physique-Chimie',
  'Langue Arabe',
  'Langue Anglaise',
  'Éducation Islamique',
  'Informatique'
];

export const LessonsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    lessons,
    students,
    lessonProgress,
    toggleLessonProgress,
    addLesson,
    updateLesson,
    deleteLesson,
    schoolName
  } = useData();

  // Ali Bennis (Admin) et Madame Sarah (Professeur) ont tous les deux le droit de publier, modifier et supprimer
  const canPublish = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
  const isStudent = currentUser?.role === 'student';

  // Recherche & filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Leçon active
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Formulaire de publication (dates NON préremplies avec des exemples conformément à la consigne)
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Français',
    description: '',
    content: '',
    publishedAt: '', // Vide par défaut
    courseDate: '', // Vide par défaut (facultatif)
    dueDate: '', // Date limite de rendu à l'école (facultatif, sélecteur de date)
    attachments: [] as LessonAttachment[]
  });

  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filtrage des leçons pour la vue élève / responsable / enseignant
  const visibleLessons = useMemo(() => {
    return lessons.filter(lsn => {
      // Les élèves et Awab ne voient que les cours publiés
      if (!canPublish && lsn.status === 'draft') {
        return false;
      }

      if (statusFilter !== 'all' && lsn.status !== statusFilter) {
        return false;
      }

      if (selectedSubjectFilter !== 'all' && lsn.subject !== selectedSubjectFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = lsn.title.toLowerCase().includes(query);
        const matchesDesc = lsn.description.toLowerCase().includes(query);
        const matchesContent = lsn.content ? lsn.content.toLowerCase().includes(query) : false;
        const matchesSubject = lsn.subject.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesContent && !matchesSubject) {
          return false;
        }
      }

      return true;
    });
  }, [lessons, canPublish, statusFilter, selectedSubjectFilter, searchQuery]);

  // Leçon active sélectionnée
  const activeLesson = useMemo(() => {
    if (selectedLessonId) {
      const found = visibleLessons.find(l => l.id === selectedLessonId);
      if (found) return found;
    }
    return visibleLessons[0] || null;
  }, [selectedLessonId, visibleLessons]);

  // Formattage date JJ/MM/AAAA
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

  // Ouverture du formulaire de publication
  const openPublishModal = () => {
    setEditingLesson(null);
    setFormData({
      title: '',
      subject: 'Français',
      description: '',
      content: '',
      publishedAt: '', // Non pré-rempli
      courseDate: '',
      dueDate: '',
      attachments: []
    });
    setUploadError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      subject: lesson.subject,
      description: lesson.description,
      content: lesson.content || '',
      publishedAt: lesson.publishedAt || '',
      courseDate: lesson.courseDate || '',
      dueDate: lesson.dueDate || '',
      attachments: [...lesson.attachments]
    });
    setUploadError(null);
    setIsFormModalOpen(true);
  };

  // Téléversement de pièces jointes multi-formats (PDF, Word, PowerPoint, Excel, Images, etc.)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);

    Array.from(files).forEach((file, index) => {
      if (file.size > 8 * 1024 * 1024) {
        setUploadError(`Le fichier "${file.name}" dépasse 8 Mo. Veuillez choisir un document optimisé.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newAttachment: LessonAttachment = {
          id: `att_${Date.now()}_${index}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString()
        };

        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
      };

      reader.onerror = () => {
        setUploadError(`Erreur lors de la lecture du fichier "${file.name}".`);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveAttachment = (attId: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== attId)
    }));
  };

  // Enregistrement : « Enregistrer comme brouillon » ou « Publier le cours »
  const handleSaveLesson = async (status: 'published' | 'draft') => {
    if (!formData.title.trim()) {
      alert('Veuillez renseigner le titre du cours ou de la leçon.');
      return;
    }
    if (!formData.description.trim()) {
      alert('Veuillez renseigner la description ou les consignes du cours.');
      return;
    }
    if (!formData.publishedAt) {
      alert('Veuillez sélectionner la date de publication.');
      return;
    }

    const authorTitle = currentUser?.role === 'admin'
      ? 'Ali Bennis (Admin)'
      : currentUser?.role === 'teacher'
      ? 'Madame Sarah (Professeur)'
      : (currentUser?.displayName || 'Enseignant');

    const payload: Omit<Lesson, 'id' | 'createdAt'> = {
      title: formData.title.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim(),
      content: formData.content.trim(),
      publishedAt: formData.publishedAt,
      courseDate: formData.courseDate ? formData.courseDate : null,
      dueDate: formData.dueDate ? formData.dueDate : null,
      attachments: formData.attachments,
      createdBy: authorTitle,
      authorRole: currentUser?.role,
      status
    };

    if (editingLesson) {
      await updateLesson(editingLesson.id, payload);
    } else {
      await addLesson(payload);
    }

    setIsFormModalOpen(false);
  };

  const handleDeleteLesson = async (id: string, title: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le cours "${title}" ?`)) {
      await deleteLesson(id);
      if (selectedLessonId === id) {
        setSelectedLessonId(null);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-500" />;
    if (['doc', 'docx', 'rtf'].includes(ext || '')) return <FileText className="w-5 h-5 text-blue-600" />;
    if (['ppt', 'pptx'].includes(ext || '')) return <FileText className="w-5 h-5 text-amber-600" />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-purple-600" />;
    if (['mp3', 'wav', 'm4a'].includes(ext || '')) return <Music className="w-5 h-5 text-cyan-600" />;
    if (['mp4', 'webm'].includes(ext || '')) return <Video className="w-5 h-5 text-pink-600" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      {/* En-tête principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Leçons et cours
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-cyan-100 text-cyan-900 border border-cyan-200">
              {schoolName || 'Laval Academy'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Espace pédagogique officiel : cours, leçons, dates limites de rendu à l'école et documents téléchargeables.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canPublish && lessons.length > 0 && (
            <button
              onClick={() => exportLessonsToExcel(lessons, 'xlsx')}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exporter (.xlsx)</span>
            </button>
          )}

          {/* Bouton officiel demandé : « Publier un cours / une leçon » */}
          {canPublish && (
            <button
              onClick={openPublishModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-700 hover:from-cyan-500 hover:to-sky-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-cyan-950/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Publier un cours / une leçon</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche et de filtres pour retrouver facilement les cours */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un cours, mot-clé ou sujet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Filtre par matière */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
            >
              <option value="all">Toutes les matières</option>
              {SUBJECT_PRESETS.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Filtre brouillon / publié pour les enseignants */}
          {canPublish && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('published')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'published' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Publiés
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'draft' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Brouillons
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Disposition principale : liste à gauche, contenu complet à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche : Liste des cours */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Publications ({visibleLessons.length})
            </h3>
            {canPublish && (
              <span className="text-[11px] text-slate-400">
                Ali Bennis & Madame Sara
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {visibleLessons.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">
                  {lessons.length === 0 ? 'Aucun cours publié pour le moment.' : 'Aucun cours ne correspond aux critères.'}
                </p>
                {canPublish && (
                  <p className="text-[11px] text-slate-400">
                    Cliquez sur « Publier un cours / une leçon » ci-dessus pour ajouter du contenu.
                  </p>
                )}
              </div>
            ) : (
              visibleLessons.map((lsn) => {
                const isSelected = activeLesson?.id === lsn.id;
                const formattedPubDate = formatDateToFrench(lsn.publishedAt);
                const formattedDueDate = formatDateToFrench(lsn.dueDate);

                return (
                  <div
                    key={lsn.id}
                    onClick={() => setSelectedLessonId(lsn.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-950/20'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-cyan-400 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                            : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                        }`}
                      >
                        {lsn.subject}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {lsn.status === 'draft' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white">
                            Brouillon
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-medium flex items-center gap-1 ${
                            isSelected ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" /> {formattedPubDate}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm mt-2 line-clamp-1">{lsn.title}</h4>
                    <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                      {lsn.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                      {lsn.dueDate ? (
                        <span className={`flex items-center gap-1 font-bold ${isSelected ? 'text-amber-300' : 'text-amber-700'}`}>
                          <Clock className="w-3.5 h-3.5" /> À rendre : {formattedDueDate}
                        </span>
                      ) : (
                        <span className={isSelected ? 'text-slate-400' : 'text-slate-400'}>
                          Cours
                        </span>
                      )}

                      {lsn.attachments.length > 0 && (
                        <span className={`flex items-center gap-1 font-bold ${isSelected ? 'text-cyan-300' : 'text-cyan-700'}`}>
                          <Paperclip className="w-3.5 h-3.5" />
                          {lsn.attachments.length} fichier(s)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne droite : Détail du cours sélectionné */}
        <div className="lg:col-span-7 space-y-4">
          {activeLesson ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              {/* En-tête du cours */}
              <div className="space-y-3 pb-6 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                        {activeLesson.subject}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">
                        Date de publication : <strong>{formatDateToFrench(activeLesson.publishedAt)}</strong>
                      </span>
                      {activeLesson.courseDate && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">
                            Date du cours : <strong>{formatDateToFrench(activeLesson.courseDate)}</strong>
                          </span>
                        </>
                      )}
                      {activeLesson.status === 'draft' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          Brouillon (Non visible par les élèves)
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                      {activeLesson.title}
                    </h2>
                  </div>

                  {canPublish && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(activeLesson)}
                        className="p-2 rounded-xl text-slate-500 hover:text-cyan-700 hover:bg-slate-100 cursor-pointer transition-colors"
                        title="Modifier le cours"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLesson(activeLesson.id, activeLesson.title)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Supprimer le cours"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* MENTION EXPLICITE DE LA DATE LIMITE DE RENDU SELON LES EXIGENCES STRICTES */}
                {activeLesson.dueDate ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-950 flex items-center gap-3 text-xs shadow-2xs">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <div className="font-extrabold text-sm text-amber-900">
                        À rendre à l'école le : {formatDateToFrench(activeLesson.dueDate)}
                      </div>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Travail demandé par l'enseignant à rapporter et remettre en classe avant cette date.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Description et consignes */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Consignes & Description :
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                    {activeLesson.description}
                  </div>
                </div>

                {/* Contenu détaillé du cours si renseigné */}
                {activeLesson.content && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Contenu du cours :
                    </h4>
                    <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                      {activeLesson.content}
                    </div>
                  </div>
                )}

                {/* Auteur du cours */}
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <User className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Publié par : <strong>{activeLesson.createdBy}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Établissement : <strong>{schoolName || 'Laval Academy'}</strong></span>
                </div>
              </div>

              {/* PIÈCES JOINTES TÉLÉCHARGEABLES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-cyan-600" />
                    <span>Fichiers joints ({activeLesson.attachments.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    PDF, Word, PowerPoint, Excel, Images
                  </span>
                </div>

                {activeLesson.attachments.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    Aucun fichier joint à cette leçon.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeLesson.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                            {getFileIcon(att.name)}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-800 truncate" title={att.name}>
                              {att.name}
                            </h5>
                            <span className="text-[10px] text-slate-400">
                              {formatFileSize(att.size)}
                            </span>
                          </div>
                        </div>

                        <a
                          href={att.dataUrl}
                          download={att.name}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
                          title={`Télécharger ${att.name}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Télécharger</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* STATUT FAIT / NON FAIT POUR L'ÉLÈVE */}
              {isStudent && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-cyan-50/50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      Suivi d'apprentissage de cette leçon :
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Indiquez à votre enseignant si vous avez terminé et assimilé ce cours.
                    </span>
                  </div>

                  {lessonProgress.some(p => p.lessonId === activeLesson.id && (p.studentId === (currentUser.studentId || currentUser.uid) || p.studentEmail.toLowerCase() === currentUser.email.toLowerCase()) && p.isCompleted) ? (
                    <button
                      onClick={() => toggleLessonProgress(activeLesson.id, false)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-900/20 cursor-pointer transition-all"
                      title="Cliquer pour repasser en non fait"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✓ Cours terminé / Fait</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleLessonProgress(activeLesson.id, true)}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition-all hover:border-cyan-500"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Marquer ce cours comme fait</span>
                    </button>
                  )}
                </div>
              )}

              {/* SUIVI DES ÉLÈVES (VUE ENSEIGNANT & ADMIN) */}
              {canPublish && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">
                          Suivi des élèves • Classe 2APIC-1
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Progression réelle des élèves inscrits (aucun compte fictif)
                        </span>
                      </div>
                    </div>

                    {/* Compteur global */}
                    {(() => {
                      const realStudents = students.filter(s => s.role === 'student' && s.status !== 'rejected');
                      const doneCount = realStudents.filter(st =>
                        lessonProgress.some(p => p.lessonId === activeLesson.id && (p.studentId === st.id || p.studentEmail.toLowerCase() === st.email.toLowerCase()) && p.isCompleted)
                      ).length;
                      const percent = realStudents.length > 0 ? Math.round((doneCount / realStudents.length) * 100) : 0;

                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-800">
                            {doneCount} / {realStudents.length} ont terminé ({percent}%)
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tableau des élèves réels */}
                  {(() => {
                    const realStudents = students.filter(s => s.role === 'student' && s.status !== 'rejected');
                    if (realStudents.length === 0) {
                      return (
                        <div className="p-4 text-center rounded-xl bg-white border border-slate-200 text-xs text-slate-400">
                          Aucun élève inscrit dans la classe 2APIC-1 pour le moment.
                        </div>
                      );
                    }

                    return (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {realStudents.map((st) => {
                            const isDone = lessonProgress.some(p =>
                              p.lessonId === activeLesson.id &&
                              (p.studentId === st.id || p.studentEmail.toLowerCase() === st.email.toLowerCase()) &&
                              p.isCompleted
                            );
                            const record = lessonProgress.find(p =>
                              p.lessonId === activeLesson.id &&
                              (p.studentId === st.id || p.studentEmail.toLowerCase() === st.email.toLowerCase())
                            );

                            return (
                              <div key={st.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 font-bold text-[10px] flex items-center justify-center text-slate-600 shrink-0">
                                    {st.firstName.charAt(0)}{st.lastName ? st.lastName.charAt(0) : ''}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 truncate block">
                                      {st.firstName} {st.lastName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {st.studentNumber || st.email}
                                    </span>
                                  </div>
                                </div>

                                {isDone ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Fait {record?.completedAt ? `(le ${new Date(record.completedAt).toLocaleDateString('fr-FR')})` : ''}</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 shrink-0">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>Non fait</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SECTION COMMENTAIRES ET QUESTIONS */}
              <LessonComments lessonId={activeLesson.id} lessonTitle={activeLesson.title} />
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
              Sélectionnez une leçon à gauche pour afficher son contenu et ses fichiers joints.
            </div>
          )}
        </div>
      </div>

      {/* FORMULAIRE DE PUBLICATION / MODIFICATION DE COURS */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingLesson ? 'Modifier le cours / la leçon' : 'Publier un nouveau cours / une nouvelle leçon'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publié sous le rôle de : <strong>{currentUser?.displayName}</strong> ({currentUser?.role === 'admin' ? 'Admin' : 'Professeur'})
                </p>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              {/* Informations du cours */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Titre du cours ou de la leçon *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex : Les figures de style dans la poésie moderne"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Matière *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                  >
                    {SUBJECT_PRESETS.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Date de publication *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-400">Choisissez la date de publication</span>
                </div>
              </div>

              {/* Date du cours et Date limite de rendu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date du cours (facultative) :
                  </label>
                  <input
                    type="date"
                    value={formData.courseDate}
                    onChange={(e) => setFormData({ ...formData, courseDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[10px] text-slate-400">Date à laquelle le cours a été dispensé</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Date limite de rendu à l'école (facultative) :
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                  <span className="text-[10px] text-amber-700">
                    Sélecteur complet (jour/mois/année) si un travail est à rendre
                  </span>
                </div>
              </div>

              {/* Description et consignes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Description et consignes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Présentation du cours, consignes générales pour les élèves..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed"
                />
              </div>

              {/* Contenu du cours */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Contenu du cours (texte explicatif ou résumé) :
                </label>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Rédigez ici le cours complet, les définitions clés, formules ou exemples pour les élèves..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed"
                />
              </div>

              {/* Zone d'ajout de fichiers : PDF, Word, PowerPoint, Excel, Images, etc. */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Fichiers joints (PDF, Word, PowerPoint, Excel, Images, etc.)
                  </label>
                  <label
                    htmlFor="courseFilesInput"
                    className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un fichier</span>
                  </label>
                  <input
                    id="courseFilesInput"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {formData.attachments.length === 0 ? (
                  <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-center text-xs text-slate-400">
                    Aucun fichier joint. Cliquez sur « Ajouter un fichier » pour joindre un document Word, PDF, PowerPoint ou Excel.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(att.name)}
                          <span className="font-semibold text-slate-800 truncate" title={att.name}>
                            {att.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            ({formatFileSize(att.size)})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Retirer ce fichier"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DEUX BOUTONS D'ACTION OFFICIELS :
                  - « Enregistrer comme brouillon »
                  - « Publier le cours »
              */}
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveLesson('draft')}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-slate-500" />
                    <span>Enregistrer comme brouillon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveLesson('published')}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-sky-700 hover:from-cyan-500 hover:to-sky-600 rounded-xl shadow-md shadow-cyan-950/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Publier le cours</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
