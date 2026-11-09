
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  FileText,
  CalendarDays,
  MapPin,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ClipboardList,
  LogOut,
  Menu,
  Building2,
  FileCheck2,
  ChevronRight,
  Upload,
  Receipt,
} from "lucide-react";

import "../../css/soumissionnaire.css";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
];

/* =====================================================
   FONCTION API
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
   FONCTIONS UTILITAIRES
===================================================== */

function getAppelId(appel) {
  return (
    appel?.idAppelOffre ??
    appel?.id_appel_offre ??
    appel?.id
  );
}

function getPieceId(piece) {
  return (
    piece?.idPiece ??
    piece?.id_piece ??
    piece?.id
  );
}

function getCritereId(item) {
  return (
    item?.critere?.idCritere ??
    item?.critere?.id_critere ??
    item?.idCritere ??
    item?.id_critere ??
    item?.critereEvaluation?.idCritere
  );
}

function getOffreId(offre) {
  return (
    offre?.idOffre ??
    offre?.id_offre ??
    offre?.id
  );
}

function getAccuse(offre) {
  return (
    offre?.accuseDeReception ??
    offre?.accuse_de_reception ??
    "Non disponible"
  );
}

function getDateDepot(offre) {
  return (
    offre?.dateDepot ??
    offre?.date_depot ??
    null
  );
}

function getAppelFromOffre(offre) {
  return (
    offre?.appelOffre ??
    offre?.appel_offre ??
    null
  );
}

function formatDate(value) {
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Non communiqué";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Non communiqué";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(number)} Ar`;
}

function isAppelOpen(appel) {
  const dateLimite =
    appel?.dateLimiteDepot ??
    appel?.date_limite_depot;

  if (!dateLimite) return true;

  const limit = new Date(dateLimite);

  return (
    !Number.isNaN(limit.getTime()) &&
    limit.getTime() > Date.now()
  );
}

function getFileExtension(filename) {
  return String(filename || "")
    .split(".")
    .pop()
    .toLowerCase();
}

/* =====================================================
   PAGE SOUMISSIONNAIRE
===================================================== */

export default function SoumissionnairePage() {
  const [session, setSession] = useState(null);

  const [appels, setAppels] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [criteres, setCriteres] = useState([]);

  const [mesOffres, setMesOffres] = useState([]);

  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingOffres, setLoadingOffres] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("TOUS");

  const [activeTab, setActiveTab] = useState("appels");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [showDeposit, setShowDeposit] = useState(false);

  const [montant, setMontant] = useState("");
  const [filesByPiece, setFilesByPiece] = useState({});

  const [notice, setNotice] = useState({
    type: "",
    message: "",
  });

  /* =====================================================
     CHARGER LES APPELS D'OFFRES
  ===================================================== */

  const loadAppels = useCallback(async () => {
    setLoading(true);
    setNotice({ type: "", message: "" });

    try {
      const [sessionData, appelsData] = await Promise.all([
        apiRequest("/api/auth/session"),

        apiRequest(
          "/api/appel-offres/soumissionnaire/publications"
        ),
      ]);

      if (
        sessionData?.role &&
        sessionData.role !== "SOUMISSIONNAIRE"
      ) {
        throw new Error(
          "Cette page est réservée au rôle SOUMISSIONNAIRE."
        );
      }

      setSession(sessionData);

      const liste = Array.isArray(appelsData)
        ? appelsData
        : [];

      setAppels(
        liste.filter(
          (appel) =>
            String(appel?.statut || "").toUpperCase() ===
              "PUBLIE" &&
            isAppelOpen(appel)
        )
      );
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error.message ||
          "Impossible de charger les appels d'offres.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /* =====================================================
     CHARGER MES DEPOTS
  ===================================================== */

  const loadMesOffres = useCallback(async () => {
    setLoadingOffres(true);

    try {
      const data = await apiRequest(
        "/api/offres/mes-offres"
      );

      setMesOffres(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      setMesOffres([]);

      setNotice({
        type: "error",
        message:
          error.message ||
          "Impossible de charger vos dépôts.",
      });
    } finally {
      setLoadingOffres(false);
    }
  }, []);

  /* =====================================================
     CHARGEMENT INITIAL
  ===================================================== */

  useEffect(() => {
    loadAppels();
  }, [loadAppels]);

  /* =====================================================
     RECHERCHE ET FILTRE
  ===================================================== */

  const filteredAppels = useMemo(() => {
    const term = search.trim().toLowerCase();

    return appels.filter((appel) => {
      const matchesSearch =
        !term ||
        [
          appel.reference,
          appel.objet,
          appel.description,
          appel.lieuExecution,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term)
        );

      const type = String(
        appel.typeMarche || ""
      ).toUpperCase();

      const matchesType =
        typeFilter === "TOUS" ||
        type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [appels, search, typeFilter]);

  /* =====================================================
     CONSULTER UN APPEL D'OFFRES
  ===================================================== */

  async function openDetail(appel) {
    const id = getAppelId(appel);

    if (!id) {
      setNotice({
        type: "error",
        message:
          "Identifiant de l'appel d'offres introuvable.",
      });

      return;
    }

    setDetailLoading(true);
    setNotice({ type: "", message: "" });

    try {
      const detail = await apiRequest(
        `/api/appel-offres/soumissionnaire/publications/${id}`
      );

      const [piecesData, criteresData] =
        await Promise.all([
          apiRequest(
            `/api/pieces-requises/appel-offre/${id}`
          ),

          apiRequest(
            "/api/appel-offre-criteres"
          ).catch(() => []),
        ]);

      const listePieces = Array.isArray(piecesData)
        ? piecesData
        : [];

      // Vérifier que les pièces reçues correspondent
      // bien à l'appel d'offres sélectionné.
      const piecesCorrectes = listePieces.filter((piece) => {
        const pieceAppelId =
          piece?.appelOffre?.idAppelOffre ??
          piece?.appelOffre?.id_appel_offre ??
          piece?.idAppelOffre ??
          piece?.id_appel_offre;

        // Si le backend ne retourne pas la relation,
        // on conserve les résultats de la route filtrée.
        if (pieceAppelId == null) return true;

        return Number(pieceAppelId) === Number(id);
      });

      setSelected(detail);

      setPieces(piecesCorrectes);

      const listeCriteres = Array.isArray(criteresData)
        ? criteresData
        : [];

      setCriteres(
        listeCriteres.filter((row) => {
          const appelId =
            row?.appelOffre?.idAppelOffre ??
            row?.appelOffre?.id_appel_offre ??
            row?.appelOffre?.id;

          return Number(appelId) === Number(id);
        })
      );

      setFilesByPiece({});
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error.message ||
          "Impossible de consulter cet appel d'offres.",
      });
    } finally {
      setDetailLoading(false);
    }
  }

  /* =====================================================
     OUVRIR LA FENETRE DE DEPOT
  ===================================================== */

  function openDeposit() {
    if (!selected) {
      setNotice({
        type: "error",
        message:
          "Veuillez d'abord sélectionner un appel d'offres.",
      });

      return;
    }

    if (!isAppelOpen(selected)) {
      setNotice({
        type: "error",
        message:
          "La date limite de dépôt est dépassée.",
      });

      return;
    }

    setMontant("");
    setFilesByPiece({});
    setNotice({ type: "", message: "" });

    setShowDeposit(true);
  }

  /* =====================================================
     ENVOYER UNE OFFRE AVEC DOCUMENTS
  ===================================================== */

  async function submitOffer(event) {
    event.preventDefault();

    if (submitting) return;

    if (!selected) {
      setNotice({
        type: "error",
        message: "Aucun appel d'offres sélectionné.",
      });

      return;
    }

    const appelId = Number(getAppelId(selected));

    if (!Number.isInteger(appelId) || appelId <= 0) {
      setNotice({
        type: "error",
        message: "Identifiant de l'appel d'offres invalide.",
      });

      return;
    }

    if (!isAppelOpen(selected)) {
      setNotice({
        type: "error",
        message: "La date limite de dépôt est dépassée.",
      });

      return;
    }

    const amount = Number(montant);

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({
        type: "error",
        message: "Saisis un montant supérieur à zéro.",
      });

      return;
    }

    // Vérifier les pièces et leurs identifiants.
    const idsDejaVus = new Set();

    for (const piece of pieces) {
      const pieceId = Number(getPieceId(piece));

      if (!Number.isInteger(pieceId) || pieceId <= 0) {
        setNotice({
          type: "error",
          message:
            "Une pièce justificative possède un identifiant invalide.",
        });

        return;
      }

      if (idsDejaVus.has(pieceId)) {
        setNotice({
          type: "error",
          message:
            "Une pièce justificative est présente plusieurs fois.",
        });

        return;
      }

      idsDejaVus.add(pieceId);

      const pieceAppelId =
        piece?.appelOffre?.idAppelOffre ??
        piece?.appelOffre?.id_appel_offre ??
        piece?.idAppelOffre ??
        piece?.id_appel_offre;

      if (
        pieceAppelId != null &&
        Number(pieceAppelId) !== appelId
      ) {
        setNotice({
          type: "error",
          message:
            `La pièce "${piece.nomPiece}" ne correspond pas à cet appel d'offres.`,
        });

        return;
      }
    }

    // Vérifier les pièces obligatoires.
    const missingPieces = pieces.filter((piece) => {
      const id = getPieceId(piece);

      return (
        piece.obligatoire === true &&
        !filesByPiece[id]
      );
    });

    if (missingPieces.length > 0) {
      setNotice({
        type: "error",
        message:
          "Ajoute les pièces obligatoires : " +
          missingPieces
            .map((piece) => piece.nomPiece)
            .join(", "),
      });

      return;
    }

    // Vérifier les fichiers.
    for (const piece of pieces) {
      const file = filesByPiece[getPieceId(piece)];

      if (!file) continue;

      const extension = getFileExtension(file.name);

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setNotice({
          type: "error",
          message:
            `Format non accepté pour ${piece.nomPiece}.`,
        });

        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setNotice({
          type: "error",
          message:
            `Le fichier ${file.name} dépasse la limite de 10 Mo.`,
        });

        return;
      }
    }

    // Construire les données multipart.
    const formData = new FormData();

    formData.append(
      "idAppelOffre",
      String(appelId)
    );

    formData.append(
      "montant",
      String(amount)
    );

    let nombreFichiers = 0;

    /*
     * IMPORTANT :
     * Chaque idsPieces correspond au fichier situé
     * à la même position dans fichiers.
     *
     * Exemple :
     * idsPieces = [1, 2]
     * fichiers  = [cv.pdf, nif.pdf]
     */

    for (const piece of pieces) {
      const pieceId = Number(getPieceId(piece));
      const file = filesByPiece[pieceId];

      if (file) {
        formData.append(
          "idsPieces",
          String(pieceId)
        );

        formData.append(
          "fichiers",
          file
        );

        nombreFichiers++;
      }
    }

    if (nombreFichiers === 0 && pieces.some(
      (piece) => piece.obligatoire === true
    )) {
      setNotice({
        type: "error",
        message:
          "Aucun document obligatoire n'a été sélectionné.",
      });

      return;
    }

    setSubmitting(true);
    setNotice({ type: "", message: "" });

    try {
      /*
       * Une seule requête envoie :
       * - idAppelOffre
       * - montant
       * - idsPieces
       * - fichiers
       *
       * Le backend enregistre l'offre,
       * les documents et l'accusé de réception.
       */

      const created = await apiRequest(
        "/api/offres/deposer",
        {
          method: "POST",
          body: formData,
        }
      );

      const createdId = getOffreId(created);

      if (!created || !createdId) {
        throw new Error(
          "Le backend n'a pas retourné l'identifiant de l'offre créée."
        );
      }

      const accuse = getAccuse(created);

      setShowDeposit(false);
      setMontant("");
      setFilesByPiece({});

      setNotice({
        type: "success",
        message:
          "Votre offre a été déposée avec succès. Accusé de réception : " +
          accuse,
      });

      // Actualiser l'historique.
      await loadMesOffres();

      // Afficher directement l'historique.
      setActiveTab("mes-offres");
      setSelected(null);

    } catch (error) {
      console.error(
        "Erreur lors du dépôt de l'offre :",
        error
      );

      setNotice({
        type: "error",
        message:
          error.message ||
          "Le dépôt de l'offre et des documents a échoué.",
      });
    } finally {
      setSubmitting(false);
    }
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
      console.error(
        "Erreur de déconnexion :",
        error
      );
    } finally {
      window.location.href = "/";
    }
  }

  /* =====================================================
     RETOUR A LA LISTE
  ===================================================== */

  function returnToList() {
    setSelected(null);
    setShowDeposit(false);

    setPieces([]);
    setCriteres([]);
    setFilesByPiece({});
  }

  /* =====================================================
     AFFICHAGE
  ===================================================== */

  return (
    <main className="soumissionnaire-page">

      {/* SIDEBAR */}

      <aside
        className={`soumissionnaire-sidebar ${
          mobileMenu ? "is-open" : ""
        }`}
      >

        <div className="soumissionnaire-brand">

          <div className="soumissionnaire-brand-mark">
            <Building2 size={24} />
          </div>

          <div>
            <strong>SPAT</strong>
            <span>Gestion des marchés</span>
          </div>

          <button
            className="sq-icon mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Fermer le menu"
          >
            <X size={19} />
          </button>

        </div>

        <div className="sidebar-caption">
          ESPACE SOUMISSIONNAIRE
        </div>

        <button
          className={`side-link ${
            activeTab === "appels" ? "active" : ""
          }`}
          onClick={() => {
            setActiveTab("appels");
            returnToList();
            setMobileMenu(false);
          }}
        >
          <FileText size={18} />
          Appels d'offres
        </button>

        <button
          className={`side-link ${
            activeTab === "mes-offres" ? "active" : ""
          }`}
          onClick={() => {
            setActiveTab("mes-offres");
            setSelected(null);
            setShowDeposit(false);
            setMobileMenu(false);
            loadMesOffres();
          }}
        >
          <FileCheck2 size={18} />
          Mes dépôts
        </button>

        <div className="sidebar-bottom">

          <div className="profile-mini">

            <div className="profile-avatar">
              {(session?.nomComplet || "S")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {session?.nomComplet || "Soumissionnaire"}
              </strong>

              <span>
                {session?.matricule || "Compte connecté"}
              </span>
            </div>

          </div>

          <button
            className="side-link logout-link"
            onClick={logout}
          >
            <LogOut size={18} />
            Déconnexion
          </button>

        </div>

      </aside>

      {/* CONTENU PRINCIPAL */}

      <section className="soumissionnaire-main">

        <header className="soumissionnaire-topbar">

          <button
            className="sq-icon mobile-menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={21} />
          </button>

          <div>
            <span className="topbar-eyebrow">
              PORT DE TOAMASINA
            </span>

            <h1>Espace soumissionnaire</h1>
          </div>

          <button
            className="refresh-button"
            onClick={() => {
              if (activeTab === "appels") {
                loadAppels();
              } else {
                loadMesOffres();
              }
            }}
            disabled={loading || loadingOffres}
          >
            <RefreshCw
              size={16}
              className={
                loading || loadingOffres ? "spin" : ""
              }
            />

            Actualiser
          </button>

        </header>

        {/* NOTIFICATIONS */}

        {notice.message && (
          <div className={`notice notice-${notice.type}`}>

            <span>
              {notice.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
            </span>

            <p>{notice.message}</p>

            <button
              onClick={() =>
                setNotice({
                  type: "",
                  message: "",
                })
              }
              aria-label="Fermer"
            >
              <X size={16} />
            </button>

          </div>
        )}

        {/* ==========================================
            ONGLET APPELS D'OFFRES
        ========================================== */}

        {activeTab === "appels" && !selected && (
          <>

            <section className="welcome-panel">

              <div>

                <span className="welcome-tag">
                  ESPACE DE SOUMISSION
                </span>

                <h2>
                  Les opportunités de marchés
                </h2>

                <p>
                  Consulte les appels d'offres publiés
                  par le Responsable des marchés et
                  prépare ton dossier de soumission.
                </p>

              </div>

              <div className="welcome-illustration">
                <ClipboardList size={66} />
              </div>

            </section>

            <div className="stats-row">

              <div className="stat-card">

                <div className="stat-icon blue">
                  <FileText size={20} />
                </div>

                <div>
                  <span>Appels ouverts</span>
                  <strong>{appels.length}</strong>
                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon green">
                  <Clock3 size={20} />
                </div>

                <div>
                  <span>Résultats affichés</span>
                  <strong>{filteredAppels.length}</strong>
                </div>

              </div>

            </div>

            <section className="listing-section">

              <div className="section-heading">

                <div>
                  <h2>
                    Appels d'offres disponibles
                  </h2>

                  <p>
                    Seuls les appels publiés dont la
                    date limite n'est pas dépassée
                    sont affichés.
                  </p>
                </div>

              </div>

              <div className="filter-bar">

                <div className="search-field">

                  <Search size={18} />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Rechercher par référence, objet, lieu..."
                  />

                </div>

                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value)
                  }
                >
                  <option value="TOUS">
                    Tous les types
                  </option>

                  <option value="FOURNITURE">
                    Fourniture
                  </option>

                  <option value="SERVICE">
                    Service
                  </option>

                </select>

              </div>

              {loading ? (

                <div className="loading-state">
                  <span className="loader" />
                  Chargement des appels d'offres...
                </div>

              ) : filteredAppels.length === 0 ? (

                <div className="empty-state">

                  <div>
                    <FileText size={30} />
                  </div>

                  <h3>
                    Aucun appel d'offres disponible
                  </h3>

                  <p>
                    Aucun appel publié ne correspond
                    à ta recherche pour le moment.
                  </p>

                </div>

              ) : (

                <div className="appel-grid">

                  {filteredAppels.map((appel) => (

                    <article
                      className="appel-card"
                      key={getAppelId(appel)}
                    >

                      <div className="appel-card-top">

                        <span className="status-pill open">
                          <span />
                          Publié
                        </span>

                        <span className="appel-type">
                          {appel.typeMarche || "Marché"}
                        </span>

                      </div>

                      <div className="appel-reference">
                        {appel.reference ||
                          `AO-${getAppelId(appel)}`}
                      </div>

                      <h3>
                        {appel.objet ||
                          "Appel d'offres sans objet"}
                      </h3>

                      <p className="appel-description">
                        {appel.description ||
                          "Aucune description disponible."}
                      </p>

                      <div className="appel-meta">

                        <span>
                          <CalendarDays size={15} />
                          Limite :{" "}
                          {formatDate(
                            appel.dateLimiteDepot ??
                            appel.date_limite_depot
                          )}
                        </span>

                        <span>
                          <MapPin size={15} />
                          {appel.lieuExecution ||
                            "Lieu non précisé"}
                        </span>

                      </div>

                      <div className="appel-card-footer">

                        <span className="estimated-amount">
                          {formatMoney(
                            appel.montantEstime
                          )}
                        </span>

                        <button
                          className="primary-button small"
                          onClick={() => openDetail(appel)}
                          disabled={detailLoading}
                        >
                          Consulter
                          <ChevronRight size={16} />
                        </button>

                      </div>

                    </article>

                  ))}

                </div>

              )}

            </section>

          </>
        )}

        {/* ==========================================
            DETAIL APPEL D'OFFRES
        ========================================== */}

        {activeTab === "appels" && selected && (

          <section className="detail-view">

            <button
              className="back-link"
              onClick={returnToList}
            >
              <ChevronRight size={17} />
              Retour aux appels d'offres
            </button>

            <div className="detail-hero">

              <div>

                <span className="status-pill open">
                  <span />
                  Publié
                </span>

                <div className="detail-reference">
                  {selected.reference}
                </div>

                <h2>{selected.objet}</h2>

                <p>
                  {selected.description ||
                    "Aucune description renseignée."}
                </p>

              </div>

              <div className="detail-code">
                <FileText size={32} />
                <span>APPEL D'OFFRES</span>
              </div>

            </div>

            <div className="detail-facts">

              <div>
                <span>Type de marché</span>
                <strong>
                  {selected.typeMarche || "—"}
                </strong>
              </div>

              <div>
                <span>Montant estimé</span>
                <strong>
                  {formatMoney(selected.montantEstime)}
                </strong>
              </div>

              <div>
                <span>Lieu d'exécution</span>
                <strong>
                  {selected.lieuExecution || "—"}
                </strong>
              </div>

              <div>
                <span>Date limite de dépôt</span>
                <strong>
                  {formatDate(
                    selected.dateLimiteDepot ??
                    selected.date_limite_depot
                  )}
                </strong>
              </div>

            </div>

            <div className="detail-columns">

              {/* PIECES REQUISES */}

              <div className="detail-panel">

                <div className="panel-title">
                  <FileCheck2 size={19} />
                  <h3>Pièces requises</h3>
                </div>

                {pieces.length > 0 ? (

                  <ul className="required-list">

                    {pieces.map((piece) => (

                      <li key={getPieceId(piece)}>

                        <span className="document-icon">
                          <FileText size={17} />
                        </span>

                        <span className="document-name">

                          <strong>
                            {piece.nomPiece}
                          </strong>

                          <small>
                            {piece.description ||
                              "Document justificatif"}
                          </small>

                        </span>

                        <span
                          className={
                            piece.obligatoire
                              ? "required-tag"
                              : "optional-tag"
                          }
                        >
                          {piece.obligatoire
                            ? "Obligatoire"
                            : "Facultative"}
                        </span>

                      </li>

                    ))}

                  </ul>

                ) : (

                  <p className="muted-text">
                    Aucune pièce requise n'a été
                    renseignée pour cet appel.
                  </p>

                )}

              </div>

              {/* CRITERES */}

              <div className="detail-panel">

                <div className="panel-title">
                  <ClipboardList size={19} />
                  <h3>Critères d'évaluation</h3>
                </div>

                {criteres.length > 0 ? (

                  <ul className="criteria-list">

                    {criteres.map((row, index) => {

                      const critere =
                        row.critere ||
                        row.critereEvaluation ||
                        row;

                      return (

                        <li
                          key={
                            row.idAppelOffreCritere ||
                            getCritereId(row) ||
                            index
                          }
                        >

                          <span>

                            <strong>
                              {critere.nomCritere || "Critère"}
                            </strong>

                            <small>
                              {critere.description || ""}
                            </small>

                          </span>

                          <b>
                            {row.ponderation ??
                              critere.ponderation ??
                              0}
                            %
                          </b>

                        </li>

                      );

                    })}

                  </ul>

                ) : (

                  <p className="muted-text">
                    Les critères détaillés ne sont
                    pas disponibles pour cet appel
                    d'offres.
                  </p>

                )}

              </div>

            </div>

            <div className="detail-actions">

              <div>
                <strong>
                  Prêt à soumettre ton offre ?
                </strong>

                <span>
                  Vérifie les conditions et prépare
                  les documents requis.
                </span>
              </div>

              <button
                className="primary-button"
                onClick={openDeposit}
                disabled={!isAppelOpen(selected)}
              >
                <Send size={17} />
                Déposer une offre
              </button>

            </div>

          </section>

        )}

        {/* ==========================================
            MES DEPOTS
        ========================================== */}

        {activeTab === "mes-offres" && (

          <section className="listing-section deposits-section">

            <div className="section-heading">

              <div>
                <h2>Suivi de mes dépôts</h2>

                <p>
                  Consulte les offres que tu as
                  déposées avec ton compte.
                </p>
              </div>

              <button
                className="refresh-button"
                onClick={loadMesOffres}
                disabled={loadingOffres}
              >
                <RefreshCw
                  size={16}
                  className={
                    loadingOffres ? "spin" : ""
                  }
                />

                Actualiser
              </button>

            </div>

            {loadingOffres ? (

              <div className="loading-state">
                <span className="loader" />
                Chargement de tes dépôts...
              </div>

            ) : mesOffres.length === 0 ? (

              <div className="empty-state">

                <div>
                  <FileCheck2 size={30} />
                </div>

                <h3>Aucun dépôt effectué</h3>

                <p>
                  Les offres que tu enverras
                  apparaîtront ici.
                </p>

                <button
                  className="secondary-button"
                  onClick={() => {
                    setActiveTab("appels");
                    returnToList();
                  }}
                >
                  Voir les appels d'offres
                </button>

              </div>

            ) : (

              <div className="appel-grid">

                {mesOffres.map((offre) => {

                  const appel = getAppelFromOffre(offre);

                  return (

                    <article
                      className="appel-card"
                      key={getOffreId(offre)}
                    >

                      <div className="appel-card-top">

                        <span className="status-pill open">
                          <span />
                          {offre.statut || "Déposée"}
                        </span>

                        <span className="appel-type">
                          Offre envoyée
                        </span>

                      </div>

                      <div className="appel-reference">
                        {appel?.reference || "Appel d'offres"}
                      </div>

                      <h3>
                        {appel?.objet || "Mon offre"}
                      </h3>

                      <div className="appel-meta">

                        <span>
                          <CalendarDays size={15} />
                          Dépôt : {formatDate(getDateDepot(offre))}
                        </span>

                        <span>
                          <Receipt size={15} />
                          Accusé : {getAccuse(offre)}
                        </span>

                      </div>

                      <div className="appel-card-footer">

                        <span className="estimated-amount">
                          {formatMoney(offre.montant)}
                        </span>

                        <span className="status-pill open">
                          {offre.statut || "DEPOSEE"}
                        </span>

                      </div>

                    </article>

                  );

                })}

              </div>

            )}

          </section>

        )}

      </section>

      {/* ==========================================
          MODAL DEPOT OFFRE
      ========================================== */}

      {showDeposit && selected && (

        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submitting
            ) {
              setShowDeposit(false);
            }
          }}
        >

          <section
            className="deposit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deposit-title"
          >

            <header>

              <div>

                <span className="modal-eyebrow">
                  SOUMISSION ÉLECTRONIQUE
                </span>

                <h2 id="deposit-title">
                  Déposer une offre
                </h2>

                <p>
                  {selected.reference} — {selected.objet}
                </p>

              </div>

              <button
                type="button"
                className="sq-icon"
                onClick={() => {
                  if (!submitting) {
                    setShowDeposit(false);
                  }
                }}
                aria-label="Fermer"
                disabled={submitting}
              >
                <X size={20} />
              </button>

            </header>

            <form onSubmit={submitOffer}>

              {/* MONTANT FINANCIER */}

              <label className="form-label">

                Montant proposé (Ar) <em>*</em>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={montant}
                  onChange={(event) =>
                    setMontant(event.target.value)
                  }
                  placeholder="Ex. 25000000"
                  required
                  disabled={submitting}
                />

              </label>

              {/* DOCUMENTS JUSTIFICATIFS */}

              <div className="upload-section">

                <div className="upload-heading">
                  <Upload size={18} />

                  <strong>
                    Documents justificatifs
                  </strong>

                </div>

                <p>
                  Formats acceptés : PDF, DOC, DOCX,
                  XLS, XLSX, JPG et PNG.
                  Taille maximale : 10 Mo par fichier.
                </p>

                {pieces.length > 0 ? (

                  pieces.map((piece) => {

                    const pieceId = getPieceId(piece);

                    const selectedFile =
                      filesByPiece[pieceId];

                    return (

                      <label
                        className="file-upload-row"
                        key={pieceId}
                      >

                        <span>

                          <strong>
                            {piece.nomPiece}
                          </strong>

                          <small>
                            {piece.obligatoire
                              ? "Obligatoire"
                              : "Facultative"}
                          </small>

                        </span>

                        <span className="file-control">

                          {selectedFile ? (

                            <>
                              <CheckCircle2 size={16} />
                              {selectedFile.name}
                            </>

                          ) : (

                            <>
                              <Upload size={16} />
                              Choisir
                            </>

                          )}

                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            disabled={submitting}
                            onChange={(event) => {

                              const file =
                                event.target.files?.[0] ||
                                null;

                              if (file) {
                                const extension =
                                  getFileExtension(file.name);

                                if (
                                  !ALLOWED_EXTENSIONS.includes(extension)
                                ) {
                                  setNotice({
                                    type: "error",
                                    message:
                                      "Format de fichier non accepté.",
                                  });

                                  event.target.value = "";
                                  return;
                                }

                                if (file.size > MAX_FILE_SIZE) {
                                  setNotice({
                                    type: "error",
                                    message:
                                      "Le fichier dépasse la limite de 10 Mo.",
                                  });

                                  event.target.value = "";
                                  return;
                                }
                              }

                              setFilesByPiece((previous) => ({
                                ...previous,
                                [pieceId]: file,
                              }));

                            }}
                          />

                        </span>

                      </label>

                    );

                  })

                ) : (

                  <div className="no-files">
                    Aucune pièce requise n'a été définie.
                  </div>

                )}

              </div>

              {/* AVERTISSEMENT */}

              <div className="deposit-warning">

                <AlertCircle size={17} />

                <span>
                  Vérifie le montant et les documents
                  avant d'envoyer ton offre. Après
                  validation, un accusé de réception
                  horodaté sera généré par le serveur.
                </span>

              </div>

              {/* BOUTONS */}

              <footer>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowDeposit(false)}
                  disabled={submitting}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                >

                  {submitting ? (

                    "Envoi en cours..."

                  ) : (

                    <>
                      <Send size={16} />
                      Envoyer l'offre
                    </>

                  )}

                </button>

              </footer>

            </form>

          </section>

        </div>

      )}

    </main>
  );
}
