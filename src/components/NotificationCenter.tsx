import React from 'react';
import { useData } from '../context/DataContext';
import { AppNotification, NotificationType } from '../types';
import { PageId } from './Sidebar';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  BookOpen,
  FileText,
  MessageSquare,
  MessageCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
  ExternalLink,
  Megaphone
} from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: PageId) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
  } = useData();

  if (!isOpen) return null;

  const formatNotificationTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_lesson':
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case 'new_resource':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'teacher_reply':
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'discussion_reply':
      case 'announcement_reply':
        return <MessageCircle className="w-4 h-4 text-sky-400" />;
      case 'new_announcement':
        return <Megaphone className="w-4 h-4 text-amber-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'account_approved':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'account_rejected':
        return <UserX className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getNotificationBadgeClass = (type: NotificationType) => {
    switch (type) {
      case 'new_lesson':
        return 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300';
      case 'new_resource':
        return 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300';
      case 'teacher_reply':
        return 'bg-purple-950/60 border-purple-800/60 text-purple-300';
      case 'discussion_reply':
      case 'announcement_reply':
        return 'bg-sky-950/60 border-sky-800/60 text-sky-300';
      case 'new_announcement':
        return 'bg-amber-950/60 border-amber-800/60 text-amber-300';
      case 'warning':
        return 'bg-amber-950/60 border-amber-800/60 text-amber-300';
      case 'account_approved':
        return 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300';
      case 'account_rejected':
        return 'bg-rose-950/60 border-rose-800/60 text-rose-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  const handleClickItem = (notification: AppNotification) => {
    if (!notification.isRead) {
      markNotificationRead(notification.id);
    }
    if (notification.linkPage && onNavigate) {
      onNavigate(notification.linkPage as PageId);
      onClose();
    }
  };

  return (
    <>
      {/* Arrière-plan pour fermer au clic */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Conteneur du Centre de notifications */}
      <div className="fixed top-16 right-2 sm:right-6 lg:right-12 z-50 w-[96vw] max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* En-tête */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Notifications</h3>
                {unreadNotificationsCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500 text-slate-950">
                    {unreadNotificationsCount} non lue{unreadNotificationsCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Laval Academy • ClassConnect</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadNotificationsCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="p-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px] font-medium">Tout lire</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Liste des notifications */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
          {notifications.length === 0 ? (
            <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                <CheckCheck className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                Vous êtes à jour !
              </h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Aucune nouvelle notification pour le moment.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleClickItem(item)}
                className={`group relative p-3.5 transition-all cursor-pointer rounded-xl mx-1 my-0.5 flex items-start gap-3 ${
                  item.isRead
                    ? 'hover:bg-slate-800/40 text-slate-400'
                    : 'bg-cyan-950/20 hover:bg-cyan-950/30 text-slate-200 border-l-2 border-cyan-400'
                }`}
              >
                {/* Icône de type */}
                <div
                  className={`mt-0.5 w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${getNotificationBadgeClass(
                    item.type
                  )}`}
                >
                  {getNotificationIcon(item.type)}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`text-xs font-semibold truncate ${
                        item.isRead ? 'text-slate-300' : 'text-white'
                      }`}
                    >
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                    )}
                  </div>

                  <p
                    className={`text-xs leading-snug line-clamp-2 ${
                      item.isRead ? 'text-slate-400' : 'text-slate-200 font-medium'
                    }`}
                  >
                    {item.message}
                  </p>

                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatNotificationTime(item.createdAt)}
                    </span>
                    {item.linkPage && (
                      <span className="flex items-center gap-1 text-cyan-400/80 font-medium group-hover:text-cyan-300">
                        <ExternalLink className="w-2.5 h-2.5" />
                        Accéder
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions individuelles (marquer comme lu / supprimer) */}
                <div
                  className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!item.isRead && (
                    <button
                      onClick={() => markNotificationRead(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                      title="Marquer comme lu"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(item.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                    title="Supprimer cette notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pied de page */}
        {notifications.length > 0 && (
          <div className="p-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {notifications.length} notification{notifications.length > 1 ? 's' : ''} au total
            </span>
            {unreadNotificationsCount === 0 ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Toutes lues
              </span>
            ) : (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};
