"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  FileText,
  FileCheck2,
  Search,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock3,
  UserRound,
  CalendarDays,
  Building2,
  ChevronRight,
  MessageSquare,
  Award,
  Filter,
  Eye,
  Trash2,
  Pencil,
  ArrowLeft,
  Trophy,
  Medal,
} from "lucide-react";

import "../../css/evaluateur.css";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

/* =====================================================
   API
===================================================== */

async function apiRequest(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    let message = `Erreur HTTP ${response.status}`;

    if (typeof data === "string" && data.trim()) {
      message = data;
    } else if (data?.message) {
      message = data.message;
    } else if (data?.error) {
      message = data.error;
    }

    throw new Error(message);
  }

  return data;
}

/* =====================================================
   UTILITAIRES
===================================================== */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.resultats)) return data.resultats;
  return [];
}

function getIdOffre(item) {
  return item?.idOffre ?? item?.id_offre ?? item?.id;
}

function getIdAppel(item) {
  return (
    item?.appelOffre?.idAppelOffre ??
    item?.appelOffre?.id_appel_offre ??
    item?.appelOffre?.id ??
    item?.appel_offre?.idAppelOffre ??
    item?.appel_offre?.id_appel_offre ??
    item?.idAppelOffre ??
    item?.id_appel_offre
  );
}

function getAppel(item) {
  return item?.appelOffre ?? item?.appel_offre ?? {};
}

function getCritere(item) {
  return (
    item?.critere ??
    item?.critereEvaluation ??
    item?.critere_evaluation ??
    item ??
    {}
  );
}

function getIdCritere(item) {
  const critere = getCritere(item);

  return (
    critere?.idCritere ??
    critere?.id_critere ??
    item?.idCritere ??
    item?.id_critere
  );
}

function getIdNote(item) {
  return (
    item?.idNoter ??
    item?.id_noter ??
    item?.idNote ??
    item?.id_note ??
    item?.id
  );
}

function getIdDocument(item) {
  return item?.idDocument ?? item?.id_document ?? item?.id;
}

function formatDate(value) {
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "Non communiqué";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) return "Non communiqué";

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(number)} Ar`;
}

function getStatutLabel(statut) {
  const value = String(statut || "").toUpperCase();

  const labels = {
    DEPOSEE: "Déposée",
    EN_EVALUATION: "En évaluation",
    EVALUEE: "Évaluée",
    EN_ATTENTE: "En attente",
    TERMINEE: "Terminée",
    RETENUE: "Retenue",
    REFUSEE: "Refusée",
  };

  return labels[value] || statut || "Non renseigné";
}

function getFileName(doc) {
  return (
    doc?.nomFichier ??
    doc?.nom_fichier ??
    doc?.pieceRequise?.nomPiece ??
    doc?.piece_requise?.nom_piece ??
    "Document"
  );
}

function getDocumentType(doc) {
  return (
    doc?.typeDocument ??
    doc?.type_document ??
    doc?.pieceRequise?.nomPiece ??
    doc?.piece_requise?.nom_piece ??
    "Justificatif"
  );
}

function getPonderation(item) {
  const value = item?.ponderation ?? getCritere(item)?.ponderation ?? 0;
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getNomSoumissionnaire(offre) {
  return (
    offre?.utilisateur?.nomComplet ??
    offre?.utilisateur?.nom_complet ??
    offre?.soumissionnaire?.nomComplet ??
    offre?.soumissionnaire?.nom_complet ??
    offre?.nomSoumissionnaire ??
    "Soumissionnaire"
  );
}

function getCriteresPourAppel(criteres, appelId) {
  if (!appelId) return [];

  return criteres
    .filter((row) => {
      const rowAppelId =
        row?.appelOffre?.idAppelOffre ??
        row?.appelOffre?.id_appel_offre ??
        row?.appel_offre?.idAppelOffre ??
        row?.appel_offre?.id_appel_offre ??
        row?.idAppelOffre ??
        row?.id_appel_offre;

      return (
        rowAppelId != null &&
        Number(rowAppelId) === Number(appelId)
      );
    })
    .sort((a, b) => {
      const nomA = String(
        getCritere(a)?.nomCritere ??
        getCritere(a)?.nom_critere ??
        ""
      );

      const nomB = String(
        getCritere(b)?.nomCritere ??
        getCritere(b)?.nom_critere ??
        ""
      );

      return nomA.localeCompare(nomB, "fr");
    });
}

/* =====================================================
   CALCUL DU SCORE PONDERE
   Score sur 20 selon les pondérations de la grille.
===================================================== */

function calculerScoreOffre(notes, criteres) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return null;
  }

  if (!Array.isArray(criteres) || criteres.length === 0) {
    return null;
  }

  let totalPoints = 0;
  let totalPonderationNotee = 0;
  let nombreNotes = 0;

  const criteresNotés = new Set();

  notes.forEach((noteItem) => {
    const critereId =
      noteItem?.critere?.idCritere ??
      noteItem?.critere?.id_critere ??
      noteItem?.idCritere ??
      noteItem?.id_critere;

    const note = Number(noteItem?.note);

    if (
      critereId == null ||
      !Number.isFinite(note) ||
      note < 0 ||
      note > 20
    ) {
      return;
    }

    const ligneCritere = criteres.find(
      (row) =>
        Number(getIdCritere(row)) === Number(critereId)
    );

    if (!ligneCritere) return;

    const ponderation = getPonderation(ligneCritere);

    if (ponderation <= 0) return;

    const id = Number(critereId);

    // Évite de compter deux fois le même critère.
    if (criteresNotés.has(id)) return;

    criteresNotés.add(id);
    totalPoints += note * ponderation;
    totalPonderationNotee += ponderation;
    nombreNotes += 1;
  });

  if (totalPonderationNotee <= 0) return null;

  const score = totalPoints / totalPonderationNotee;

  return {
    score,
    nombreNotes,
    totalCriteres: criteres.length,
    complet: nombreNotes === criteres.length,
    ponderationNotee: totalPonderationNotee,
  };
}

/* =====================================================
   PAGE EVALUATEUR
===================================================== */

export default function EvaluateurPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [offres, setOffres] = useState([]);
  const [criteresTous, setCriteresTous] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notesEnregistrees, setNotesEnregistrees] = useState([]);

  const [offreSelectionnee, setOffreSelectionnee] = useState(null);

  const [notesSaisie, setNotesSaisie] = useState({});
  const [commentairesSaisie, setCommentairesSaisie] = useState({});

  const [classementOffres, setClassementOffres] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingClassement, setLoadingClassement] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingNote, setDeletingNote] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("TOUS");
  const [historySearch, setHistorySearch] = useState("");
  const [classementSearch, setClassementSearch] = useState("");

  const [activeTab, setActiveTab] = useState("offres");
  const [returnTab, setReturnTab] = useState("offres");

  const [notice, setNotice] = useState({
    type: "",
    message: "",
  });

  /* =====================================================
     NOTIFICATION
  ===================================================== */

  const showNotice = (type, message) => {
    setNotice({ type, message });
  };

  /* =====================================================
     CHARGER LE CLASSEMENT
  ===================================================== */

  const chargerClassement = useCallback(
    async (offresListe, criteresListe) => {
      setLoadingClassement(true);

      try {
        const resultats = await Promise.all(
          offresListe.map(async (offre) => {
            const offreId = getIdOffre(offre);
            const appelId = getIdAppel(offre);

            if (!offreId || !appelId) return null;

            try {
              const notesData = await apiRequest(
                `/api/notes/offre/${offreId}`
              );

              const notes = normalizeList(notesData);

              if (notes.length === 0) return null;

              const criteres = getCriteresPourAppel(
                criteresListe,
                appelId
              );

              const resultat = calculerScoreOffre(
                notes,
                criteres
              );

              if (!resultat) return null;

              return {
                offre,
                offreId,
                score: resultat.score,
                nombreNotes: resultat.nombreNotes,
                totalCriteres: resultat.totalCriteres,
                complet: resultat.complet,
                ponderationNotee: resultat.ponderationNotee,
              };
            } catch (error) {
              console.error(
                `Erreur de chargement des notes de l'offre ${offreId}:`,
                error
              );
              return null;
            }
          })
        );

        const classement = resultats
          .filter(Boolean)
          .sort((a, b) => {
            // Les évaluations complètes sont prioritaires.
            if (a.complet !== b.complet) {
              return a.complet ? -1 : 1;
            }

            // Ensuite, meilleure note en premier.
            return b.score - a.score;
          });

        setClassementOffres(classement);
      } finally {
        setLoadingClassement(false);
      }
    },
    []
  );

  /* =====================================================
     CHARGER SESSION ET OFFRES
  ===================================================== */

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [sessionData, offresData, criteresData] =
        await Promise.all([
          apiRequest("/api/auth/session"),
          apiRequest("/api/offres/evaluateur"),
          apiRequest("/api/appel-offre-criteres"),
        ]);

      const role = String(
        sessionData?.role || ""
      ).toUpperCase();

      if (role && role !== "EVALUATEUR") {
        throw new Error(
          "Cette page est réservée au rôle EVALUATEUR."
        );
      }

      const offresListe = normalizeList(offresData);
      const criteresListe = normalizeList(criteresData);

      setSession(sessionData);
      setOffres(offresListe);
      setCriteresTous(criteresListe);

      await chargerClassement(offresListe, criteresListe);
    } catch (error) {
      showNotice(
        "error",
        error.message ||
          "Impossible de charger le tableau de bord."
      );
    } finally {
      setLoading(false);
    }
  }, [chargerClassement]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* =====================================================
     FILTRER LES OFFRES
  ===================================================== */

  const offresFiltrees = useMemo(() => {
    const term = search.trim().toLowerCase();

    return offres.filter((offre) => {
      const appel = getAppel(offre);

      const texte = [
        appel?.reference,
        appel?.objet,
        appel?.description,
        offre?.accuseDeReception,
        offre?.accuse_de_reception,
        getNomSoumissionnaire(offre),
        offre?.utilisateur?.matricule,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      const matchSearch = !term || texte.includes(term);
      const statut = String(
        offre?.statut || ""
      ).toUpperCase();

      const matchStatut =
        statutFilter === "TOUS" ||
        statut === statutFilter;

      return matchSearch && matchStatut;
    });
  }, [offres, search, statutFilter]);

  /* =====================================================
     HISTORIQUE DES OFFRES
  ===================================================== */

  const historiqueOffres = useMemo(() => {
    const term = historySearch.trim().toLowerCase();

    return offres.filter((offre) => {
      const statut = String(
        offre?.statut || ""
      ).toUpperCase();

      const estHistorique =
        statut === "EVALUEE" ||
        statut === "EN_EVALUATION";

      if (!estHistorique) return false;

      const appel = getAppel(offre);

      const texte = [
        appel?.reference,
        appel?.objet,
        getNomSoumissionnaire(offre),
        offre?.accuseDeReception,
        offre?.accuse_de_reception,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return !term || texte.includes(term);
    });
  }, [offres, historySearch]);

  /* =====================================================
     FILTRER LE CLASSEMENT
  ===================================================== */

  const classementFiltre = useMemo(() => {
    const term = classementSearch.trim().toLowerCase();

    return classementOffres.filter((item) => {
      const appel = getAppel(item.offre);

      const texte = [
        appel?.reference,
        appel?.objet,
        getNomSoumissionnaire(item.offre),
        item.offre?.accuseDeReception,
        item.offre?.accuse_de_reception,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return !term || texte.includes(term);
    });
  }, [classementOffres, classementSearch]);

  /* =====================================================
     STATISTIQUES
  ===================================================== */

  const stats = useMemo(() => {
    const total = offres.length;

    const enAttente = offres.filter((offre) => {
      const statut = String(
        offre?.statut || ""
      ).toUpperCase();

      return (
        statut === "DEPOSEE" ||
        statut === "EN_ATTENTE"
      );
    }).length;

    const enCours = offres.filter(
      (offre) =>
        String(offre?.statut || "").toUpperCase() ===
        "EN_EVALUATION"
    ).length;

    const evaluees = offres.filter(
      (offre) =>
        String(offre?.statut || "").toUpperCase() ===
        "EVALUEE"
    ).length;

    const completes = classementOffres.filter(
      (item) => item.complet
    ).length;

    return {
      total,
      enAttente,
      enCours,
      evaluees,
      completes,
    };
  }, [offres, classementOffres]);

  /* =====================================================
     CRITERES DE L'APPEL SELECTIONNE
  ===================================================== */

  const criteresOffre = useMemo(() => {
    if (!offreSelectionnee) return [];

    const appelId = getIdAppel(offreSelectionnee);

    return getCriteresPourAppel(
      criteresTous,
      appelId
    );
  }, [criteresTous, offreSelectionnee]);

  const totalPonderation = useMemo(
    () =>
      criteresOffre.reduce(
        (sum, item) => sum + getPonderation(item),
        0
      ),
    [criteresOffre]
  );

  /* =====================================================
     RECHERCHER UNE NOTE ENREGISTREE
  ===================================================== */

  function findSavedNote(critereId) {
    return notesEnregistrees.find((note) => {
      const noteCritereId =
        note?.critere?.idCritere ??
        note?.critere?.id_critere ??
        note?.idCritere ??
        note?.id_critere;

      return (
        Number(noteCritereId) === Number(critereId)
      );
    });
  }

  /* =====================================================
     OUVRIR UNE OFFRE
  ===================================================== */

  async function openOffre(offre, source = "offres") {
    const offreId = getIdOffre(offre);

    if (!offreId) {
      showNotice(
        "error",
        "Identifiant de l'offre introuvable."
      );
      return;
    }

    setDetailLoading(true);
    setNotice({ type: "", message: "" });

    try {
      const [documentsData, notesData] =
        await Promise.all([
          apiRequest(
            `/api/documents-offre/offre/${offreId}`
          ),
          apiRequest(`/api/notes/offre/${offreId}`),
        ]);

      const docs = normalizeList(documentsData);
      const notes = normalizeList(notesData);

      setOffreSelectionnee(offre);
      setDocuments(docs);
      setNotesEnregistrees(notes);

      const initialNotes = {};
      const initialCommentaires = {};

      notes.forEach((note) => {
        const critereId =
          note?.critere?.idCritere ??
          note?.critere?.id_critere ??
          note?.idCritere ??
          note?.id_critere;

        if (critereId != null) {
          initialNotes[critereId] = String(
            note?.note ?? ""
          );

          initialCommentaires[critereId] =
            note?.commentaire || "";
        }
      });

      setNotesSaisie(initialNotes);
      setCommentairesSaisie(initialCommentaires);

      setReturnTab(source);
      setMobileMenu(false);
    } catch (error) {
      showNotice(
        "error",
        error.message ||
          "Impossible de charger les documents et les notes."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  /* =====================================================
     RECHARGER LES NOTES D'UNE OFFRE
  ===================================================== */

  async function reloadNotes() {
    if (!offreSelectionnee) return;

    const offreId = getIdOffre(offreSelectionnee);

    const data = await apiRequest(
      `/api/notes/offre/${offreId}`
    );

    const notes = normalizeList(data);

    setNotesEnregistrees(notes);

    const initialNotes = {};
    const initialCommentaires = {};

    notes.forEach((note) => {
      const critereId =
        note?.critere?.idCritere ??
        note?.critere?.id_critere ??
        note?.idCritere ??
        note?.id_critere;

      if (critereId != null) {
        initialNotes[critereId] = String(
          note?.note ?? ""
        );

        initialCommentaires[critereId] =
          note?.commentaire || "";
      }
    });

    setNotesSaisie(initialNotes);
    setCommentairesSaisie(initialCommentaires);
  }

  /* =====================================================
     TELECHARGER UN DOCUMENT
  ===================================================== */

  async function downloadDocument(doc) {
    const documentId = getIdDocument(doc);

    if (!documentId) {
      showNotice(
        "error",
        "Identifiant du document introuvable."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/documents-offre/${documentId}/telecharger`,
        { credentials: "include" }
      );

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(
          message || `Erreur HTTP ${response.status}`
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.download = getFileName(doc);

      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      showNotice(
        "error",
        error.message || "Téléchargement impossible."
      );
    }
  }

  /* =====================================================
     MODIFIER UNE NOTE
  ===================================================== */

  function updateNote(critereId, value) {
    if (value === "") {
      setNotesSaisie((previous) => ({
        ...previous,
        [critereId]: "",
      }));
      return;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) return;
    if (number < 0 || number > 20) return;

    setNotesSaisie((previous) => ({
      ...previous,
      [critereId]: value,
    }));
  }

  function updateCommentaire(critereId, value) {
    setCommentairesSaisie((previous) => ({
      ...previous,
      [critereId]: value,
    }));
  }

  /* =====================================================
     ENREGISTRER / MODIFIER LES EVALUATIONS
  ===================================================== */

  async function saveEvaluations(event) {
    event.preventDefault();

    if (!offreSelectionnee || saving) return;

    if (criteresOffre.length === 0) {
      showNotice(
        "error",
        "Aucun critère d'évaluation n'est associé à cet appel."
      );
      return;
    }

    const notes = [];

    for (const row of criteresOffre) {
      const critereId = getIdCritere(row);

      if (!critereId) {
        showNotice(
          "error",
          "Un critère possède un identifiant invalide."
        );
        return;
      }

      const valeur = notesSaisie[critereId];

      if (valeur === undefined || valeur === "") {
        const nom =
          getCritere(row)?.nomCritere ??
          getCritere(row)?.nom_critere ??
          "ce critère";

        showNotice(
          "error",
          `Veuillez saisir une note pour « ${nom} ».`
        );
        return;
      }

      const noteNumber = Number(valeur);

      if (
        !Number.isFinite(noteNumber) ||
        noteNumber < 0 ||
        noteNumber > 20
      ) {
        showNotice(
          "error",
          "Chaque note doit être comprise entre 0 et 20."
        );
        return;
      }

      notes.push({
        idCritere: Number(critereId),
        note: noteNumber,
        commentaire:
          commentairesSaisie[critereId] || "",
      });
    }

    setSaving(true);
    setNotice({ type: "", message: "" });

    try {
      await apiRequest("/api/notes/evaluer", {
        method: "POST",
        body: JSON.stringify({
          idOffre: Number(
            getIdOffre(offreSelectionnee)
          ),
          notes,
        }),
      });

      await reloadNotes();
      await loadDashboard();

      showNotice(
        "success",
        "Les notes ont été enregistrées ou modifiées avec succès."
      );
    } catch (error) {
      showNotice(
        "error",
        error.message ||
          "L'enregistrement des notes a échoué."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     SUPPRIMER UNE NOTE
  ===================================================== */

  async function deleteNote(note) {
    const noteId = getIdNote(note);

    if (!noteId) {
      showNotice(
        "error",
        "Identifiant de la note introuvable. Vérifiez la réponse du backend."
      );
      return;
    }

    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette note ? Cette action est irréversible."
    );

    if (!confirmation) return;

    setDeletingNote(noteId);
    setNotice({ type: "", message: "" });

    try {
      await apiRequest(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      await reloadNotes();
      await loadDashboard();

      showNotice("success", "La note a été supprimée.");
    } catch (error) {
      showNotice(
        "error",
        error.message ||
          "Impossible de supprimer cette note. Vérifiez que la route DELETE existe dans le backend."
      );
    } finally {
      setDeletingNote(null);
    }
  }

  /* =====================================================
     RETOUR A LA LISTE
  ===================================================== */

  function backToList() {
    setOffreSelectionnee(null);
    setDocuments([]);
    setNotesEnregistrees([]);
    setNotesSaisie({});
    setCommentairesSaisie({});
    setActiveTab(returnTab);
  }

  function navigateTo(tab) {
    setOffreSelectionnee(null);
    setDocuments([]);
    setNotesEnregistrees([]);
    setNotesSaisie({});
    setCommentairesSaisie({});
    setActiveTab(tab);
    setMobileMenu(false);
    setNotice({ type: "", message: "" });
  }

  /* =====================================================
     DECONNEXION
  ===================================================== */

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.error("Erreur de déconnexion :", error);
    } finally {
      router.push("/");
    }
  }

  /* =====================================================
     RENDU
  ===================================================== */

  return (
    <main className="evaluateur-page">
      {/* SIDEBAR */}
      <aside
        className={`evaluateur-sidebar ${
          mobileMenu ? "is-open" : ""
        }`}
      >
        <div className="evaluateur-brand">
          <img src="/spat.png" alt="Logo SPAT" />

          <div>
            <strong>SPAT</strong>
            <span>Gestion des marchés</span>
          </div>

          <button
            type="button"
            className="ev-icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Fermer le menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="ev-sidebar-caption">
          ESPACE ÉVALUATEUR
        </div>

        <button
          type="button"
          className={`ev-side-link ${
            activeTab === "offres" ? "active" : ""
          }`}
          onClick={() => navigateTo("offres")}
        >
          <LayoutDashboard size={18} />
          Tableau de bord
        </button>

        <button
          type="button"
          className={`ev-side-link ${
            activeTab === "evaluation" ? "active" : ""
          }`}
          onClick={() => navigateTo("evaluation")}
        >
          <ClipboardList size={18} />
          Évaluation des offres
        </button>

        <button
          type="button"
          className={`ev-side-link ${
            activeTab === "classement" ? "active" : ""
          }`}
          onClick={() => navigateTo("classement")}
        >
          <Trophy size={18} />
          Classement des offres
        </button>

        <button
          type="button"
          className={`ev-side-link ${
            activeTab === "historique" ? "active" : ""
          }`}
          onClick={() => navigateTo("historique")}
        >
          <History size={18} />
          Historique des notes
        </button>

        <div className="ev-sidebar-bottom">
          <div className="ev-profile">
            <div className="ev-avatar">
              {(session?.nomComplet || "E")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="ev-profile-info">
              <strong>
                {session?.nomComplet || "Évaluateur"}
              </strong>
              <span>
                {session?.matricule || "Compte connecté"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="ev-side-link ev-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <section className="evaluateur-main">
        <header className="evaluateur-topbar">
          <button
            type="button"
            className="ev-icon-button mobile-menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={21} />
          </button>

          <div>
            <span className="ev-eyebrow">
              PORT DE TOAMASINA
            </span>
            <h1>Espace évaluateur</h1>
          </div>

          <button
            type="button"
            className="ev-refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "ev-spin" : ""}
            />
            Actualiser
          </button>
        </header>

        {/* NOTIFICATION */}
        {notice.message && (
          <div
            className={`ev-notice ev-notice-${notice.type}`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertCircle size={19} />
            )}

            <p>{notice.message}</p>

            <button
              type="button"
              onClick={() =>
                setNotice({ type: "", message: "" })
              }
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* =================================================
            DETAIL D'UNE OFFRE
        ================================================= */}

        {offreSelectionnee ? (
          <section className="ev-detail-page">
            <button
              type="button"
              className="ev-back-button"
              onClick={backToList}
            >
              <ArrowLeft size={17} />
              Retour à la liste
            </button>

            <div className="ev-detail-hero">
              <div>
                <span className="ev-welcome-tag">
                  DOSSIER DE SOUMISSION
                </span>

                <div className="ev-reference">
                  {getAppel(offreSelectionnee)?.reference ||
                    "Appel d'offres"}
                </div>

                <h2>
                  {getAppel(offreSelectionnee)?.objet ||
                    "Offre à évaluer"}
                </h2>

                <p>
                  Consultez les pièces fournies puis notez chaque
                  critère conformément à la grille d'évaluation.
                </p>
              </div>

              <div className="ev-detail-amount">
                <span>Montant proposé</span>
                <strong>
                  {formatMoney(offreSelectionnee?.montant)}
                </strong>
              </div>
            </div>

            <div className="ev-detail-facts">
              <div>
                <span>Soumissionnaire</span>
                <strong>
                  {getNomSoumissionnaire(offreSelectionnee)}
                </strong>
              </div>

              <div>
                <span>Date de dépôt</span>
                <strong>
                  {formatDate(
                    offreSelectionnee?.dateDepot ??
                    offreSelectionnee?.date_depot
                  )}
                </strong>
              </div>

              <div>
                <span>Accusé de réception</span>
                <strong>
                  {offreSelectionnee?.accuseDeReception ||
                    offreSelectionnee?.accuse_de_reception ||
                    "Non disponible"}
                </strong>
              </div>

              <div>
                <span>Statut</span>
                <strong>
                  {getStatutLabel(
                    offreSelectionnee?.statut
                  )}
                </strong>
              </div>
            </div>

            {/* DOCUMENTS */}
            <section className="ev-panel">
              <div className="ev-panel-heading">
                <div className="ev-panel-title">
                  <FileCheck2 size={20} />

                  <div>
                    <h3>Documents de l'offre</h3>
                    <p>
                      Pièces justificatives déposées par le
                      soumissionnaire
                    </p>
                  </div>
                </div>

                <span className="ev-count">
                  {documents.length} document(s)
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="ev-empty-inline">
                  Aucun document n'a été retourné pour cette offre.
                </div>
              ) : (
                <div className="ev-document-list">
                  {documents.map((doc, index) => (
                    <div
                      className="ev-document-row"
                      key={getIdDocument(doc) || index}
                    >
                      <div className="ev-document-icon">
                        <FileText size={21} />
                      </div>

                      <div className="ev-document-info">
                        <strong>{getFileName(doc)}</strong>
                        <span>{getDocumentType(doc)}</span>
                      </div>

                      <button
                        type="button"
                        className="ev-download-button"
                        onClick={() => downloadDocument(doc)}
                      >
                        <Download size={16} />
                        Télécharger
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* NOTES DEJA ENREGISTREES */}
            <section className="ev-panel">
              <div className="ev-panel-heading">
                <div className="ev-panel-title">
                  <History size={21} />

                  <div>
                    <h3>Notes déjà enregistrées</h3>
                    <p>
                      Consultez, modifiez ou supprimez une note.
                    </p>
                  </div>
                </div>

                <span className="ev-count">
                  {notesEnregistrees.length} note(s)
                </span>
              </div>

              {notesEnregistrees.length === 0 ? (
                <div className="ev-empty-inline">
                  Aucune note enregistrée pour cette offre.
                </div>
              ) : (
                <div className="ev-document-list">
                  {notesEnregistrees.map((note, index) => {
                    const critere = getCritere(note);
                    const noteId = getIdNote(note);

                    const nomCritere =
                      critere?.nomCritere ??
                      critere?.nom_critere ??
                      "Critère";

                    return (
                      <article
                        className="ev-criterion-card"
                        key={noteId || index}
                      >
                        <div className="ev-criterion-top">
                          <div className="ev-criterion-number">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="ev-criterion-name">
                            <h4>{nomCritere}</h4>
                            <p>
                              {note?.commentaire ||
                                "Aucun commentaire enregistré."}
                            </p>
                          </div>

                          <div className="ev-weight">
                            <strong>
                              {Number(note?.note || 0).toLocaleString(
                                "fr-FR"
                              )}{" "}
                              / 20
                            </strong>
                            <span>Note attribuée</span>
                          </div>
                        </div>

                        <div className="ev-offer-footer">
                          <button
                            type="button"
                            className="ev-download-button"
                            onClick={() => {
                              const idCritere =
                                getIdCritere(note);

                              if (idCritere) {
                                document
                                  .getElementById(
                                    `critere-${idCritere}`
                                  )
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  });
                              }
                            }}
                          >
                            <Pencil size={16} />
                            Modifier dans la grille
                          </button>

                          <button
                            type="button"
                            className="ev-download-button"
                            onClick={() => deleteNote(note)}
                            disabled={
                              !noteId ||
                              deletingNote === noteId
                            }
                          >
                            {deletingNote === noteId ? (
                              <RefreshCw
                                size={16}
                                className="ev-spin"
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            Supprimer
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* GRILLE D'EVALUATION */}
            <section className="ev-panel ev-evaluation-panel">
              <div className="ev-panel-heading">
                <div className="ev-panel-title">
                  <Award size={21} />

                  <div>
                    <h3>Grille d'évaluation</h3>
                    <p>
                      Attribuez ou modifiez une note sur 20 pour
                      chaque critère.
                    </p>
                  </div>
                </div>

                <span className="ev-count">
                  {criteresOffre.length} critère(s)
                </span>
              </div>

              {criteresOffre.length === 0 ? (
                <div className="ev-empty-inline">
                  Aucun critère n'est associé à cet appel d'offres.
                  Vérifiez la grille configurée par l'administrateur.
                </div>
              ) : (
                <form onSubmit={saveEvaluations}>
                  <div className="ev-criteria-summary">
                    <span>Somme des pondérations</span>
                    <strong>
                      {totalPonderation.toLocaleString("fr-FR")} %
                    </strong>
                  </div>

                  <div className="ev-criteria-list">
                    {criteresOffre.map((row, index) => {
                      const critere = getCritere(row);
                      const critereId = getIdCritere(row);
                      const savedNote =
                        findSavedNote(critereId);

                      const nomCritere =
                        critere?.nomCritere ??
                        critere?.nom_critere ??
                        `Critère ${index + 1}`;

                      return (
                        <article
                          className="ev-criterion-card"
                          id={`critere-${critereId}`}
                          key={
                            row?.idAppelOffreCritere ??
                            row?.id_appel_offre_critere ??
                            critereId ??
                            index
                          }
                        >
                          <div className="ev-criterion-top">
                            <div className="ev-criterion-number">
                              {String(index + 1).padStart(2, "0")}
                            </div>

                            <div className="ev-criterion-name">
                              <h4>{nomCritere}</h4>

                              <p>
                                {critere?.description ||
                                  "Aucune description disponible."}
                              </p>
                            </div>

                            <div className="ev-weight">
                              <strong>
                                {getPonderation(row)} %
                              </strong>
                              <span>Pondération</span>
                            </div>
                          </div>

                          <div className="ev-criterion-inputs">
                            <label>
                              Note attribuée <em>*</em>

                              <div className="ev-note-input-wrap">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.01"
                                  value={
                                    critereId
                                      ? notesSaisie[critereId] ?? ""
                                      : ""
                                  }
                                  onChange={(event) =>
                                    updateNote(
                                      critereId,
                                      event.target.value
                                    )
                                  }
                                  placeholder="Note / 20"
                                  required
                                  disabled={!critereId || saving}
                                />

                                <span>/ 20</span>
                              </div>
                            </label>

                            <label className="ev-comment-label">
                              <span>
                                <MessageSquare size={15} />
                                Commentaire
                              </span>

                              <textarea
                                rows={2}
                                value={
                                  critereId
                                    ? commentairesSaisie[critereId] ?? ""
                                    : ""
                                }
                                onChange={(event) =>
                                  updateCommentaire(
                                    critereId,
                                    event.target.value
                                  )
                                }
                                placeholder="Justifiez votre appréciation pour ce critère..."
                                disabled={!critereId || saving}
                              />
                            </label>
                          </div>

                          {savedNote && (
                            <div className="ev-saved-note">
                              <CheckCircle2 size={15} />
                              Note déjà enregistrée : vous pouvez la
                              modifier ici.
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  <div className="ev-submit-bar">
                    <div>
                      <strong>
                        Enregistrer ou modifier l'évaluation
                      </strong>
                      <span>
                        Chaque note doit être comprise entre 0 et 20.
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="ev-primary-button"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <RefreshCw
                            size={17}
                            className="ev-spin"
                          />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save size={17} />
                          Enregistrer les notes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </section>
        ) : (
          <>
            {/* TABLEAU DE BORD */}
            {activeTab === "offres" && (
              <>
                <section className="ev-welcome">
                  <div>
                    <span className="ev-welcome-tag">
                      GESTION DES ÉVALUATIONS
                    </span>

                    <h2>
                      Bienvenue dans votre espace d'évaluation
                    </h2>

                    <p>
                      Consultez les offres déposées par les
                      soumissionnaires, examinez leurs documents et
                      attribuez les notes selon la grille de critères
                      définie.
                    </p>
                  </div>

                  <div className="ev-welcome-icon">
                    <ClipboardList size={62} />
                  </div>
                </section>

                <section className="ev-stats-grid">
                  <article className="ev-stat-card">
                    <div className="ev-stat-icon blue">
                      <FileText size={21} />
                    </div>
                    <div>
                      <span>Total des offres</span>
                      <strong>{stats.total}</strong>
                    </div>
                  </article>

                  <article className="ev-stat-card">
                    <div className="ev-stat-icon orange">
                      <Clock3 size={21} />
                    </div>
                    <div>
                      <span>En attente</span>
                      <strong>{stats.enAttente}</strong>
                    </div>
                  </article>

                  <article className="ev-stat-card">
                    <div className="ev-stat-icon purple">
                      <ClipboardList size={21} />
                    </div>
                    <div>
                      <span>En évaluation</span>
                      <strong>{stats.enCours}</strong>
                    </div>
                  </article>

                  <article className="ev-stat-card">
                    <div className="ev-stat-icon green">
                      <CheckCircle2 size={21} />
                    </div>
                    <div>
                      <span>Évaluées</span>
                      <strong>{stats.evaluees}</strong>
                    </div>
                  </article>
                </section>

                <section className="ev-list-section">
                  <div className="ev-section-heading">
                    <div>
                      <h2>Offres à évaluer</h2>
                      <p>
                        Sélectionnez une offre pour consulter ses
                        documents et remplir la grille de notation.
                      </p>
                    </div>
                  </div>

                  <div className="ev-filters">
                    <div className="ev-search">
                      <Search size={18} />

                      <input
                        type="search"
                        placeholder="Rechercher une référence, un objet, un soumissionnaire..."
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                      />
                    </div>

                    <div className="ev-filter-select">
                      <Filter size={17} />

                      <select
                        value={statutFilter}
                        onChange={(event) =>
                          setStatutFilter(event.target.value)
                        }
                      >
                        <option value="TOUS">
                          Tous les statuts
                        </option>
                        <option value="DEPOSEE">Déposées</option>
                        <option value="EN_EVALUATION">
                          En évaluation
                        </option>
                        <option value="EVALUEE">Évaluées</option>
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="ev-loading">
                      <span className="ev-loader" />
                      Chargement des offres...
                    </div>
                  ) : offresFiltrees.length === 0 ? (
                    <div className="ev-empty">
                      <FileText size={36} />
                      <h3>Aucune offre trouvée</h3>
                      <p>
                        Les offres déposées par les soumissionnaires
                        apparaîtront ici lorsqu'elles seront disponibles
                        pour évaluation.
                      </p>
                    </div>
                  ) : (
                    <div className="ev-offer-grid">
                      {offresFiltrees.map((offre) => {
                        const appel = getAppel(offre);
                        const offreId = getIdOffre(offre);
                        const statut = String(
                          offre?.statut || ""
                        ).toUpperCase();

                        return (
                          <article
                            className="ev-offer-card"
                            key={offreId}
                          >
                            <div className="ev-offer-card-top">
                              <span
                                className={`ev-status ${
                                  statut === "EVALUEE"
                                    ? "success"
                                    : statut === "EN_EVALUATION"
                                    ? "progress"
                                    : "pending"
                                }`}
                              >
                                <span />
                                {getStatutLabel(statut)}
                              </span>

                              <span className="ev-offer-id">
                                Offre #{offreId}
                              </span>
                            </div>

                            <div className="ev-reference">
                              {appel?.reference ||
                                "Référence non renseignée"}
                            </div>

                            <h3>
                              {appel?.objet || "Appel d'offres"}
                            </h3>

                            <div className="ev-offer-meta">
                              <span>
                                <UserRound size={15} />
                                {getNomSoumissionnaire(offre)}
                              </span>

                              <span>
                                <CalendarDays size={15} />
                                {formatDate(
                                  offre?.dateDepot ??
                                  offre?.date_depot
                                )}
                              </span>

                              <span>
                                <Building2 size={15} />
                                {appel?.lieuExecution ||
                                  appel?.lieu_execution ||
                                  "Lieu non précisé"}
                              </span>
                            </div>

                            <div className="ev-offer-footer">
                              <strong>
                                {formatMoney(offre?.montant)}
                              </strong>

                              <button
                                type="button"
                                className="ev-primary-button ev-small-button"
                                onClick={() =>
                                  openOffre(offre, "offres")
                                }
                                disabled={detailLoading}
                              >
                                Évaluer
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* EVALUATION DES OFFRES */}
            {activeTab === "evaluation" && (
              <section className="ev-list-section">
                <div className="ev-section-heading">
                  <div>
                    <h2>Évaluation des offres</h2>
                    <p>
                      Sélectionnez une offre pour attribuer ou modifier
                      ses notes.
                    </p>
                  </div>
                </div>

                <div className="ev-filters">
                  <div className="ev-search">
                    <Search size={18} />
                    <input
                      type="search"
                      placeholder="Rechercher une offre..."
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                    />
                  </div>

                  <div className="ev-filter-select">
                    <Filter size={17} />
                    <select
                      value={statutFilter}
                      onChange={(event) =>
                        setStatutFilter(event.target.value)
                      }
                    >
                      <option value="TOUS">Tous les statuts</option>
                      <option value="DEPOSEE">Déposées</option>
                      <option value="EN_EVALUATION">
                        En évaluation
                      </option>
                      <option value="EVALUEE">Évaluées</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="ev-loading">
                    <span className="ev-loader" />
                    Chargement des offres...
                  </div>
                ) : offresFiltrees.length === 0 ? (
                  <div className="ev-empty">
                    <ClipboardList size={36} />
                    <h3>Aucune offre disponible</h3>
                  </div>
                ) : (
                  <div className="ev-offer-grid">
                    {offresFiltrees.map((offre) => (
                      <article
                        className="ev-offer-card"
                        key={getIdOffre(offre)}
                      >
                        <div className="ev-reference">
                          {getAppel(offre)?.reference ||
                            "Référence non renseignée"}
                        </div>

                        <h3>
                          {getAppel(offre)?.objet ||
                            "Appel d'offres"}
                        </h3>

                        <div className="ev-offer-meta">
                          <span>
                            <UserRound size={15} />
                            {getNomSoumissionnaire(offre)}
                          </span>
                          <span>
                            <CalendarDays size={15} />
                            {formatDate(
                              offre?.dateDepot ??
                              offre?.date_depot
                            )}
                          </span>
                        </div>

                        <div className="ev-offer-footer">
                          <strong>
                            {getStatutLabel(offre?.statut)}
                          </strong>
                          <button
                            type="button"
                            className="ev-primary-button ev-small-button"
                            onClick={() =>
                              openOffre(offre, "evaluation")
                            }
                          >
                            Évaluer
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* CLASSEMENT DES OFFRES */}
            {activeTab === "classement" && (
              <section className="ev-list-section">
                <div className="ev-section-heading">
                  <div>
                    <span className="ev-welcome-tag">
                      RÉSULTATS DES ÉVALUATIONS
                    </span>

                    <h2>Classement des offres notées</h2>

                    <p>
                      Les offres ayant une évaluation complète sont
                      affichées en premier. Le classement est établi
                      selon le score pondéré, de la note la plus élevée
                      à la plus faible.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="ev-refresh-button"
                    onClick={loadDashboard}
                    disabled={loadingClassement || loading}
                  >
                    <RefreshCw
                      size={16}
                      className={
                        loadingClassement || loading
                          ? "ev-spin"
                          : ""
                      }
                    />
                    Actualiser
                  </button>
                </div>

                <div className="ev-stats-grid">
                  <article className="ev-stat-card">
                    <div className="ev-stat-icon blue">
                      <ClipboardList size={21} />
                    </div>
                    <div>
                      <span>Offres avec notes</span>
                      <strong>{classementOffres.length}</strong>
                    </div>
                  </article>

                  <article className="ev-stat-card">
                    <div className="ev-stat-icon green">
                      <CheckCircle2 size={21} />
                    </div>
                    <div>
                      <span>Évaluations complètes</span>
                      <strong>{stats.completes}</strong>
                    </div>
                  </article>

                  <article className="ev-stat-card">
                    <div className="ev-stat-icon purple">
                      <Trophy size={21} />
                    </div>
                    <div>
                      <span>Meilleure note complète</span>
                      <strong>
                        {classementOffres.find(
                          (item) => item.complet
                        )
                          ? `${classementOffres
                              .find((item) => item.complet)
                              .score.toFixed(2)} / 20`
                          : "—"}
                      </strong>
                    </div>
                  </article>
                </div>

                <div className="ev-filters">
                  <div className="ev-search">
                    <Search size={18} />
                    <input
                      type="search"
                      placeholder="Rechercher par référence, objet ou soumissionnaire..."
                      value={classementSearch}
                      onChange={(event) =>
                        setClassementSearch(event.target.value)
                      }
                    />
                  </div>
                </div>

                {loadingClassement ? (
                  <div className="ev-loading">
                    <span className="ev-loader" />
                    Calcul du classement...
                  </div>
                ) : classementFiltre.length === 0 ? (
                  <div className="ev-empty">
                    <Trophy size={38} />
                    <h3>Aucune offre notée</h3>
                    <p>
                      Les offres apparaîtront ici après
                      l'enregistrement de leurs notes.
                    </p>
                  </div>
                ) : (
                  <div className="ev-ranking-list">
                    {classementFiltre.map((item, index) => {
                      const offre = item.offre;
                      const appel = getAppel(offre);
                      const position = index + 1;

                      return (
                        <article
                          className={`ev-ranking-card ${
                            item.complet
                              ? "is-complete"
                              : "is-partial"
                          } ${position === 1 && item.complet
                            ? "ev-ranking-first"
                            : ""}`}
                          key={item.offreId}
                        >
                          <div className="ev-ranking-position">
                            {position === 1 && item.complet ? (
                              <Trophy size={25} />
                            ) : position === 2 && item.complet ? (
                              <Medal size={25} />
                            ) : position === 3 && item.complet ? (
                              <Award size={25} />
                            ) : (
                              <strong>{position}</strong>
                            )}
                          </div>

                          <div className="ev-ranking-information">
                            <span className="ev-reference">
                              {appel?.reference ||
                                "Référence non renseignée"}
                            </span>

                            <h3>
                              {appel?.objet || "Appel d'offres"}
                            </h3>

                            <p>
                              <UserRound size={15} />
                              {getNomSoumissionnaire(offre)}
                            </p>

                            <div className="ev-ranking-tags">
                              <span
                                className={
                                  item.complet
                                    ? "ev-complete-tag"
                                    : "ev-partial-tag"
                                }
                              >
                                {item.complet
                                  ? "Évaluation complète"
                                  : "Évaluation partielle"}
                              </span>

                              <span>
                                {item.nombreNotes} / {item.totalCriteres} critères notés
                              </span>
                            </div>
                          </div>

                          <div className="ev-ranking-score">
                            <strong>
                              {item.score.toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                            <span>/ 20</span>
                          </div>

                          <button
                            type="button"
                            className="ev-primary-button ev-small-button"
                            onClick={() =>
                              openOffre(offre, "classement")
                            }
                            disabled={detailLoading}
                          >
                            <Eye size={16} />
                            Voir les notes
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className="ev-ranking-note">
                  <AlertCircle size={17} />
                  <p>
                    Attention : une offre avec une évaluation partielle
                    n'a pas encore obtenu son score définitif. Le
                    classement doit être confirmé lorsque tous ses
                    critères sont notés.
                  </p>
                </div>
              </section>
            )}

            {/* HISTORIQUE DES NOTES */}
            {activeTab === "historique" && (
              <section className="ev-list-section">
                <div className="ev-section-heading">
                  <div>
                    <span className="ev-welcome-tag">
                      SUIVI DES NOTATIONS
                    </span>
                    <h2>Historique des évaluations</h2>
                    <p>
                      Retrouvez les offres déjà évaluées ou dont
                      l'évaluation est en cours. Ouvrez un dossier pour
                      consulter, modifier ou supprimer ses notes.
                    </p>
                  </div>
                </div>

                <div className="ev-stats-grid">
                  <article className="ev-stat-card">
                    <div className="ev-stat-icon blue">
                      <History size={21} />
                    </div>
                    <div>
                      <span>Dans l'historique</span>
                      <strong>{historiqueOffres.length}</strong>
                    </div>
                  </article>

                  <article className="ev-stat-card">
                    <div className="ev-stat-icon green">
                      <CheckCircle2 size={21} />
                    </div>
                    <div>
                      <span>Évaluées</span>
                      <strong>{stats.evaluees}</strong>
                    </div>
                  </article>

                  <article className="ev-stat-card">
                    <div className="ev-stat-icon purple">
                      <ClipboardList size={21} />
                    </div>
                    <div>
                      <span>En cours</span>
                      <strong>{stats.enCours}</strong>
                    </div>
                  </article>
                </div>

                <div className="ev-filters">
                  <div className="ev-search">
                    <Search size={18} />
                    <input
                      type="search"
                      placeholder="Rechercher par référence, objet ou soumissionnaire..."
                      value={historySearch}
                      onChange={(event) =>
                        setHistorySearch(event.target.value)
                      }
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="ev-loading">
                    <span className="ev-loader" />
                    Chargement de l'historique...
                  </div>
                ) : historiqueOffres.length === 0 ? (
                  <div className="ev-empty">
                    <History size={36} />
                    <h3>
                      Aucune évaluation dans l'historique
                    </h3>
                    <p>
                      Les offres évaluées ou en cours d'évaluation
                      apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <div className="ev-offer-grid">
                    {historiqueOffres.map((offre) => {
                      const appel = getAppel(offre);
                      const statut = String(
                        offre?.statut || ""
                      ).toUpperCase();

                      return (
                        <article
                          className="ev-offer-card"
                          key={getIdOffre(offre)}
                        >
                          <div className="ev-offer-card-top">
                            <span
                              className={`ev-status ${
                                statut === "EVALUEE"
                                  ? "success"
                                  : "progress"
                              }`}
                            >
                              <span />
                              {getStatutLabel(statut)}
                            </span>

                            <span className="ev-offer-id">
                              Offre #{getIdOffre(offre)}
                            </span>
                          </div>

                          <div className="ev-reference">
                            {appel?.reference ||
                              "Référence non renseignée"}
                          </div>

                          <h3>
                            {appel?.objet || "Appel d'offres"}
                          </h3>

                          <div className="ev-offer-meta">
                            <span>
                              <UserRound size={15} />
                              {getNomSoumissionnaire(offre)}
                            </span>

                            <span>
                              <CalendarDays size={15} />
                              {formatDate(
                                offre?.dateDepot ??
                                offre?.date_depot
                              )}
                            </span>
                          </div>

                          <div className="ev-offer-footer">
                            <strong>
                              {formatMoney(offre?.montant)}
                            </strong>

                            <button
                              type="button"
                              className="ev-primary-button ev-small-button"
                              onClick={() =>
                                openOffre(offre, "historique")
                              }
                              disabled={detailLoading}
                            >
                              <Eye size={16} />
                              Voir les notes
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}