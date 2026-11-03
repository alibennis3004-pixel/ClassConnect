import React, { useState } from 'react';
import { useAuth, ADMIN_ALI_EMAIL, TEACHER_SARA_EMAIL, CLUB_AWAB_EMAIL } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  ShieldCheck,
  Database,
  BookOpen,
  HelpCircle,
  FileCode,
  Lock,
  School,
  Save,
  CheckCircle2,
  Users
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { schoolName, updateSchoolName, students, promoteToRole, isUsingFirestore } = useData();

  const [inputSchoolName, setInputSchoolName] = useState(schoolName || 'Laval Academy');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [clubManagerId, setClubManagerId] = useState(() => {
    const current = students.find(s => s.role === 'club_manager');
    return current ? current.id : 'club_manager_awab';
  });

  const [showRulesModal, setShowRulesModal] = useState(false);

  const handleSaveSchoolName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSchoolName.trim()) return;
    await updateSchoolName(inputSchoolName.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleUpdateClubManager = async (newId: string) => {
    setClubManagerId(newId);
    const current = students.find(s => s.role === 'club_manager');
    if (current && current.id !== newId) {
      await promoteToRole(current.id, 'student');
    }
    if (newId) {
      await promoteToRole(newId, 'club_manager');
      alert('Le rôle de Responsable du club de lecture a été mis à jour avec succès.');
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Paramètres & Configuration
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
              {currentUser?.role === 'admin' ? 'Espace Admin • Ali Bennis' : 'Espace Professeur • Madame Sara'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestion de l'établissement, attribution des rôles officiels et configuration de la plateforme ClassConnect.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne 1 : Configuration de l'établissement & Rôles clés */}
        <div className="space-y-6">
          {/* Modification du nom de l'école (Laval Academy) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <School className="w-4 h-4 text-cyan-600" />
              <span>Identité de l'établissement officiel</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Le nom officiel de l'établissement est affiché sur toutes les pages de l'application, les tableaux de bord et les espaces élèves.
            </p>

            <form onSubmit={handleSaveSchoolName} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom officiel de l'établissement :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={inputSchoolName}
                    onChange={(e) => setInputSchoolName(e.target.value)}
                    placeholder="Laval Academy"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Le nom de l'établissement a été mis à jour avec succès.</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 font-medium">Classe rattachée :</span>
                <span className="font-extrabold text-cyan-900 bg-cyan-50 px-3 py-1 rounded-xl border border-cyan-200 inline-flex items-center gap-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Classe 2APIC-1 (2ème Année Parcours International Collégial - Classe 1)
                </span>
              </div>
            </form>
          </div>

          {/* Profils officiels configurés */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Rôles officiels et encadrement</span>
            </h3>

            <div className="space-y-3 text-xs">
              {/* 1. Admin : Ali Bennis */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-indigo-950 text-sm">Ali Bennis</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white">
                      Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Établissement : <strong>{schoolName || 'Laval Academy'}</strong> • Contrôle total & statut d'administrateur principal protégé.
                  </p>
                  <span className="font-mono text-[10px] text-indigo-800 mt-1 block">
                    {ADMIN_ALI_EMAIL}
                  </span>
                </div>
              </div>

              {/* 2. Professeur : Madame Sara */}
              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-purple-950 text-sm">Madame Sara</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                      Professeur
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Établissement : <strong>{schoolName || 'Laval Academy'}</strong> • Droits étendus d'enseignement, leçons, annonces et gestion autorisée.
                  </p>
                  <span className="font-mono text-[10px] text-purple-800 mt-1 block">
                    {TEACHER_SARA_EMAIL}
                  </span>
                </div>
              </div>

              {/* 3. Responsable du club : Awab */}
              <div className="p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-cyan-950 text-sm">Awab</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-600 text-white">
                      Responsable du club de lecture
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Établissement : <strong>{schoolName || 'Laval Academy'}</strong> • Gestion autorisée de la bibliothèque, des emprunts et des retours.
                  </p>
                  <span className="font-mono text-[10px] text-cyan-800 mt-1 block">
                    {CLUB_AWAB_EMAIL}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Désignation du Responsable du Club de Lecture */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-600" />
              <span>Désignation du Responsable du club de lecture</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Le responsable désigné (actuellement <strong>Awab</strong>) gère les emprunts, les retours et les livres du club sans avoir accès à l'administration générale ni aux modifications de cours.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Titulaire actuel du rôle :
              </label>
              <select
                value={clubManagerId}
                onChange={(e) => handleUpdateClubManager(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
              >
                {students.filter(s => s.role !== 'admin').map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName} ({st.role === 'club_manager' ? 'Responsable en titre' : st.role === 'teacher' ? 'Professeur' : 'Élève'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Colonne 2 : Base de données, Sécurité & Cloud */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600" />
                <span>Base de Données Firestore</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isUsingFirestore
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {isUsingFirestore ? 'Connecté en direct' : 'Mode Local'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ClassConnect intègre Firebase et Firestore pour la persistance temps réel et la protection stricte des données côté serveur :
            </p>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Ali Bennis :</strong> Admin principal au contrôle total, protégé de toute révocation.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Madame Sara :</strong> Droits étendus de gestion et de publication de cours.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Awab :</strong> Opérations strictement réservées au club de lecture.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Élèves :</strong> Consultation des cours, téléchargements des devoirs et suivi des prêts personnels.
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowRulesModal(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>Consulter les règles de sécurité Firestore (firestore.rules)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL RÈGLES FIRESTORE */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Règles de sécurité Firestore (firestore.rules)
                </h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 text-cyan-300 font-mono text-[11px] overflow-auto flex-1 leading-relaxed mt-3">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Établissement officiel : Laval Academy
    // Rôles officiels : admin (Ali Bennis), teacher (Madame Sara), club_manager (Awab), student (Élèves)
  }
}`}
            </pre>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
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
