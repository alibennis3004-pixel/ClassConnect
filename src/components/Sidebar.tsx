import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Library,
  ArrowLeftRight,
  BarChart3,
  Megaphone,
  Settings,
  GraduationCap
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'students'
  | 'lessons'
  | 'library'
  | 'loans'
  | 'statistics'
  | 'announcements'
  | 'student_portal'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage, onCloseMobile }) => {
  const { currentUser } = useAuth();
  const { schoolName } = useData();

  if (!currentUser) return null;

  const role = currentUser.role;
  const isAdminOrTeacher = role === 'admin' || role === 'teacher';
  const isClubOrStaff = isAdminOrTeacher || role === 'club_manager';

  const navItems: { id: PageId; label: string; icon: React.ReactNode; allowed: boolean; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <LayoutDashboard className="w-5 h-5" />,
      allowed: true
    },
    {
      id: 'student_portal',
      label: 'Mon Espace Personnel',
      icon: <GraduationCap className="w-5 h-5 text-emerald-400" />,
      allowed: true,
      badge: role === 'student' ? 'Élève' : undefined
    },
    {
      id: 'students',
      label: 'Gestion des comptes',
      icon: <Users className="w-5 h-5" />,
      allowed: isAdminOrTeacher,
      badge: role === 'admin' ? 'Admin' : 'Professeur'
    },
    {
      id: 'lessons',
      label: 'Leçons et cours',
      icon: <BookOpen className="w-5 h-5" />,
      allowed: true
    },
    {
      id: 'library',
      label: 'Bibliothèque & Club',
      icon: <Library className="w-5 h-5" />,
      allowed: true
    },
    {
      id: 'loans',
      label: 'Emprunts et Retours',
      icon: <ArrowLeftRight className="w-5 h-5" />,
      allowed: isClubOrStaff,
      badge: role === 'club_manager' ? 'Club' : undefined
    },
    {
      id: 'announcements',
      label: 'Espace Communication',
      icon: <Megaphone className="w-5 h-5 text-cyan-400" />,
      allowed: true
    },
    {
      id: 'statistics',
      label: 'Statistiques & Bilan',
      icon: <BarChart3 className="w-5 h-5 text-indigo-400" />,
      allowed: true
    },
    {
      id: 'settings',
      label: 'Paramètres & Configuration',
      icon: <Settings className="w-5 h-5" />,
      allowed: isAdminOrTeacher,
      badge: role === 'admin' ? 'Admin' : 'Professeur'
    }
  ];

  const handleSelect = (page: PageId) => {
    onSelectPage(page);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* En-tête établissement */}
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <div className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider">Établissement</div>
          <div className="font-bold text-white mt-0.5 text-sm">{schoolName || 'Laval Academy'}</div>
          <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/60 text-[11px] font-bold">
            Classe : 2APIC-1
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Année 2026 - 2027</div>
        </div>

        {/* Liens de navigation */}
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Principal
          </div>

          {navItems
            .filter((item) => item.allowed)
            .map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-sky-700 text-white shadow-md shadow-cyan-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Slogan officiel en pied de menu */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <p className="text-[11px] text-cyan-300/80 font-medium italic text-center leading-relaxed">
          « Connecter la classe,<br />faciliter la réussite. »
        </p>
      </div>
    </aside>
  );
};
