import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Announcement,
  AnnouncementCategory,
  AudienceTarget,
  AnnouncementAttachment,
  AnnouncementVideo
} from '../types';
import { uploadMediaFile } from '../utils/fileUpload';
import {
  Megaphone,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Heart,
  MessageCircle,
  Eye,
  CheckCircle2,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  X,
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Bold,
  Italic,
  List,
  AlertTriangle,
  Clock,
  Sparkles,
  User,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

export const AnnouncementsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePinAnnouncement,
    toggleLikeAnnouncement,
    markAnnouncementAsRead,
    addAnnouncementComment,
    deleteAnnouncementComment
  } = useData();

  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';
  const isClubManager = currentUser?.role === 'club_manager';
  const canPost = isAdmin || isTeacher || isClubManager;

  // Filtrage et recherche
  const [selectedCategory, setSelectedCategory] = useState<'all' | AnnouncementCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Visionneuse Lightbox d'image plein écran
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Modale des lecteurs
  const [activeReadersModal, setActiveReadersModal] = useState<Announcement | null>(null);

  // État du formulaire de création / édition
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('general');
  const [formAudience, setFormAudience] = useState<AudienceTarget>('all');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formIsImportant, setFormIsImportant] = useState(false);

  // Médias en cours d'édition
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formVideos, setFormVideos] = useState<AnnouncementVideo[]>([]);
  const [formAttachments, setFormAttachments] = useState<AnnouncementAttachment[]>([]);
  const [formExternalLinks, setFormExternalLinks] = useState<{ title: string; url: string }[]>([]);

  // Vidéo externe saisie
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);

  // Lien externe saisi
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Chargement téléversement
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // État des commentaires par annonce
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  // Filtrer les annonces visibles selon le rôle et l'audience
  const visibleAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      // Vérification des droits d'audience
      if (currentUser?.role === 'student') {
        if (a.audience === 'all_teachers') return false;
      }
      if (currentUser?.role === 'teacher') {
        if (a.audience === 'all_students') return false;
      }

      // Filtre catégorie
      if (selectedCategory !== 'all' && a.category !== selectedCategory) {
        return false;
      }

      // Filtre recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchContent = a.content.toLowerCase().includes(q);
        const matchAuthor = (a.authorName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAuthor) return false;
      }

      return true;
    });
  }, [announcements, currentUser, selectedCategory, searchQuery]);

  // Tri : Épinglées/importantes en tête, puis les plus récentes
  const sortedAnnouncements = useMemo(() => {
    return [...visibleAnnouncements].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [visibleAnnouncements]);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormCategory('general');
    setFormAudience('all');
    setFormIsPinned(false);
    setFormIsImportant(false);
    setFormImages([]);
    setFormVideos([]);
    setFormAttachments([]);
    setFormExternalLinks([]);
    setNewVideoUrl('');
    setNewVideoTitle('');
    setShowVideoInput(false);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setShowLinkInput(false);
    setUploadError(null);
    setEditingAnnouncement(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (a: Announcement) => {
    setEditingAnnouncement(a);
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormCategory(a.category);
    setFormAudience(a.audience || 'all');
    setFormIsPinned(a.isPinned);
    setFormIsImportant(a.isImportant || false);
    setFormImages(a.images || []);
    setFormVideos(a.videos || []);
    setFormAttachments(a.attachments || []);
    setFormExternalLinks(a.externalLinks || []);
    setUploadError(null);
    setIsModalOpen(true);
  };

  // Insertion rapide de mise en forme dans le texte
  const insertFormatting = (tag: 'bold' | 'italic' | 'list') => {
    if (tag === 'bold') {
      setFormContent(prev => `${prev} **texte en gras** `);
    } else if (tag === 'italic') {
      setFormContent(prev => `${prev} *texte en italique* `);
    } else if (tag === 'list') {
      setFormContent(prev => `${prev}\n- Élément de liste 1\n- Élément de liste 2\n`);
    }
  };

  // Téléversement d'images multiples
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(`L'image ${file.name} dépasse la limite autorisée de 15 Mo.`);
        }
        const res = await uploadMediaFile(file, 'announcements/images');
        uploadedUrls.push(res.url);
      }
      setFormImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors du téléversement de l'image.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Téléversement de vidéos
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 40 * 1024 * 1024) {
      setUploadError("Le fichier vidéo dépasse la limite de 40 Mo. Pour les vidéos volumineuses, utilisez un lien externe.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await uploadMediaFile(file, 'announcements/videos');
      setFormVideos(prev => [
        ...prev,
        {
          id: `vid_${Date.now()}`,
          url: res.url,
          title: file.name,
          type: 'upload'
        }
      ]);
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors du téléversement de la vidéo.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Ajout vidéo externe
  const handleAddExternalVideo = () => {
    const trimmed = newVideoUrl.trim();
    if (!trimmed) return;
    setFormVideos(prev => [
      ...prev,
      {
        id: `vid_${Date.now()}`,
        url: trimmed,
        title: newVideoTitle.trim() || 'Vidéo externe',
        type: 'external'
      }
    ]);
    setNewVideoUrl('');
    setNewVideoTitle('');
    setShowVideoInput(false);
  };

  // Téléversement de documents (PDF, Word, PPT...)
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const newDocs: AnnouncementAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          throw new Error(`Le document ${file.name} dépasse la limite de 25 Mo.`);
        }
        const res = await uploadMediaFile(file, 'announcements/documents');
        newDocs.push({
          id: `doc_${Date.now()}_${i}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: res.url,
          uploadedAt: new Date().toISOString()
        });
      }
      setFormAttachments(prev => [...prev, ...newDocs]);
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors du téléversement du document.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Ajout lien externe
  const handleAddExternalLink = () => {
    const trimmedUrl = newLinkUrl.trim();
    if (!trimmedUrl) return;
    setFormExternalLinks(prev => [
      ...prev,
      {
        title: newLinkTitle.trim() || trimmedUrl,
        url: trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`
      }
    ]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setShowLinkInput(false);
  };

  // Soumission création ou modification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      setUploadError('Veuillez renseigner un titre et un contenu pour l\'annonce.');
      return;
    }

    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, {
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          audience: formAudience,
          isPinned: formIsPinned,
          isImportant: formIsImportant,
          images: formImages,
          videos: formVideos,
          attachments: formAttachments,
          externalLinks: formExternalLinks
        });
      } else {
        await addAnnouncement({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          audience: formAudience,
          authorId: currentUser?.studentId || currentUser?.uid,
          authorName: currentUser?.displayName || (isAdmin ? 'Ali Bennis' : 'Corps enseignant'),
          authorEmail: currentUser?.email,
          authorRole: currentUser?.role || 'admin',
          isPinned: formIsPinned,
          isImportant: formIsImportant,
          images: formImages,
          videos: formVideos,
          attachments: formAttachments,
          externalLinks: formExternalLinks
        });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors de l'enregistrement de l'annonce.");
    }
  };

  // Suppression d'annonce
  const handleDeleteAnnouncement = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette annonce ?')) {
      await deleteAnnouncement(id);
    }
  };

  // Ajout commentaire sur annonce
  const handleCommentSubmit = async (announcementId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = (commentInputs[announcementId] || '').trim();
    if (!content) return;

    await addAnnouncementComment(announcementId, content);
    setCommentInputs(prev => ({ ...prev, [announcementId]: '' }));
  };

  // Formatage taille de fichier
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Ko';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Badges visuels par catégorie
  const categoryConfig: Record<
    AnnouncementCategory,
    { label: string; badgeClass: string; borderClass: string }
  > = {
    general: {
      label: 'Informations générales',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
      borderClass: 'border-l-slate-400'
    },
    important: {
      label: 'Annonce importante',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-200 font-bold animate-pulse',
      borderClass: 'border-l-rose-500'
    },
    homework: {
      label: 'Devoirs et rappels',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
      borderClass: 'border-l-amber-500'
    },
    event: {
      label: 'Événements scolaires',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
      borderClass: 'border-l-purple-500'
    },
    teachers: {
      label: 'Infos professeurs',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      borderClass: 'border-l-indigo-500'
    },
    activities: {
      label: 'Activités scolaires',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      borderClass: 'border-l-emerald-500'
    },
    club: {
      label: 'Club de Lecture',
      badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-200',
      borderClass: 'border-l-cyan-500'
    },
    course: {
      label: 'Cours & Leçons',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-200',
      borderClass: 'border-l-blue-500'
    }
  };

  // Convertisseur simple markdown pour gras, italique et listes
  const renderFormattedContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed break-words">
        {lines.map((line, idx) => {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-slate-800">
                {line.substring(2)}
              </li>
            );
          }
          return (
            <p key={idx} className="min-h-[1em]">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* En-tête officiel de l'espace Communication */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Espace Communication & Annonces
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-200">
              Réseau scolaire officiel
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Partage multimédia, informations de classe, devoirs, événements et vie scolaire de Laval Academy.
          </p>
        </div>

        {canPost && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une publication</span>
          </button>
        )}
      </div>

      {/* Barre de Recherche et Filtres par Catégorie */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une annonce par titre, contenu ou auteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtres par Catégorie */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-medium">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes ({announcements.length})
            </button>
            {(Object.keys(categoryConfig) as AnnouncementCategory[]).map(catKey => {
              const count = announcements.filter(a => a.category === catKey).length;
              if (count === 0 && selectedCategory !== catKey) return null;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors border ${
                    selectedCategory === catKey
                      ? 'bg-cyan-600 text-white font-bold border-cyan-600'
                      : `${categoryConfig[catKey].badgeClass} hover:opacity-90`
                  }`}
                >
                  {categoryConfig[catKey].label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fil des publications */}
      <div className="space-y-6">
        {sortedAnnouncements.length === 0 ? (
          <div className="py-16 px-6 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-cyan-600 mb-3 shadow-inner">
              <Megaphone className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Aucune annonce trouvée
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              {searchQuery || selectedCategory !== 'all'
                ? "Aucune publication ne correspond à vos critères de recherche ou de filtre."
                : "Aucune annonce n'a encore été publiée. Les enseignants et l'administration peuvent publier des messages ici."}
            </p>
          </div>
        ) : (
          sortedAnnouncements.map((ann) => {
            const hasLiked = (ann.likes || []).includes(currentUser?.email || currentUser?.uid || '');
            const likesCount = (ann.likes || []).length;
            const commentsCount = (ann.comments || []).length;
            const readRecords = ann.readBy || [];
            const hasRead = readRecords.some(r => r.userEmail?.toLowerCase() === currentUser?.email?.toLowerCase());
            const readersCount = readRecords.length;

            const isAuthor =
              currentUser?.email?.toLowerCase() === ann.authorEmail?.toLowerCase() ||
              (ann.authorId && (ann.authorId === currentUser?.studentId || ann.authorId === currentUser?.uid));
            const canManage = isAdmin || isAuthor;

            const isCommentsOpen = !!openComments[ann.id];
            const currentCommentInput = commentInputs[ann.id] || '';

            const catConf = categoryConfig[ann.category] || categoryConfig.general;

            return (
              <article
                key={ann.id}
                className={`bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200 ${
                  ann.isImportant ? 'border-rose-300 ring-1 ring-rose-200/80' : ''
                } ${ann.isPinned ? 'border-amber-300/80 ring-1 ring-amber-200/60' : ''}`}
              >
                {/* Bandeau Épinglé / Important */}
                {(ann.isPinned || ann.isImportant) && (
                  <div
                    className={`px-5 py-1.5 text-[11px] font-bold flex items-center gap-2 ${
                      ann.isImportant
                        ? 'bg-rose-50 text-rose-800 border-b border-rose-100'
                        : 'bg-amber-50 text-amber-800 border-b border-amber-100'
                    }`}
                  >
                    {ann.isPinned && (
                      <span className="flex items-center gap-1">
                        <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> Annonce épinglée
                      </span>
                    )}
                    {ann.isImportant && (
                      <span className="flex items-center gap-1 font-extrabold text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Annonce importante
                      </span>
                    )}
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-4">
                  {/* En-tête de la publication : Auteur, Rôle, Date, Catégorie, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {ann.authorRole === 'admin' ? (
                          <ShieldCheck className="w-5 h-5" />
                        ) : ann.authorRole === 'teacher' ? (
                          <GraduationCap className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            {ann.authorName}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {ann.authorRole === 'admin'
                              ? 'Admin'
                              : ann.authorRole === 'teacher'
                              ? 'Professeur'
                              : ann.authorRole === 'club_manager'
                              ? 'Club'
                              : 'Membre'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catConf.badgeClass}`}>
                            {catConf.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(ann.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {ann.audience && ann.audience !== 'all' && (
                            <span className="text-slate-500 font-sans">
                              • Destinataires : {ann.audience === 'all_students' ? 'Élèves' : ann.audience === 'all_teachers' ? 'Professeurs' : 'Classe 2APIC-1'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions de gestion pour l'auteur ou l'admin */}
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => togglePinAnnouncement(ann.id)}
                          className={`p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition-colors ${
                            ann.isPinned ? 'text-amber-500' : ''
                          }`}
                          title={ann.isPinned ? 'Désépingler l\'annonce' : 'Épingler en haut'}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ann)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-slate-100 transition-colors"
                          title="Modifier la publication"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                          title="Supprimer la publication"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Titre et contenu textuel formaté */}
                  <div className="space-y-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      {ann.title}
                    </h2>
                    {renderFormattedContent(ann.content)}
                  </div>

                  {/* Images multimédia intégrées avec prévisualisation & défilement */}
                  {ann.images && ann.images.length > 0 && (
                    <div className="pt-2">
                      <div
                        className={`grid gap-2.5 rounded-2xl overflow-hidden ${
                          ann.images.length === 1
                            ? 'grid-cols-1'
                            : ann.images.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-2 sm:grid-cols-3'
                        }`}
                      >
                        {ann.images.map((imgUrl, i) => (
                          <div
                            key={i}
                            onClick={() => setActiveLightboxImage(imgUrl)}
                            className="group relative cursor-pointer overflow-hidden rounded-xl bg-slate-100 border border-slate-200 aspect-video sm:aspect-4/3 flex items-center justify-center"
                          >
                            <img
                              src={imgUrl}
                              alt={`Illustration ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="w-5 h-5 drop-shadow-md" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vidéos intégrées */}
                  {ann.videos && ann.videos.length > 0 && (
                    <div className="space-y-3 pt-2">
                      {ann.videos.map((vid) => (
                        <div key={vid.id} className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                          {vid.type === 'upload' ? (
                            <video
                              controls
                              preload="none"
                              className="w-full max-h-[420px] mx-auto bg-black"
                              src={vid.url}
                            >
                              Votre navigateur ne prend pas en charge la lecture de cette vidéo.
                            </video>
                          ) : (
                            <div className="p-4 flex items-center justify-between text-white bg-slate-900">
                              <div className="flex items-center gap-3">
                                <VideoIcon className="w-5 h-5 text-cyan-400" />
                                <div>
                                  <div className="text-xs font-bold">{vid.title || 'Vidéo externe'}</div>
                                  <div className="text-[11px] text-slate-400 truncate max-w-sm">{vid.url}</div>
                                </div>
                              </div>
                              <a
                                href={vid.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Visionner</span>
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Documents & Pièces jointes téléchargeables */}
                  {ann.attachments && ann.attachments.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Documents & Pièces jointes ({ann.attachments.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ann.attachments.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.url}
                            download={doc.name}
                            target="_blank"
                            rel="noreferrer"
                            className="p-3 rounded-2xl bg-slate-50 hover:bg-cyan-50/60 border border-slate-200 hover:border-cyan-200 transition-colors flex items-center justify-between gap-3 text-slate-800"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-cyan-700 shrink-0 font-bold text-[11px]">
                                {doc.name.split('.').pop()?.toUpperCase() || 'DOC'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-slate-900">{doc.name}</div>
                                <div className="text-[10px] text-slate-400">{formatFileSize(doc.size)}</div>
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-cyan-600 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Liens externes */}
                  {ann.externalLinks && ann.externalLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {ann.externalLinks.map((lk, idx) => (
                        <a
                          key={idx}
                          href={lk.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{lk.title}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Barre d'interaction : J'aime, Commentaires, Lecteurs, Marquer comme lu */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Bouton J'aime */}
                      <button
                        onClick={() => toggleLikeAnnouncement(ann.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          hasLiked
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                        <span>{likesCount > 0 ? `${likesCount} J'aime` : "J'aime"}</span>
                      </button>

                      {/* Bouton Commentaires */}
                      <button
                        onClick={() => setOpenComments(prev => ({ ...prev, [ann.id]: !prev[ann.id] }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isCommentsOpen
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{commentsCount > 0 ? `${commentsCount} commentaire(s)` : 'Commenter'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Vues et Lecteurs */}
                      <button
                        onClick={() => setActiveReadersModal(ann)}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                        title="Voir qui a lu cette annonce"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>{readersCount} lu{readersCount > 1 ? 's' : ''}</span>
                      </button>

                      {/* Option « Marquer comme lu » pour le lecteur */}
                      {!hasRead ? (
                        <button
                          onClick={() => markAnnouncementAsRead(ann.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center gap-1 border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marquer comme lu</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lu</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section des commentaires dépliable */}
                  {isCommentsOpen && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/60 p-4 rounded-2xl animate-in fade-in duration-150">
                      <div className="space-y-2">
                        {(!ann.comments || ann.comments.length === 0) ? (
                          <p className="text-xs text-slate-400 italic">
                            Aucun commentaire pour le moment. Soyez le premier à réagir !
                          </p>
                        ) : (
                          ann.comments.map((cmt) => {
                            const canDeleteComment =
                              isAdmin ||
                              isAuthor ||
                              (currentUser?.email?.toLowerCase() === cmt.authorEmail?.toLowerCase());

                            return (
                              <div
                                key={cmt.id}
                                className="bg-white p-3 rounded-xl border border-slate-200 flex items-start justify-between gap-2"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">{cmt.authorName}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(cmt.createdAt).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 mt-1">{cmt.content}</p>
                                </div>
                                {canDeleteComment && (
                                  <button
                                    onClick={() => deleteAnnouncementComment(ann.id, cmt.id)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Supprimer ce commentaire"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Formulaire d'ajout de commentaire */}
                      <form onSubmit={(e) => handleCommentSubmit(ann.id, e)} className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Écrire un commentaire courtois..."
                          value={currentCommentInput}
                          onChange={(e) =>
                            setCommentInputs(prev => ({ ...prev, [ann.id]: e.target.value }))
                          }
                          className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                          type="submit"
                          disabled={!currentCommentInput.trim()}
                          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Publier
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* --- MODALE DE CRÉATION / ÉDITION D'ANNONCE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* En-tête */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingAnnouncement ? "Modifier la publication" : "Nouvelle publication d'annonce"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Laval Academy • Réseau de communication officiel
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps du formulaire */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Titre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre de l'annonce *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex : Réunion d'information pour la sortie scolaire..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                />
              </div>

              {/* Catégorie et Destinataires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="general">Informations générales</option>
                    <option value="important">Annonce importante</option>
                    <option value="homework">Devoirs et rappels</option>
                    <option value="event">Événements scolaires</option>
                    <option value="teachers">Informations des professeurs</option>
                    <option value="activities">Activités scolaires</option>
                    <option value="club">Club de lecture</option>
                    <option value="course">Leçons & cours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destinataires visés *
                  </label>
                  <select
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value as AudienceTarget)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">Toute la classe (Élèves & Professeurs)</option>
                    <option value="all_students">Tous les élèves uniquement</option>
                    <option value="all_teachers">Tous les professeurs & administration</option>
                    <option value="class_2apic_1">Classe 2APIC-1</option>
                  </select>
                </div>
              </div>

              {/* Contenu avec barre d'outils de formatage */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Contenu descriptif *
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => insertFormatting('bold')}
                      className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-bold transition-colors"
                      title="Texte en gras"
                    >
                      <Bold className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('italic')}
                      className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white text-xs transition-colors"
                      title="Texte en italique"
                    >
                      <Italic className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('list')}
                      className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white text-xs transition-colors"
                      title="Liste à puces"
                    >
                      <List className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <textarea
                  required
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Rédigez votre annonce ici... (prise en charge du gras, de l'italique et des listes)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed font-sans"
                />
              </div>

              {/* Boutons d'ajout de médias */}
              <div className="space-y-3 pt-1">
                <div className="text-xs font-bold text-slate-700">Médias & Pièces jointes</div>
                <div className="flex flex-wrap gap-2">
                  {/* Ajouter Images */}
                  <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Ajouter photo(s)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Ajouter Vidéo upload */}
                  <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                    <VideoIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Fichier vidéo</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Vidéo Externe */}
                  <button
                    type="button"
                    onClick={() => setShowVideoInput(!showVideoInput)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <VideoIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Lien vidéo externe</span>
                  </button>

                  {/* Ajouter Document */}
                  <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Joindre PDF / Doc</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                      multiple
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Ajouter Lien */}
                  <button
                    type="button"
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ajouter un lien</span>
                  </button>
                </div>

                {/* Saisie Vidéo externe */}
                {showVideoInput && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-700">Ajouter un lien vidéo (YouTube, Vimeo, etc.)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Titre de la vidéo"
                        value={newVideoTitle}
                        onChange={(e) => setNewVideoTitle(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200"
                      />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowVideoInput(false)}
                        className="px-2.5 py-1 text-xs text-slate-500"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleAddExternalVideo}
                        className="px-3 py-1 rounded-xl bg-cyan-600 text-white text-xs font-bold"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                )}

                {/* Saisie Lien externe */}
                {showLinkInput && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-700">Ajouter un lien web</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Titre du lien (ex: Page Wikipédia)"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200"
                      />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowLinkInput(false)}
                        className="px-2.5 py-1 text-xs text-slate-500"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleAddExternalLink}
                        className="px-3 py-1 rounded-xl bg-cyan-600 text-white text-xs font-bold"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                )}

                {/* Prévisualisation des images avec option de suppression */}
                {formImages.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600">
                      Images sélectionnées ({formImages.length}) :
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {formImages.map((img, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                          <img src={img} alt="Aperçu" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                            title="Supprimer cette image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prévisualisation des vidéos */}
                {formVideos.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Vidéos :</span>
                    {formVideos.map((v, i) => (
                      <div key={v.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <span className="truncate max-w-sm">{v.title}</span>
                        <button
                          type="button"
                          onClick={() => setFormVideos(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Prévisualisation des documents */}
                {formAttachments.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Documents joints :</span>
                    {formAttachments.map((doc, i) => (
                      <div key={doc.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <span className="truncate max-w-sm font-semibold">{doc.name} ({formatFileSize(doc.size)})</span>
                        <button
                          type="button"
                          onClick={() => setFormAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options de visibilité : Épinglée & Importante */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                  />
                  <span>Épingler en haut du fil</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-rose-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsImportant}
                    onChange={(e) => setFormIsImportant(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>Marquer comme annonce importante</span>
                </label>
              </div>

              {/* Boutons d'action */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-900/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUploading
                    ? 'Téléversement en cours...'
                    : editingAnnouncement
                    ? 'Mettre à jour l\'annonce'
                    : 'Diffuser la publication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VISIONNEUSE LIGHTBOX IMAGE PLEIN ÉCRAN --- */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            title="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeLightboxImage}
            alt="Agrandissement"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* --- MODALE DES LECTEURS --- */}
      {activeReadersModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveReadersModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lectures confirmées</h3>
                <p className="text-[11px] text-slate-500">
                  {activeReadersModal.readBy?.length || 0} personne(s) ont lu cette annonce
                </p>
              </div>
              <button
                onClick={() => setActiveReadersModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {(!activeReadersModal.readBy || activeReadersModal.readBy.length === 0) ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Aucun lecteur n'a encore validé la lecture de cette publication.
                </p>
              ) : (
                activeReadersModal.readBy.map((r, i) => (
                  <div key={i} className="p-2 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{r.userName || r.userEmail}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(r.readAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveReadersModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
