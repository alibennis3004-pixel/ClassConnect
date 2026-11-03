import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Logo } from './Logo';
import { NotificationCenter } from './NotificationCenter';
import { PageId } from './Sidebar';
import { LogOut, User, Bell, BookOpen, ShieldCheck, Menu, X } from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onNavigate?: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen,
  onNavigate
}) => {
  const { currentUser, logout } = useAuth();
  const { unreadNotificationsCount } = useData();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  if (!currentUser) return null;

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Professeur',
    club_manager: 'Responsable du club de lecture',
    student: 'Élève'
  };

  const roleBadges: Record<string, string> = {
    admin: 'bg-indigo-950 text-indigo-100 border-indigo-700/60',
    teacher: 'bg-purple-950 text-purple-100 border-purple-700/60',
    club_manager: 'bg-cyan-900 text-cyan-100 border-cyan-700/60',
    student: 'bg-emerald-950 text-emerald-100 border-emerald-700/60'
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo, Slogan et Établissement */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleMobileMenu}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 lg:hidden"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <Logo size="md" variant="light" showSlogan={true} />
              <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                Laval Academy • 2APIC-1
              </span>
            </div>
          </div>

          {/* Droite: Notifications, Classe, Rôle & Profil */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bouton de Notifications avec Badge */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                className={`relative p-2 rounded-xl transition-all duration-150 flex items-center justify-center ${
                  isNotificationCenterOpen
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
                title="Centre de notifications"
                aria-label="Centre de notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold shadow-md shadow-cyan-500/30 animate-pulse">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            </div>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">
                {currentUser.displayName}
              </span>
              <span className="text-[11px] text-cyan-300 truncate max-w-[200px]">
                Classe : 2APIC-1
              </span>
            </div>

            {/* Badge de Rôle */}
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                roleBadges[currentUser.role] || roleBadges.student
              }`}
            >
              {currentUser.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
              {currentUser.role === 'teacher' && <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />}
              {currentUser.role === 'club_manager' && <BookOpen className="w-3.5 h-3.5 text-cyan-400" />}
              {currentUser.role === 'student' && <User className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{roleLabels[currentUser.role] || 'Élève'}</span>
            </span>

            {/* Bouton de déconnexion */}
            <button
              onClick={() => logout()}
              className="p-2 text-slate-300 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Centre de notifications */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};
