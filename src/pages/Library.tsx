import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Book } from '../types';
import { exportBooksToExcel } from '../utils/excel';
import {
  Library as LibraryIcon,
  Search,
  Plus,
  BookOpen,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  X,
  BookmarkPlus
} from 'lucide-react';

interface LibraryProps {
  onStartLoan?: (bookId: string) => void;
}

export const LibraryPage: React.FC<LibraryProps> = ({ onStartLoan }) => {
  const { currentUser } = useAuth();
  const { books, addBook, updateBook, deleteBook } = useData();

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'teacher' || currentUser?.role === 'club_manager';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'Littérature marocaine',
    isbn: '',
    totalCopies: 5,
    availableCopies: 5,
    coverEmoji: '📚',
    coverBg: 'from-sky-700 to-indigo-900',
    description: ''
  });

  const categories = useMemo(() => {
    const set = new Set(books.map(b => b.category));
    return Array.from(set);
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.isbn.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory === 'all' || b.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [books, searchQuery, selectedCategory]);

  const openAddModal = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: '',
      category: 'Littérature marocaine',
      isbn: `978-${Math.floor(100000000 + Math.random() * 900000000)}`,
      totalCopies: 5,
      availableCopies: 5,
      coverEmoji: '📖',
      coverBg: 'from-sky-700 to-indigo-900',
      description: ''
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      coverEmoji: book.coverEmoji || '📖',
      coverBg: book.coverBg || 'from-sky-700 to-indigo-900',
      description: book.description
    });
    setIsAddModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author) {
      alert('Veuillez renseigner le titre et l\'auteur.');
      return;
    }

    if (editingBook) {
      await updateBook(editingBook.id, {
        ...formData,
        totalCopies: Number(formData.totalCopies),
        availableCopies: Number(formData.availableCopies)
      });
    } else {
      await addBook({
        ...formData,
        totalCopies: Number(formData.totalCopies),
        availableCopies: Number(formData.availableCopies)
      });
    }

    setIsAddModalOpen(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Retirer le livre "${title}" du catalogue du club ?`)) {
      await deleteBook(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Bibliothèque & Club de Lecture
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
              {books.length} titres • {books.reduce((a, b) => a + b.totalCopies, 0)} exemplaires
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Catalogue officiel du club de lecture « Les Aventuriers du Savoir » • Disponibilité mise à jour en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Catalogue */}
          <button
            onClick={() => exportBooksToExcel(books, 'xlsx')}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exporter catalogue (.xlsx)</span>
          </button>

          {/* Ajouter un livre (Professeure / Resp Club) */}
          {canManage && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau livre</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche et catégories */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par titre, auteur, genre ou ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Disponibles en classe :</span>
            <strong className="text-teal-700">
              {books.reduce((a, b) => a + b.availableCopies, 0)} exemplaires prêts à être empruntés
            </strong>
          </div>
        </div>

        {/* Pilules de catégories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous les genres
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des livres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredBooks.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
            {books.length === 0
              ? 'Aucun livre enregistré dans la bibliothèque pour le moment. Cliquez sur « Nouveau livre » pour enrichir le catalogue.'
              : 'Aucun ouvrage ne correspond à votre recherche dans la bibliothèque.'}
          </div>
        ) : (
          filteredBooks.map((book) => {
            const isAvailable = book.availableCopies > 0;
            const borrowedCount = book.totalCopies - book.availableCopies;

            return (
              <div
                key={book.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Couverture stylisée */}
                  <div className={`h-36 bg-gradient-to-br ${book.coverBg || 'from-sky-800 to-indigo-950'} p-4 text-white flex flex-col justify-between relative`}>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl filter drop-shadow-sm">{book.coverEmoji || '📖'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-md uppercase tracking-wider">
                        {book.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base leading-snug line-clamp-2">
                        {book.title}
                      </h3>
                      <p className="text-xs text-cyan-200 font-medium mt-0.5">{book.author}</p>
                    </div>
                  </div>

                  {/* Corps de la carte */}
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {book.description}
                    </p>

                    <div className="text-[11px] font-mono text-slate-400">
                      ISBN : {book.isbn}
                    </div>

                    {/* Jauge de disponibilité */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Disponibilité :</span>
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 font-bold text-teal-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {book.availableCopies} / {book.totalCopies} disponibles
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                            <XCircle className="w-3.5 h-3.5" /> Tout emprunté
                          </span>
                        )}
                      </div>

                      {/* Barre de progression des exemplaires */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isAvailable ? 'bg-teal-500' : 'bg-rose-400'
                          }`}
                          style={{
                            width: `${Math.round((book.availableCopies / book.totalCopies) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bas de carte & Actions */}
                <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-slate-50 mt-2">
                  {canManage && onStartLoan && isAvailable && (
                    <button
                      onClick={() => onStartLoan(book.id)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-cyan-700" />
                      <span>Prêter ce livre</span>
                    </button>
                  )}

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(book)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-700 hover:bg-slate-100"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(book.id, book.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL AJOUT / MODIFIER LIVRE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingBook ? 'Modifier le livre' : 'Ajouter un nouveau livre au catalogue'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titre de l'œuvre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: La Boîte à Merveilles"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Auteur *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Ahmed Sefrioui"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie littéraire
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Littérature marocaine"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ISBN / Réf
                  </label>
                  <input
                    type="text"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="978-..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total exemplaires
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalCopies}
                    onChange={(e) => setFormData({ ...formData, totalCopies: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disponibles
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={formData.totalCopies}
                    required
                    value={formData.availableCopies}
                    onChange={(e) => setFormData({ ...formData, availableCopies: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Résumé / Quatrième de couverture
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Bref résumé de l'histoire et thèmes abordés..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs"
                >
                  {editingBook ? 'Mettre à jour' : 'Ajouter à la bibliothèque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
