import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LessonComment, UserRole } from '../types';
import {
  MessageSquare,
  Send,
  Trash2,
  Flag,
  CornerDownRight,
  ShieldCheck,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  AlertCircle
} from 'lucide-react';

interface LessonCommentsProps {
  lessonId: string;
  lessonTitle: string;
}

export const LessonComments: React.FC<LessonCommentsProps> = ({ lessonId, lessonTitle }) => {
  const { currentUser } = useAuth();
  const { comments, addComment, deleteComment, reportComment, resolveReport, addWarning } = useData();

  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Signalement modal
  const [reportingComment, setReportingComment] = useState<LessonComment | null>(null);
  const [reportReason, setReportReason] = useState('Commentaire irrespectueux ou déplacé');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Avertissement direct depuis modération
  const [warningAuthorComment, setWarningAuthorComment] = useState<LessonComment | null>(null);
  const [directWarningMessage, setDirectWarningMessage] = useState('');
  const [isSendingWarning, setIsSendingWarning] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const isTeacherOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'teacher';

  // Commentaires liés à cette leçon
  const lessonComments = comments.filter(c => c.lessonId === lessonId);
  const parentComments = lessonComments.filter(c => !c.parentId);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      await addComment(lessonId, newCommentText.trim());
      setNewCommentText('');
      showToast('Votre commentaire a été publié.');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la publication du commentaire.');
    }
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    try {
      await addComment(lessonId, replyText.trim(), parentId);
      setReplyText('');
      setReplyingToCommentId(null);
      showToast('Votre réponse a été publiée.');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réponse.');
    }
  };

  const handleExecuteReport = async () => {
    if (!reportingComment) return;
    setIsSubmittingReport(true);
    try {
      await reportComment(reportingComment.id, reportReason);
      showToast('Le commentaire a été signalé à l\'administration pour examen.');
      setReportingComment(null);
    } catch {
      alert('Erreur lors du signalement.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleDirectWarning = async () => {
    if (!warningAuthorComment) return;
    setIsSendingWarning(true);
    try {
      await addWarning(
        warningAuthorComment.authorId,
        'Commentaires inappropriés sous les cours',
        directWarningMessage.trim() || `Suite à votre commentaire signalé sur le cours « ${lessonTitle} », vous recevez un rappel à l'ordre formel.`,
        'medium'
      );
      // Supprimer le commentaire signalé
      await deleteComment(warningAuthorComment.id);
      showToast(`Avertissement envoyé à ${warningAuthorComment.authorName} et commentaire supprimé.`);
      setWarningAuthorComment(null);
      setDirectWarningMessage('');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'envoi de l\'avertissement.');
    } finally {
      setIsSendingWarning(false);
    }
  };

  const getRoleBadge = (role: UserRole, isTeacherReply?: boolean) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
          <ShieldCheck className="w-3 h-3 text-indigo-700" /> Direction • Admin
        </span>
      );
    }
    if (role === 'teacher' || isTeacherReply) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
          <GraduationCap className="w-3 h-3 text-purple-700" /> Professeur
        </span>
      );
    }
    if (role === 'club_manager') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-200">
          Club de Lecture
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
        Élève 2APIC-1
      </span>
    );
  };

  return (
    <div className="space-y-4 pt-6 border-t border-slate-200">
      {/* Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Titre de la section */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-600" />
          <span>Commentaires et questions ({lessonComments.length})</span>
        </h3>
        <span className="text-[11px] text-slate-400">
          Espace d'échange pédagogique et de questions sur la leçon
        </span>
      </div>

      {/* Formulaire de publication d'un nouveau commentaire */}
      {currentUser && (
        <form onSubmit={handlePostComment} className="space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={`Poser une question ou écrire un commentaire sur cette leçon (en tant que ${currentUser.displayName})...`}
              className="w-full p-3 pr-24 text-xs rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed font-normal"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="absolute right-2.5 bottom-2.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publier</span>
            </button>
          </div>
        </form>
      )}

      {/* Liste des commentaires */}
      <div className="space-y-3 pt-2">
        {lessonComments.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
            Aucun commentaire sous cette leçon pour le moment. Soyez le premier à poser une question !
          </div>
        ) : (
          parentComments.map((comment) => {
            const replies = lessonComments.filter(c => c.parentId === comment.id);
            const canDelete = isTeacherOrAdmin || currentUser?.email.toLowerCase() === comment.authorEmail.toLowerCase();

            return (
              <div key={comment.id} className="space-y-2.5">
                {/* Commentaire parent */}
                <div className={`p-4 rounded-2xl border transition-colors ${
                  comment.isReported
                    ? 'bg-rose-50/70 border-rose-300'
                    : comment.isTeacherReply
                    ? 'bg-purple-50/40 border-purple-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-900">
                        {comment.authorName}
                      </span>
                      {getRoleBadge(comment.authorRole, comment.isTeacherReply)}
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Actions sur le commentaire */}
                    <div className="flex items-center gap-1">
                      {/* Bouton répondre */}
                      <button
                        onClick={() => {
                          setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id);
                          setReplyText('');
                        }}
                        className="px-2 py-1 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-slate-200/60 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Répondre à cette question"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>Répondre</span>
                      </button>

                      {/* Bouton signaler */}
                      {!comment.isReported && (
                        <button
                          onClick={() => setReportingComment(comment)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                          title="Signaler ce commentaire"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Bouton supprimer */}
                      {canDelete && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                          title="Supprimer le commentaire"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bandeau de modération si signalé */}
                  {comment.isReported && (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-100/80 border border-rose-300 text-xs text-rose-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-[11px]">
                          <strong>Commentaire signalé :</strong> {comment.reportReason} (par {comment.reportedBy})
                        </span>
                      </div>

                      {isTeacherOrAdmin && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => resolveReport(comment.id, true)}
                            className="px-2 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-[10px] font-bold hover:bg-rose-50 cursor-pointer"
                          >
                            Ignorer
                          </button>
                          <button
                            onClick={() => {
                              setWarningAuthorComment(comment);
                              setDirectWarningMessage(`Rappel à l'ordre suite à votre commentaire inapproprié sur le cours « ${lessonTitle} » : « ${comment.content} »`);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 cursor-pointer"
                          >
                            Avertir l'élève
                          </button>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-800 mt-2 leading-relaxed whitespace-pre-line font-normal">
                    {comment.content}
                  </p>
                </div>

                {/* Réponses imbriquées */}
                {replies.map((reply) => {
                  const canDeleteReply = isTeacherOrAdmin || currentUser?.email.toLowerCase() === reply.authorEmail.toLowerCase();

                  return (
                    <div
                      key={reply.id}
                      className={`ml-6 sm:ml-10 p-3.5 rounded-2xl border transition-colors ${
                        reply.isTeacherReply
                          ? 'bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-purple-200 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CornerDownRight className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-extrabold text-xs">
                            {reply.authorName}
                          </span>
                          {getRoleBadge(reply.authorRole, reply.isTeacherReply)}
                          <span className="text-[10px] text-slate-400">
                            {new Date(reply.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {canDeleteReply && (
                          <button
                            onClick={() => deleteComment(reply.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Supprimer la réponse"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs mt-1.5 leading-relaxed whitespace-pre-line font-normal">
                        {reply.content}
                      </p>
                    </div>
                  );
                })}

                {/* Champ de réponse inline si activé */}
                {replyingToCommentId === comment.id && (
                  <div className="ml-6 sm:ml-10 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Répondre à ${comment.authorName}...`}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handlePostReply(comment.id)}
                      disabled={!replyText.trim()}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      Répondre
                    </button>
                    <button
                      onClick={() => setReplyingToCommentId(null)}
                      className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL : SIGNALER UN COMMENTAIRE */}
      {reportingComment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Signaler ce commentaire
                </h3>
                <p className="text-xs text-slate-500">
                  Auteur : {reportingComment.authorName}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs italic text-slate-700 line-clamp-3">
              « {reportingComment.content} »
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Motif du signalement *
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Commentaire irrespectueux ou déplacé">Commentaire irrespectueux ou déplacé</option>
                <option value="Propos insultants ou harcèlement">Propos insultants ou harcèlement</option>
                <option value="Contenu hors-sujet ou spam">Contenu hors-sujet ou spam</option>
                <option value="Non-respect de la charte de vie de classe">Non-respect de la charte de vie de classe</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportingComment(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteReport}
                disabled={isSubmittingReport}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingReport && <Clock className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmer le signalement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : AVERTISSEMENT DIRECT DEPUIS MODÉRATION */}
      {warningAuthorComment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Envoyer un avertissement officiel
                </h3>
                <p className="text-xs text-slate-500">
                  Destinataire : {warningAuthorComment.authorName}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
              Le commentaire sera supprimé et un avertissement officiel sera consigné dans le registre de l'élève.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Message d'avertissement :
              </label>
              <textarea
                rows={3}
                value={directWarningMessage}
                onChange={(e) => setDirectWarningMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed font-normal"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWarningAuthorComment(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDirectWarning}
                disabled={isSendingWarning}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSendingWarning && <Clock className="w-3.5 h-3.5 animate-spin" />}
                <span>Avertir et supprimer le message</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
