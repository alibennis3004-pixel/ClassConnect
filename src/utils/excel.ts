import * as XLSX from 'xlsx';
import { Student, Book, Loan, Lesson, UserRole, StudentStatus } from '../types';

export function exportStudentsToExcel(students: Student[], format: 'xlsx' | 'csv' = 'xlsx') {
  const data = students.map((s, index) => ({
    'N° Ordre': index + 1,
    'Matricule / Numéro': s.studentNumber,
    'Prénom': s.firstName,
    'Nom': s.lastName,
    'Nom Complet': `${s.firstName} ${s.lastName}`,
    'Classe': s.className,
    'Adresse Gmail': s.email,
    'État du compte': s.status === 'active' ? 'Actif' : s.status === 'pending' ? 'En attente' : 'Suspendu',
    'Rôle': s.role === 'teacher' ? 'Professeure' : s.role === 'club_manager' ? 'Responsable Club' : 'Élève',
    'Livres empruntés en cours': s.activeLoansCount ?? 0,
    'Livres non rendus / en retard': s.overdueLoansCount ?? 0,
    'Date d\'inscription': new Date(s.createdAt).toLocaleDateString('fr-FR')
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Élèves ClassConnect');

  const fileName = `ClassConnect_Liste_Eleves_${new Date().toISOString().slice(0, 10)}.${format}`;
  XLSX.writeFile(workbook, fileName, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
}

export function exportLoansToExcel(loans: Loan[], format: 'xlsx' | 'csv' = 'xlsx') {
  const data = loans.map((l, index) => ({
    'N°': index + 1,
    'Titre du Livre': l.bookTitle,
    'Élève': l.studentName,
    'Email Élève': l.studentEmail,
    'Date d\'emprunt': l.loanDate,
    'Date prévue de retour': l.dueDate,
    'Date réelle de retour': l.returnDate || 'Non rendu',
    'Statut': l.status === 'returned' ? 'Rendu' : l.status === 'overdue' ? 'En retard !' : 'En cours',
    'Responsable': l.processedBy,
    'Remarques': l.notes || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registre Emprunts');

  const fileName = `ClassConnect_Registre_Emprunts_${new Date().toISOString().slice(0, 10)}.${format}`;
  XLSX.writeFile(workbook, fileName, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
}

export function exportBooksToExcel(books: Book[], format: 'xlsx' | 'csv' = 'xlsx') {
  const data = books.map((b, index) => ({
    'N°': index + 1,
    'Titre': b.title,
    'Auteur': b.author,
    'Catégorie': b.category,
    'ISBN / Réf': b.isbn,
    'Total Exemplaires': b.totalCopies,
    'Disponibles': b.availableCopies,
    'Empruntés': b.totalCopies - b.availableCopies,
    'Description': b.description
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogue Bibliothèque');

  const fileName = `ClassConnect_Catalogue_Livres_${new Date().toISOString().slice(0, 10)}.${format}`;
  XLSX.writeFile(workbook, fileName, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
}

export function exportLessonsToExcel(lessons: Lesson[], format: 'xlsx' | 'csv' = 'xlsx') {
  const data = lessons.map((l, index) => ({
    'N°': index + 1,
    'Titre de la leçon': l.title,
    'Matière': l.subject,
    'Date de publication': l.publishedAt,
    'Date limite de rendu': l.dueDate || 'Aucune (cours théorique)',
    'Nombre de pièces jointes': l.attachments.length,
    'Fichiers joints': l.attachments.map(a => a.name).join(', ') || 'Aucun',
    'Enseignante': l.createdBy
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leçons et Cours');

  const fileName = `ClassConnect_Lecons_et_Cours_${new Date().toISOString().slice(0, 10)}.${format}`;
  XLSX.writeFile(workbook, fileName, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
}

export function generateStudentTemplateExcel() {
  const templateData = [
    {
      'Numéro': 'CC-301',
      'Prénom': 'Exemple_Prénom',
      'Nom': 'Exemple_Nom',
      'Classe': '3ème Année 2 - Parcours International',
      'Email Gmail': 'eleve@gmail.com',
      'Statut': 'Actif',
      'Rôle': 'Élève'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modèle Importation');
  XLSX.writeFile(workbook, 'ClassConnect_Modele_Import_Eleves.xlsx');
}

export interface ImportResult {
  validStudents: Omit<Student, 'id' | 'createdAt'>[];
  duplicates: { row: number; email: string; studentNumber: string; reason: string }[];
  errors: string[];
}

export async function parseStudentsFromExcel(file: File, existingStudents: Student[]): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const validStudents: Omit<Student, 'id' | 'createdAt'>[] = [];
        const duplicates: { row: number; email: string; studentNumber: string; reason: string }[] = [];
        const errors: string[] = [];

        const existingEmails = new Set(existingStudents.map(s => s.email.toLowerCase().trim()));
        const existingNumbers = new Set(existingStudents.map(s => s.studentNumber.toLowerCase().trim()));
        const newBatchEmails = new Set<string>();
        const newBatchNumbers = new Set<string>();

        rows.forEach((row, idx) => {
          const rowNumber = idx + 2;

          const studentNumber = String(
            row['Numéro'] || row['Numero'] || row['Matricule'] || row['studentNumber'] || ''
          ).trim();
          const firstName = String(
            row['Prénom'] || row['Prenom'] || row['firstName'] || ''
          ).trim();
          const lastName = String(
            row['Nom'] || row['lastName'] || ''
          ).trim();
          const className = String(
            row['Classe'] || row['classe'] || row['className'] || '3ème Année Collégiale'
          ).trim();
          const email = String(
            row['Email Gmail'] || row['Email'] || row['email'] || row['Gmail'] || ''
          ).toLowerCase().trim();

          const rawStatus = String(row['Statut'] || row['status'] || 'Actif').toLowerCase();
          const status: StudentStatus = rawStatus.includes('suspend') ? 'suspended' : rawStatus.includes('attente') ? 'pending' : 'active';

          const rawRole = String(row['Rôle'] || row['Role'] || row['role'] || 'Élève').toLowerCase();
          const role: UserRole = rawRole.includes('prof') ? 'teacher' : rawRole.includes('club') || rawRole.includes('resp') ? 'club_manager' : 'student';

          if (!email || !firstName || !lastName) {
            errors.push(`Ligne ${rowNumber} : Nom, prénom ou adresse email manquante.`);
            return;
          }

          if (!email.includes('@')) {
            errors.push(`Ligne ${rowNumber} : Format d'email invalide (${email}).`);
            return;
          }

          if (existingEmails.has(email)) {
            duplicates.push({ row: rowNumber, email, studentNumber, reason: 'Cet email existe déjà dans le registre de la classe.' });
            return;
          }

          if (newBatchEmails.has(email)) {
            duplicates.push({ row: rowNumber, email, studentNumber, reason: 'Cet email est en double dans le fichier importé.' });
            return;
          }

          if (studentNumber && (existingNumbers.has(studentNumber.toLowerCase()) || newBatchNumbers.has(studentNumber.toLowerCase()))) {
            duplicates.push({ row: rowNumber, email, studentNumber, reason: `Le numéro ${studentNumber} est déjà attribué.` });
            return;
          }

          newBatchEmails.add(email);
          if (studentNumber) newBatchNumbers.add(studentNumber.toLowerCase());

          validStudents.push({
            studentNumber: studentNumber || `CC-${Math.floor(100 + Math.random() * 900)}`,
            firstName,
            lastName,
            className,
            email,
            status,
            role,
            activeLoansCount: 0,
            overdueLoansCount: 0
          });
        });

        resolve({ validStudents, duplicates, errors });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}
