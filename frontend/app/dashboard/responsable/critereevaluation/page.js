"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ChartNoAxesCombined,
  Megaphone,
  ClipboardList,
  Search,
  Plus,
  Trash2,
  Save,
  LogOut,
  Menu,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Filter,
  Eye,
  Target,
} from "lucide-react";

import "../../../css/responsable.css";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const TOTAL_POINTS = 20;
const THEME_KEY = "spat-responsable-theme";

const MENU = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "appels", label: "Appels d'offres", icon: FileText },
  { id: "publication", label: "Publication", icon: Megaphone },
  { id: "rapports", label: "Rapports", icon: ChartNoAxesCombined },
  {
    id: "critereevaluation",
    label: "Critères d'évaluation",
    icon: ClipboardList,
  },
];

const FORM_VIDE = {
  nomCritere: "",
  description: "",
  ponderation: "",
};

/* =========================================================
   FONCTIONS API
========================================================= */

async function apiFetch(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Impossible de contacter le backend. Vérifiez que Spring Boot fonctionne sur le port 8080."
    );
  }

  const raw = response.status === 204 ? "" : await response.text();

  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
    }

    if (response.status === 403) {
      throw new Error(
        "Accès refusé. Seul le Responsable des marchés peut effectuer cette action."
      );
    }

    throw new Error(
      data?.message ||
        data?.detail ||
        data?.error ||
        `Erreur serveur (${response.status}).`
    );
  }

  return data;
}

function extraireListe(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function statutDe(appel) {
  return String(appel?.statut || "").toUpperCase();
}

function idAppelDuCritere(critere) {
  return Number(
    critere?.idAppelOffre ??
      critere?.appelOffre?.idAppelOffre ??
      critere?.id_appel_offre
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPoints(value) {
  return Number(value || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  });
}

/* =========================================================
   STYLES
========================================================= */

const PAGE_CSS = `
.cr-page {
  --cr-card:#fff;
  --cr-line:#e3e9f3;
  --cr-text:#14213d;
  --cr-soft:#64748b;
  --cr-bg:#f5f8fd;
  --cr-track:#e8edf5;
  color:var(--cr-text);
}

.cr-page.dark {
  --cr-card:#151d30;
  --cr-line:#26324a;
  --cr-text:#e8eefb;
  --cr-soft:#93a1bd;
  --cr-bg:#1b2540;
  --cr-track:#26324a;
}

.cr-info {
  display:flex;
  align-items:flex-start;
  gap:12px;
  padding:15px;
  margin-bottom:18px;
  border-radius:12px;
  background:var(--cr-bg);
  border:1px solid var(--cr-line);
  color:var(--cr-text);
  font-size:13.5px;
  line-height:1.6;
}

.cr-info svg {
  flex:none;
  color:#1768e5;
}

.cr-chip {
  display:inline-flex;
  padding:4px 10px;
  border-radius:30px;
  font-size:12px;
  font-weight:700;
}

.cr-chip.ok {
  background:#dcfce7;
  color:#15803d;
}

.cr-chip.warn {
  background:#fef3c7;
  color:#b45309;
}

.cr-chip.todo {
  background:#fee2e2;
  color:#b91c1c;
}

.cr-gauge {
  min-width:150px;
}

.cr-gauge-head {
  display:flex;
  justify-content:space-between;
  gap:10px;
  margin-bottom:6px;
  font-size:12.5px;
  color:var(--cr-text);
}

.cr-gauge-head span {
  color:var(--cr-soft);
}

.cr-track {
  height:8px;
  background:var(--cr-track);
  border-radius:30px;
  overflow:hidden;
}

.cr-fill {
  height:100%;
  border-radius:30px;
  transition:width .25s;
}

.cr-expand {
  width:34px;
  height:34px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:1px solid var(--cr-line);
  border-radius:8px;
  background:var(--cr-card);
  color:var(--cr-text);
  cursor:pointer;
}

.cr-expand.open svg {
  transform:rotate(180deg);
}

.cr-actions {
  display:flex;
  gap:8px;
  align-items:center;
  justify-content:flex-end;
  flex-wrap:wrap;
}

.cr-btn {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  border:0;
  border-radius:9px;
  padding:9px 13px;
  font-size:13px;
  font-weight:700;
  cursor:pointer;
}

.cr-btn.primary {
  background:#1768e5;
  color:white;
}

.cr-btn.secondary {
  background:var(--cr-bg);
  color:var(--cr-text);
  border:1px solid var(--cr-line);
}

.cr-btn.danger {
  background:#fee2e2;
  color:#b91c1c;
}

.cr-btn:disabled {
  opacity:.5;
  cursor:not-allowed;
}

.cr-detail {
  padding:18px;
  background:var(--cr-bg);
}

.cr-detail-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(250px,1fr));
  gap:12px;
}

.cr-criterion {
  padding:15px;
  border:1px solid var(--cr-line);
  border-radius:12px;
  background:var(--cr-card);
}

.cr-criterion-top {
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:10px;
}

.cr-criterion-name {
  display:flex;
  gap:10px;
  align-items:flex-start;
  min-width:0;
}

.cr-number {
  flex:none;
  width:27px;
  height:27px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:50%;
  background:#1768e5;
  color:white;
  font-size:12px;
  font-weight:700;
}

.cr-criterion strong {
  color:var(--cr-text);
  font-size:14px;
}

.cr-criterion p {
  margin:5px 0 0;
  color:var(--cr-soft);
  font-size:12.5px;
  line-height:1.5;
}

.cr-points {
  flex:none;
  padding:4px 9px;
  border-radius:8px;
  background:#e6efff;
  color:#1768e5;
  font-weight:800;
  font-size:13px;
}

.cr-detail-footer {
  display:flex;
  justify-content:space-between;
  flex-wrap:wrap;
  gap:10px;
  margin-top:15px;
  color:var(--cr-soft);
  font-size:13px;
}

.cr-detail-footer strong {
  color:var(--cr-text);
}

.cr-empty {
  padding:17px;
  border:1px dashed var(--cr-line);
  border-radius:10px;
  background:var(--cr-card);
  color:var(--cr-soft);
  font-size:13px;
}

.cr-modal-content {
  padding:18px;
}

.cr-modal-appel {
  padding:14px;
  margin-bottom:16px;
  border:1px solid var(--cr-line);
  border-radius:12px;
  background:var(--cr-bg);
}

.cr-modal-appel b {
  color:#1768e5;
  font-size:12px;
}

.cr-modal-appel h3 {
  margin:5px 0;
  color:var(--cr-text);
  font-size:16px;
}

.cr-modal-appel span {
  color:var(--cr-soft);
  font-size:12px;
}

.cr-form-grid {
  display:grid;
  grid-template-columns:minmax(0,1fr) 180px;
  gap:14px;
}

.cr-field label {
  display:block;
  margin-bottom:6px;
  color:var(--cr-soft);
  font-size:13px;
  font-weight:700;
}

.cr-field input,
.cr-field textarea {
  width:100%;
  box-sizing:border-box;
  padding:11px 12px;
  border:1px solid var(--cr-line);
  border-radius:9px;
  background:var(--cr-card);
  color:var(--cr-text);
  font:inherit;
  font-size:14px;
}

.cr-field textarea {
  resize:vertical;
}

.cr-field.full {
  grid-column:1/-1;
}

.cr-field small {
  display:block;
  margin-top:5px;
  color:var(--cr-soft);
  font-size:12px;
}

.cr-modal-error,
.cr-modal-success {
  display:flex;
  gap:9px;
  align-items:flex-start;
  padding:11px 13px;
  margin-bottom:14px;
  border-radius:9px;
  font-size:13px;
}

.cr-modal-error {
  background:#fee2e2;
  color:#b91c1c;
}

.cr-modal-success {
  background:#dcfce7;
  color:#15803d;
}

.cr-modal-error svg,
.cr-modal-success svg {
  flex:none;
}

.cr-modal-actions {
  display:flex;
  justify-content:flex-end;
  gap:10px;
  margin-top:16px;
  flex-wrap:wrap;
}

.cr-modal-total {
  margin:14px 0;
  padding:12px;
  border-radius:10px;
  background:var(--cr-bg);
  color:var(--cr-text);
  font-size:13px;
}

.cr-spin {
  animation:crspin 1s linear infinite;
}

@keyframes crspin {
  to { transform:rotate(360deg); }
}

@media(max-width:720px) {
  .cr-form-grid {
    grid-template-columns:1fr;
  }
}
`;

/* =========================================================
   PAGE PRINCIPALE
========================================================= */

export default function CritereEvaluationPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appels, setAppels] = useState([]);
  const [liens, setLiens] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState("");
  const [ouverts, setOuverts] = useState({});

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [maintenant, setMaintenant] = useState(null);

  const [appelModal, setAppelModal] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  /* -------------------------------------------------------
     THEME
  ------------------------------------------------------- */

  useEffect(() => {
    setMaintenant(new Date());

    try {
      const saved = localStorage.getItem(THEME_KEY);

      if (saved === "dark" || saved === "light") {
        setTheme(saved);
      }
    } catch {}
  }, []);

  const changerTheme = () => {
    setTheme((previous) => {
      const next = previous === "light" ? "dark" : "light";

      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}

      return next;
    });
  };

  /* -------------------------------------------------------
     CHARGEMENT DES DONNEES BACKEND
  ------------------------------------------------------- */

  const chargerDonnees = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        // Vérification de la session Responsable
        const session = await apiFetch("/api/auth/session");

        if (session?.role !== "RESPONSABLE_MARCHES") {
          router.replace("/");
          return;
        }

        setUser(session);

        // Chargement des appels d'offres et des critères enregistrés
        const [appelsData, criteresData] = await Promise.all([
          apiFetch("/api/appel-offres"),
          apiFetch("/api/appel-offre-criteres"),
        ]);

        setAppels(extraireListe(appelsData));
        setLiens(extraireListe(criteresData));
      } catch (err) {
        setError(err.message || "Erreur lors du chargement des données.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    chargerDonnees(true);
  }, [chargerDonnees]);

  /* -------------------------------------------------------
     FILTRER LES APPELS PUBLIES UNIQUEMENT
  ------------------------------------------------------- */

  const appelsPublies = useMemo(() => {
    return appels
      .filter((appel) => statutDe(appel) === "PUBLIE")
      .sort(
        (a, b) =>
          Number(b.idAppelOffre) - Number(a.idAppelOffre)
      );
  }, [appels]);

  /* -------------------------------------------------------
     REGROUPER LES CRITERES PAR APPEL D'OFFRES
  ------------------------------------------------------- */

  const criteresParAppel = useMemo(() => {
    const resultat = new Map();

    liens.forEach((critere) => {
      const id = idAppelDuCritere(critere);

      if (!Number.isFinite(id)) return;

      if (!resultat.has(id)) {
        resultat.set(id, []);
      }

      resultat.get(id).push(critere);
    });

    return resultat;
  }, [liens]);

  const obtenirGrille = useCallback(
    (appel) => {
      const id = Number(appel.idAppelOffre);
      const liste = criteresParAppel.get(id) || [];

      const total = liste.reduce(
        (somme, critere) =>
          somme + Number(critere.ponderation || 0),
        0
      );

      let etat = "todo";

      if (liste.length > 0) {
        etat =
          Math.abs(total - TOTAL_POINTS) < 0.005
            ? "ok"
            : "warn";
      }

      return { liste, total, etat };
    },
    [criteresParAppel]
  );

  /* -------------------------------------------------------
     STATISTIQUES
  ------------------------------------------------------- */

  const stats = useMemo(() => {
    let completes = 0;
    let incompletes = 0;
    let sansCritere = 0;

    appelsPublies.forEach((appel) => {
      const grille = obtenirGrille(appel);

      if (grille.etat === "ok") completes++;
      else if (grille.etat === "warn") incompletes++;
      else sansCritere++;
    });

    return {
      total: appelsPublies.length,
      completes,
      incompletes,
      sansCritere,
    };
  }, [appelsPublies, obtenirGrille]);

  const appelsFiltres = useMemo(() => {
    const q = search.trim().toLowerCase();

    return appelsPublies.filter((appel) => {
      const texte = [
        appel.reference,
        appel.objet,
        appel.lieuExecution,
      ]
        .join(" ")
        .toLowerCase();

      const grille = obtenirGrille(appel);

      return (
        (!q || texte.includes(q)) &&
        (!filtre || grille.etat === filtre)
      );
    });
  }, [appelsPublies, search, filtre, obtenirGrille]);

  /* -------------------------------------------------------
     MODAL
  ------------------------------------------------------- */

  const ouvrirModal = (appel) => {
    setAppelModal(appel);
    setForm(FORM_VIDE);
    setModalError("");
    setModalSuccess("");
  };

  const fermerModal = () => {
    if (saving || deletingId) return;

    setAppelModal(null);
    setForm(FORM_VIDE);
    setModalError("");
    setModalSuccess("");
  };

  const grilleModal = appelModal
    ? obtenirGrille(appelModal)
    : { liste: [], total: 0, etat: "todo" };

  const pointsDisponibles = Math.max(
    0,
    TOTAL_POINTS - grilleModal.total
  );

  const modifierChamp = (champ, valeur) => {
    setForm((previous) => ({
      ...previous,
      [champ]: valeur,
    }));
  };

  /* -------------------------------------------------------
     CREER UN CRITERE
     POST /api/appel-offre-criteres/creer
  ------------------------------------------------------- */

  const enregistrerCritere = async (event) => {
    event.preventDefault();

    if (!appelModal || saving) return;

    setModalError("");
    setModalSuccess("");

    const nom = form.nomCritere.trim();
    const description = form.description.trim();
    const ponderation = Number(form.ponderation);

    if (!nom) {
      setModalError("Le nom du critère est obligatoire.");
      return;
    }

    if (
      !Number.isFinite(ponderation) ||
      ponderation <= 0 ||
      ponderation > TOTAL_POINTS
    ) {
      setModalError(
        "La pondération doit être supérieure à 0 et inférieure ou égale à 20."
      );
      return;
    }

    if (ponderation > pointsDisponibles + 0.0001) {
      setModalError(
        `Il ne reste que ${formatPoints(pointsDisponibles)} point(s) disponible(s) pour cet appel d'offres.`
      );
      return;
    }

    setSaving(true);

    try {
      const donnees = {
        idAppelOffre: Number(appelModal.idAppelOffre),
        nomCritere: nom,
        description,
        ponderation,
      };

      // Endpoint du contrôleur backend corrigé
      await apiFetch("/api/appel-offre-criteres/creer", {
        method: "POST",
        body: JSON.stringify(donnees),
      });

      // Recharger les données depuis la base de données
      const criteresData = await apiFetch(
        "/api/appel-offre-criteres"
      );

      const nouvelleListe = extraireListe(criteresData);

      setLiens(nouvelleListe);
      setForm(FORM_VIDE);

      setModalSuccess(
        `Le critère « ${nom} » a été enregistré avec succès.`
      );

      setSuccess(
        `Critère « ${nom} » enregistré dans l'appel d'offres ${appelModal.reference || ""}.`
      );

      // Ouvrir automatiquement la ligne de l'appel
      setOuverts((previous) => ({
        ...previous,
        [Number(appelModal.idAppelOffre)]: true,
      }));
    } catch (err) {
      setModalError(
        err.message || "Impossible d'enregistrer le critère."
      );
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------
     SUPPRIMER UN CRITERE
     DELETE /api/appel-offre-criteres/{id}
  ------------------------------------------------------- */

  const supprimerCritere = async (critere) => {
    if (deletingId || saving) return;

    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer le critère « ${critere.nomCritere} » ?`
    );

    if (!confirmation) return;

    setModalError("");
    setModalSuccess("");
    setDeletingId(critere.idAppelOffreCritere);

    try {
      await apiFetch(
        `/api/appel-offre-criteres/${critere.idAppelOffreCritere}`,
        {
          method: "DELETE",
        }
      );

      // Recharger les critères depuis le backend
      const criteresData = await apiFetch(
        "/api/appel-offre-criteres"
      );

      setLiens(extraireListe(criteresData));

      setModalSuccess(
        `Le critère « ${critere.nomCritere} » a été supprimé.`
      );
    } catch (err) {
      setModalError(
        err.message || "Impossible de supprimer le critère."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* -------------------------------------------------------
     NAVIGATION ET DECONNEXION
  ------------------------------------------------------- */

  const deconnexion = async () => {
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {}

    router.replace("/");
  };

  const allerVers = (id) => {
    setSidebarOpen(false);

    if (id === "critereevaluation") return;

    router.push("/dashboard/responsable");
  };

  /* -------------------------------------------------------
     AFFICHAGE CHARGEMENT
  ------------------------------------------------------- */

  if (loading) {
    return (
      <div className="resp-loading-screen">
        <div className="resp-loader"></div>
        <p>Chargement des critères d'évaluation...</p>
      </div>
    );
  }

  const couleurJauge = (etat) => {
    if (etat === "ok") return "#15803d";
    if (etat === "warn") return "#f59e0b";
    return "#cbd5e1";
  };

  const libelleEtat = {
    ok: "Grille complète",
    warn: "Grille incomplète",
    todo: "À définir",
  };

  /* =======================================================
     RENDU HTML
  ======================================================= */

  return (
    <div className={`resp-app cr-page ${theme === "dark" ? "dark" : ""}`}>
      <style>{PAGE_CSS}</style>

      {/* SIDEBAR */}

      <aside className={`resp-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="resp-brand">
          <div className="resp-brand-logo">
            <img
              src="/spat.png"
              alt="Logo SPAT"
              style={{
                width: 48,
                height: 48,
                objectFit: "contain",
              }}
            />
          </div>

          <div>
            <h2>SPAT</h2>
            <span>Port de Toamasina</span>
          </div>

          <button
            className="resp-close-sidebar"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            <X size={21} />
          </button>
        </div>

        <div className="resp-profile-mini">
          <div className="resp-avatar">
            {(user?.nomComplet || "R").charAt(0).toUpperCase()}
          </div>

          <div className="resp-profile-info">
            <strong>{user?.nomComplet || "Responsable"}</strong>
            <span>Responsable des marchés</span>
          </div>

          <span className="resp-online"></span>
        </div>

        <div className="resp-menu-title">MENU PRINCIPAL</div>

        <nav className="resp-navigation">
          {MENU.map((item) => {
            const Icon = item.icon;
            const actif = item.id === "critereevaluation";

            return (
              <button
                key={item.id}
                type="button"
                className={`resp-nav-item ${actif ? "active" : ""}`}
                onClick={() => allerVers(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {actif && (
                  <ChevronRight
                    size={17}
                    className="resp-nav-arrow"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="resp-sidebar-bottom">
          <div className="resp-sidebar-help">
            <strong>Besoin d'aide ?</strong>
            <p>
              Contactez votre administrateur SPAT pour toute assistance.
            </p>
          </div>

          <button
            className="resp-logout"
            onClick={deconnexion}
            type="button"
          >
            <LogOut size={19} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="resp-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* CONTENU PRINCIPAL */}

      <main className="resp-main">
        <header className="resp-header">
          <div className="resp-header-left">
            <button
              className="resp-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <Menu size={23} />
            </button>

            <div>
              <span className="resp-breadcrumb">
                SPAT <ChevronRight size={13} /> Responsable
              </span>

              <h1>Critères d'évaluation</h1>
            </div>
          </div>

          <div className="resp-header-right">
            <div className="resp-header-date">
              <CalendarDays size={16} />

              {maintenant
                ? maintenant.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </div>

            <button
              className="resp-icon-button"
              onClick={changerTheme}
              title="Changer le thème"
              type="button"
            >
              {theme === "light" ? (
                <Moon size={20} />
              ) : (
                <Sun size={20} />
              )}
            </button>

            <div className="resp-header-user">
              <div className="resp-avatar resp-avatar-small">
                {(user?.nomComplet || "R").charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{user?.nomComplet || "Responsable"}</strong>
                <span>Responsable des marchés</span>
              </div>
            </div>
          </div>
        </header>

        {/* ALERTES */}

        {error && (
          <div className="resp-alert resp-alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="resp-alert resp-alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="resp-content">
          <div className="resp-page-intro">
            <div>
              <h2>Grilles d'évaluation des appels publiés</h2>
              <p>
                Créez un ou plusieurs critères pour chaque appel
                d'offres publié. Le total doit être égal à 20 points.
              </p>
            </div>

            <button
              className="resp-refresh-button"
              type="button"
              onClick={() => chargerDonnees(false)}
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "cr-spin" : ""}
              />
              Actualiser
            </button>
          </div>

          {/* INFORMATION */}

          <div className="cr-info">
            <Target size={21} />

            <div>
              <strong>Répartition des points sur 20</strong>
              <br />
              Exemple : CV = 9 points, Fiche technique = 10 points,
              Délai d'exécution = 1 point. Total = 20/20.
              <br />
              Seuls les appels d'offres ayant le statut PUBLIE
              peuvent recevoir des critères.
            </div>
          </div>

          {/* STATISTIQUES */}

          <div className="resp-stats-grid">
            {[
              {
                c: "blue",
                icon: Megaphone,
                v: stats.total,
                l: "Appels publiés",
                f: "Appels pouvant recevoir des critères",
              },
              {
                c: "green",
                icon: CheckCircle2,
                v: stats.completes,
                l: "Grilles complètes",
                f: "Total égal à 20 points",
              },
              {
                c: "orange",
                icon: ClipboardList,
                v: stats.incompletes,
                l: "Grilles incomplètes",
                f: "Total inférieur à 20 points",
              },
              {
                c: "red",
                icon: Target,
                v: stats.sansCritere,
                l: "Sans critère",
                f: "Critères à créer",
              },
            ].map(({ c, icon: Icon, v, l, f }) => (
              <div className={`resp-stat-card ${c}`} key={l}>
                <div className="resp-stat-top">
                  <div className="resp-stat-icon">
                    <Icon size={23} />
                  </div>
                </div>

                <div className="resp-stat-value">{v}</div>
                <div className="resp-stat-label">{l}</div>
                <div className="resp-stat-footer">{f}</div>
              </div>
            ))}
          </div>

          {/* RECHERCHE */}

          <div className="resp-filter-panel">
            <div className="resp-search-box">
              <Search size={19} />

              <input
                type="search"
                placeholder="Rechercher par référence, objet, lieu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="resp-select-filter">
              <Filter size={17} />

              <select
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
              >
                <option value="">Toutes les grilles</option>
                <option value="todo">À définir</option>
                <option value="warn">Incomplètes</option>
                <option value="ok">Complètes</option>
              </select>
            </div>
          </div>

          {/* TABLEAU DES APPELS PUBLIES */}

          <div className="resp-table-panel resp-panel">
            <div className="resp-panel-header">
              <div>
                <h3>Appels d'offres publiés</h3>
                <p>
                  {appelsFiltres.length} appel(s) d'offres trouvé(s)
                </p>
              </div>
            </div>

            <div className="resp-table-scroll">
              <table className="resp-table">
                <thead>
                  <tr>
                    <th style={{ width: 52 }}></th>
                    <th>Référence</th>
                    <th>Objet</th>
                    <th>Date limite</th>
                    <th>Grille d'évaluation</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {appelsFiltres.map((appel) => {
                    const id = Number(appel.idAppelOffre);
                    const grille = obtenirGrille(appel);
                    const ouvert = !!ouverts[id];

                    return (
                      <Fragment key={id}>
                        <tr>
                          <td>
                            <button
                              type="button"
                              className={`cr-expand ${ouvert ? "open" : ""}`}
                              onClick={() =>
                                setOuverts((previous) => ({
                                  ...previous,
                                  [id]: !previous[id],
                                }))
                              }
                              title="Afficher les critères"
                            >
                              <ChevronDown size={17} />
                            </button>
                          </td>

                          <td className="resp-reference">
                            {appel.reference || `AO-${id}`}
                          </td>

                          <td className="resp-object-cell">
                            <strong>{appel.objet}</strong>
                            <span>
                              {appel.lieuExecution || "Lieu non renseigné"}
                            </span>
                          </td>

                          <td>{formatDate(appel.dateLimiteDepot)}</td>

                          <td>
                            <div className="cr-gauge">
                              <div className="cr-gauge-head">
                                <strong>
                                  {formatPoints(grille.total)} / 20 pts
                                </strong>
                                <span>
                                  {grille.liste.length} critère(s)
                                </span>
                              </div>

                              <div className="cr-track">
                                <div
                                  className="cr-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (grille.total / TOTAL_POINTS) * 100
                                    )}%`,
                                    background: couleurJauge(grille.etat),
                                  }}
                                />
                              </div>

                              <span
                                className={`cr-chip ${grille.etat}`}
                                style={{ marginTop: 8 }}
                              >
                                {libelleEtat[grille.etat]}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="cr-actions">
                              <button
                                type="button"
                                className="cr-btn secondary"
                                title="Afficher les critères"
                                onClick={() =>
                                  setOuverts((previous) => ({
                                    ...previous,
                                    [id]: true,
                                  }))
                                }
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                type="button"
                                className="cr-btn primary"
                                onClick={() => ouvrirModal(appel)}
                              >
                                <Plus size={15} />
                                Ajouter un critère
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* DETAIL DES CRITERES */}

                        {ouvert && (
                          <tr>
                            <td colSpan="6" className="cr-detail">
                              <h4 className="cr-section-title">
                                <ClipboardList size={18} />
                                Critères de{" "}
                                {appel.reference || `AO-${id}`}
                              </h4>

                              {grille.liste.length === 0 ? (
                                <div className="cr-empty">
                                  Aucun critère enregistré pour cet appel
                                  d'offres. Cliquez sur « Ajouter un
                                  critère ».
                                </div>
                              ) : (
                                <>
                                  <div className="cr-detail-grid">
                                    {grille.liste.map((critere, index) => (
                                      <div
                                        className="cr-criterion"
                                        key={critere.idAppelOffreCritere}
                                      >
                                        <div className="cr-criterion-top">
                                          <div className="cr-criterion-name">
                                            <span className="cr-number">
                                              {index + 1}
                                            </span>

                                            <div>
                                              <strong>
                                                {critere.nomCritere ||
                                                  "Critère sans nom"}
                                              </strong>

                                              {critere.descriptionCritere && (
                                                <p>
                                                  {critere.descriptionCritere}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <span className="cr-points">
                                            {formatPoints(
                                              critere.ponderation
                                            )}{" "}
                                            pts
                                          </span>
                                        </div>

                                        <div
                                          className="cr-actions"
                                          style={{ marginTop: 12 }}
                                        >
                                          <button
                                            type="button"
                                            className="cr-btn danger"
                                            disabled={
                                              deletingId !== null ||
                                              saving
                                            }
                                            onClick={() =>
                                              supprimerCritere(critere)
                                            }
                                          >
                                            {deletingId ===
                                            critere.idAppelOffreCritere ? (
                                              <RefreshCw
                                                size={14}
                                                className="cr-spin"
                                              />
                                            ) : (
                                              <Trash2 size={14} />
                                            )}
                                            Supprimer
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="cr-detail-footer">
                                    <span>
                                      Les points sont répartis entre les
                                      critères de cet appel d'offres.
                                    </span>

                                    <strong>
                                      Total : {formatPoints(grille.total)} /
                                      20 points
                                    </strong>
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}

                  {appelsFiltres.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="resp-empty-table"
                      >
                        {appelsPublies.length === 0
                          ? "Aucun appel d'offres publié. Publiez d'abord un appel d'offres."
                          : "Aucun résultat trouvé."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="resp-footer">
          <span>
            © {maintenant ? maintenant.getFullYear() : ""} SPAT -
            Port de Toamasina
          </span>
          <span>Plateforme de gestion des appels d'offres</span>
        </footer>
      </main>

      {/* ===================================================
          MODAL CREATION CRITERE
      =================================================== */}

      {appelModal && (
        <div
          className="resp-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fermerModal();
          }}
        >
          <div
            className="resp-modal resp-large-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="resp-modal-header">
              <div>
                <span className="resp-modal-kicker">
                  GRILLE D'ÉVALUATION
                </span>

                <h2>Ajouter un critère d'évaluation</h2>

                <p>
                  Ajoutez les critères et répartissez les points sur
                  un total de 20.
                </p>
              </div>

              <button
                className="resp-modal-close"
                type="button"
                onClick={fermerModal}
                disabled={saving || deletingId !== null}
              >
                <X size={21} />
              </button>
            </div>

            <div className="cr-modal-content">
              {/* APPEL SELECTIONNE */}

              <div className="cr-modal-appel">
                <b>
                  {appelModal.reference ||
                    `AO-${appelModal.idAppelOffre}`}
                </b>

                <h3>{appelModal.objet}</h3>

                <span>
                  Date limite : {formatDate(appelModal.dateLimiteDepot)}
                </span>

                <div className="cr-modal-total">
                  <div className="cr-gauge-head">
                    <strong>
                      {formatPoints(grilleModal.total)} / 20 points
                      utilisés
                    </strong>

                    <span>
                      {formatPoints(pointsDisponibles)} point(s)
                      disponible(s)
                    </span>
                  </div>

                  <div className="cr-track">
                    <div
                      className="cr-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          (grilleModal.total / TOTAL_POINTS) * 100
                        )}%`,
                        background: couleurJauge(grilleModal.etat),
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* MESSAGES */}

              {modalError && (
                <div className="cr-modal-error" role="alert">
                  <AlertTriangle size={17} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="cr-modal-success" role="status">
                  <CheckCircle2 size={17} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* FORMULAIRE */}

              {pointsDisponibles > 0.005 ? (
                <form onSubmit={enregistrerCritere}>
                  <div className="cr-form-grid">
                    <div className="cr-field">
                      <label htmlFor="nomCritere">
                        Nom du critère *
                      </label>

                      <input
                        id="nomCritere"
                        type="text"
                        value={form.nomCritere}
                        onChange={(e) =>
                          modifierChamp("nomCritere", e.target.value)
                        }
                        placeholder="Ex. CV, Fiche technique..."
                        maxLength={150}
                        required
                        disabled={saving}
                      />
                    </div>

                    <div className="cr-field">
                      <label htmlFor="ponderation">
                        Points attribués *
                      </label>

                      <input
                        id="ponderation"
                        type="number"
                        min="0.01"
                        max={pointsDisponibles}
                        step="0.01"
                        value={form.ponderation}
                        onChange={(e) =>
                          modifierChamp("ponderation", e.target.value)
                        }
                        placeholder="Ex. 9"
                        required
                        disabled={saving}
                      />

                      <small>
                        Maximum disponible :{" "}
                        {formatPoints(pointsDisponibles)} points
                      </small>
                    </div>

                    <div className="cr-field full">
                      <label htmlFor="descriptionCritere">
                        Description du critère
                      </label>

                      <textarea
                        id="descriptionCritere"
                        rows={3}
                        value={form.description}
                        onChange={(e) =>
                          modifierChamp("description", e.target.value)
                        }
                        placeholder="Description ou indications pour l'évaluateur..."
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="cr-modal-actions">
                    <button
                      type="button"
                      className="cr-btn secondary"
                      onClick={() => {
                        setForm(FORM_VIDE);
                        setModalError("");
                        setModalSuccess("");
                      }}
                      disabled={saving}
                    >
                      Effacer
                    </button>

                    <button
                      type="submit"
                      className="cr-btn primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <RefreshCw
                            size={16}
                            className="cr-spin"
                          />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Enregistrer le critère
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="cr-modal-success">
                  <CheckCircle2 size={18} />
                  <span>
                    Le total de 20 points est atteint. La grille
                    d'évaluation est complète.
                  </span>
                </div>
              )}

              {/* LISTE DES CRITERES DEJA ENREGISTRES */}

              <h3 className="cr-section-title">
                <ClipboardList size={18} />
                Critères enregistrés
                <span>{grilleModal.liste.length}</span>
              </h3>

              {grilleModal.liste.length === 0 ? (
                <div className="cr-empty">
                  Aucun critère enregistré pour le moment.
                </div>
              ) : (
                <div className="cr-detail-grid">
                  {grilleModal.liste.map((critere, index) => (
                    <div
                      className="cr-criterion"
                      key={critere.idAppelOffreCritere}
                    >
                      <div className="cr-criterion-top">
                        <div className="cr-criterion-name">
                          <span className="cr-number">
                            {index + 1}
                          </span>

                          <div>
                            <strong>{critere.nomCritere}</strong>

                            {critere.descriptionCritere && (
                              <p>{critere.descriptionCritere}</p>
                            )}
                          </div>
                        </div>

                        <span className="cr-points">
                          {formatPoints(critere.ponderation)} pts
                        </span>
                      </div>

                      <div
                        className="cr-actions"
                        style={{ marginTop: 12 }}
                      >
                        <button
                          type="button"
                          className="cr-btn danger"
                          disabled={saving || deletingId !== null}
                          onClick={() => supprimerCritere(critere)}
                        >
                          {deletingId ===
                          critere.idAppelOffreCritere ? (
                            <RefreshCw
                              size={14}
                              className="cr-spin"
                            />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="cr-detail-footer">
                <strong>
                  Total : {formatPoints(grilleModal.total)} / 20
                  points
                </strong>

                <span>
                  {grilleModal.etat === "ok"
                    ? "Grille complète"
                    : "Grille en cours de création"}
                </span>
              </div>

              <div className="resp-modal-actions">
                <button
                  type="button"
                  className="resp-primary-button"
                  onClick={fermerModal}
                  disabled={saving || deletingId !== null}
                >
                  <CheckCircle2 size={18} />
                  Terminer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}