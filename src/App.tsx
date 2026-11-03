import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { Login } from './pages/Login';
import { AccountStatusNotice } from './pages/AccountStatusNotice';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { LessonsPage } from './pages/Lessons';
import { LibraryPage } from './pages/Library';
import { LoansPage } from './pages/Loans';
import { StatisticsPage } from './pages/Statistics';
import { AnnouncementsPage } from './pages/Announcements';
import { StudentPortal } from './pages/StudentPortal';
import { SettingsPage } from './pages/Settings';

import { StudentStatus } from './types';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [studentsFilter, setStudentsFilter] = useState<'all' | StudentStatus>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedBookForLoan, setSelectedBookForLoan] = useState<string | null>(null);

  const handleNavigate = (page: PageId, filter?: 'all' | StudentStatus) => {
    if (filter) {
      setStudentsFilter(filter);
    } else if (page === 'students') {
      setStudentsFilter('all');
    }
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Chargement de ClassConnect...
        </p>
      </div>
    );
  }

  // Si aucun utilisateur n'est connecté, afficher l'écran d'accueil et de connexion
  if (!currentUser) {
    return <Login />;
  }

  // Si l'utilisateur n'est pas actif (en attente, banni, suspendu, rejeté) et n'est pas admin/professeur
  const hasStaffAccess = currentUser.role === 'admin' || currentUser.role === 'teacher';
  if (!hasStaffAccess && currentUser.status !== 'active') {
    return <AccountStatusNotice />;
  }

  // Routage des pages
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'students':
        return hasStaffAccess ? <Students initialStatusFilter={studentsFilter} /> : <StudentPortal />;
      case 'lessons':
        return <LessonsPage />;
      case 'library':
        return (
          <LibraryPage
            onStartLoan={(bookId) => {
              setSelectedBookForLoan(bookId);
              setCurrentPage('loans');
            }}
          />
        );
      case 'loans':
        return (
          <LoansPage
            initialBookId={selectedBookForLoan}
            onClearInitialBookId={() => setSelectedBookForLoan(null)}
          />
        );
      case 'statistics':
        return <StatisticsPage />;
      case 'announcements':
        return <AnnouncementsPage />;
      case 'student_portal':
        return <StudentPortal />;
      case 'settings':
        return hasStaffAccess ? <SettingsPage /> : <StudentPortal />;
      default:
        return <Dashboard onNavigate={(page) => setCurrentPage(page)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Barre de navigation supérieure */}
      <Navbar
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        onNavigate={handleNavigate}
      />

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Barre latérale bureau */}
        <div className="hidden lg:block">
          <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />
        </div>

        {/* Tiroir mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed top-16 left-0 bottom-0 w-64 bg-slate-900 z-50">
              <Sidebar
                currentPage={currentPage}
                onSelectPage={setCurrentPage}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Espace de travail principal */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
