import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import {
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Library,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Lock,
  Mail,
  User,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  School,
  ArrowRight
} from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot_password';

export const Login: React.FC = () => {
  const { loginWithIdentifier, loginWithEmail, registerWithEmail, resetPassword, isLoading } = useAuth();

  const [view, setView] = useState<AuthView>('login');

  // Formulaire de connexion sécurisé par identifiant personnel ou email
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Formulaire d'inscription autonome pour les élèves
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Formulaire mot de passe oublié
  const [resetInput, setResetInput] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Feedback utilisateur
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Gestion de la connexion avec gestion d'erreurs stricte et explicite
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanInput = loginIdentifier.trim();
    if (!cleanInput || !loginPassword) {
      setErrorMsg('Accès refusé : identifiant ou mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.');
      return;
    }

    try {
      await (loginWithIdentifier || loginWithEmail)(cleanInput, loginPassword);
      setErrorMsg(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('compte-suspendu') || msg.includes('suspended') || msg.includes('banned')) {
        setErrorMsg("Accès refusé : votre compte a été suspendu par l'administration.");
      } else if (msg.includes('network') || msg.includes('unavailable') || msg.includes('server')) {
        setErrorMsg("Problème de connexion au serveur. Veuillez vérifier votre connexion et réessayer.");
      } else {
        // Message d'erreur obligatoire demandé :
        setErrorMsg('Accès refusé : identifiant ou mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.');
      }
    }
  };

  // Gestion de l'inscription autonome des élèves
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regFirstName.trim() || !regLastName.trim()) {
      setErrorMsg('Veuillez renseigner votre nom et votre prénom.');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Veuillez renseigner une adresse e-mail valide.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères pour des raisons de sécurité.');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('Les mots de passe saisis ne correspondent pas.');
      return;
    }

    try {
      await registerWithEmail(regEmail, regPassword, regFirstName, regLastName);
      // L'élève accède directement à son espace personnel après inscription
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('email-already-in-use')) {
        setErrorMsg('Cette adresse e-mail est déjà inscrite. Connectez-vous ou demandez un nouveau mot de passe.');
      } else {
        setErrorMsg('Une erreur est survenue lors de l\'inscription. Veuillez réessayer.');
      }
    }
  };

  // Gestion de la réinitialisation de mot de passe
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSuccessMsg(null);

    const clean = resetInput.trim();
    if (!clean) {
      setErrorMsg('Veuillez renseigner votre identifiant ou votre adresse e-mail.');
      return;
    }

    try {
      await resetPassword(clean);
      setResetSuccessMsg(`Si votre compte existe, un lien de réinitialisation sécurisé a été transmis pour « ${clean} ».`);
    } catch {
      setErrorMsg('Impossible d\'envoyer le lien de réinitialisation. Vérifiez que l\'identifiant ou l\'adresse est correct.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* Barre supérieure avec identification Laval Academy */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex items-center justify-between">
        <Logo size="lg" variant="light" showSlogan={false} />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 shadow-xs">
            <School className="w-3.5 h-3.5" /> LAVAL ACADEMY
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-cyan-300 border border-slate-700 font-mono">
            Classe : 2APIC-1
          </span>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col lg:flex-row items-center gap-12 my-auto">
        {/* Colonne gauche : Présentation & Rôles de Laval Academy */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Laval Academy • Classe 2APIC-1
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Connecter la classe, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
              faciliter la réussite.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Bienvenue sur la plateforme numérique de <strong>Laval Academy</strong>. Espace complet de gestion de cours avec pièces jointes et bibliothèque du club de lecture.
          </p>

          {/* Trois cartes descriptives professionnelles (sans aucun nom personnel, adresse e-mail ou compte utilisateur) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Carte 1 — Espace Administration */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left hover:border-slate-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-white">Espace Administration</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Un espace centralisé pour gérer Laval Academy, organiser les utilisateurs, administrer les paramètres de la plateforme et superviser l'ensemble des activités de ClassConnect.
                </p>
              </div>
            </div>

            {/* Carte 2 — Espace Professeur */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left hover:border-slate-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-3">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-white">Espace Professeur</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Un espace dédié aux enseignants pour publier les cours et les leçons, partager des documents pédagogiques, communiquer les informations importantes et organiser les activités de la classe.
                </p>
              </div>
            </div>

            {/* Carte 3 — Club de Lecture */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left hover:border-slate-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-3">
                  <Library className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-white">Club de Lecture</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Un espace consacré à la bibliothèque de Laval Academy pour découvrir les livres disponibles, organiser les emprunts, suivre les retours et participer aux activités du club de lecture.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : Formulaire d'authentification */}
        <div className="w-full max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl shadow-cyan-950/40 relative">
            {/* Messages d'erreur ou de succès pour les autres vues (inscription / réinitialisation) */}
            {view !== 'login' && errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-700/60 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* VUE 1 : SE CONNECTER */}
            {view === 'login' && (
              <div className="space-y-5">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Se connecter
                  </h2>
                  <p className="text-xs text-slate-400">
                    Accédez à votre espace <strong>Laval Academy</strong>
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Identifiant
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => {
                          setLoginIdentifier(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Entrez votre identifiant"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        Mot de passe
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setView('forgot_password');
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-700 hover:from-cyan-500 hover:to-sky-600 active:scale-[0.99] text-white font-black text-xs shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                  </button>

                  {/* Message d'erreur visible en rouge directement sous le bouton « Se connecter » */}
                  {errorMsg && (
                    <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-600 text-rose-200 text-xs font-semibold flex items-start gap-2.5 shadow-lg shadow-rose-950/40">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{errorMsg}</span>
                    </div>
                  )}
                </form>

                <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
                  <span>Vous êtes élève à Laval Academy ? </span>
                  <button
                    onClick={() => {
                      setErrorMsg(null);
                      setView('register');
                    }}
                    className="text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Créer un compte élève
                  </button>
                </div>
              </div>
            )}

            {/* VUE 2 : CRÉER UN COMPTE ÉLÈVE */}
            {view === 'register' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Inscription Élève
                  </h2>
                  <p className="text-xs text-slate-400">
                    Créez votre compte pour accéder directement aux cours de Laval Academy
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        required
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="Ex: Youssef"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nom *
                      </label>
                      <input
                        type="text"
                        required
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="Ex: El Amrani"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Adresse e-mail *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="eleve@lavalacademy.ma"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mot de passe (6 caractères min.) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirmer le mot de passe *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-[11px] text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Votre compte élève sera activé dès votre inscription pour accéder directement à vos cours et aux leçons.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-900/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? 'Création en cours...' : 'Créer mon compte élève'}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800 text-center text-xs text-slate-400">
                  <span>Vous avez déjà un compte ? </span>
                  <button
                    onClick={() => {
                      setErrorMsg(null);
                      setView('login');
                    }}
                    className="text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Se connecter
                  </button>
                </div>
              </div>
            )}

            {/* VUE 3 : MOT DE PASSE OUBLIÉ */}
            {view === 'forgot_password' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Mot de passe oublié ?
                  </h2>
                  <p className="text-xs text-slate-400">
                    Saisissez votre e-mail pour réinitialiser vos identifiants
                  </p>
                </div>

                {resetSuccessMsg ? (
                  <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-xs text-emerald-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>{resetSuccessMsg}</div>
                    </div>
                    <button
                      onClick={() => {
                        setResetSuccessMsg(null);
                        setView('login');
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                    >
                      Retour à la page de connexion
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Votre identifiant ou adresse e-mail
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={resetInput}
                          onChange={(e) => setResetInput(e.target.value)}
                          placeholder="Ex: sarah.mousamih ou eleve@lavalacademy.ma"
                          className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? 'Envoi...' : 'Réinitialiser mon mot de passe'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setView('login');
                      }}
                      className="w-full py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Retour à la connexion</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <div>
          ClassConnect © 2026-2027 • <strong>LAVAL ACADEMY</strong> • Direction : Ali Bennis
        </div>
        <div className="font-semibold text-cyan-300">
          « Connecter la classe, faciliter la réussite. »
        </div>
      </footer>
    </div>
  );
};
