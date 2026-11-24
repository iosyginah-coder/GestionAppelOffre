"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ChartNoAxesCombined,
  Megaphone,
  ClipboardList,
  Inbox,
  Search,
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
  Download,
  Trophy,
  Medal,
  UserRound,
  Building2,
  Send,
  Clock,
} from "lucide-react";

import "../../../css/responsable.css";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const THEME_KEY = "spat-responsable-theme";
const TOTAL_POINTS = 20;

/* Endpoints du ResponsableClassementController (backend) :
   - GET  /api/classements/responsable                       -> listes transmises par l'évaluateur
   - POST /api/classements/responsable/appel/{id}/publier    -> publier les retenus d'un appel */
const RECUS_URL = "/api/classements/responsable";
const publierUrl = (idAppel) => `${RECUS_URL}/appel/${idAppel}/publier`;

const MENU = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "appels", label: "Appels d'offres", icon: FileText },
  { id: "publication", label: "Publication", icon: Megaphone },
  {
    id: "critereevaluation",
    label: "Critères d'évaluation",
    icon: ClipboardList,
  },
  { id: "listetransmise", label: "Listes transmises", icon: Inbox },
  { id: "rapports", label: "Rapports", icon: ChartNoAxesCombined },
];

const ROUTES = {
  critereevaluation: "/dashboard/responsable/critereevaluation",
  listetransmise: "/dashboard/responsable/listetransmise",
};

/* =========================================================
   API
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
    let message;

    if (response.status === 401) {
      message = "Votre session a expiré. Veuillez vous reconnecter.";
    } else if (response.status === 403) {
      message =
        "Accès refusé. Seul le Responsable des marchés peut effectuer cette action.";
    } else {
      message =
        data?.message ||
        data?.detail ||
        data?.error ||
        `Erreur serveur (${response.status}).`;
    }

    const erreur = new Error(message);
    erreur.status = response.status;
    throw erreur;
  }

  return data;
}

/* =========================================================
   UTILITAIRES
========================================================= */

function extraireListe(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function versDate(value) {
  if (!value) return null;

  // Spring peut sérialiser une LocalDateTime sous forme de tableau [a, m, j, h, min, s]
  const date = Array.isArray(value)
    ? new Date(
        value[0],
        (value[1] || 1) - 1,
        value[2] || 1,
        value[3] || 0,
        value[4] || 0,
        value[5] || 0
      )
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = versDate(value);
  if (!date) return "—";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateHeure(value) {
  const date = versDate(value);
  if (!date) return "—";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nombreOuNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatNote(value) {
  const n = nombreOuNull(value);
  if (n === null) return "—";

  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function libelleType(type) {
  const t = String(type || "").toUpperCase();
  if (!t) return "—";
  return t === "FOURNISSEUR" ? "Entreprise" : "Personne physique";
}

function libelleStatutAppel(statut) {
  const labels = {
    BROUILLON: "Brouillon",
    PUBLIE: "Publié",
    CLOTURE: "Clôturé",
    ATTRIBUE: "Attribué",
    ANNULE: "Annulé",
  };

  const s = String(statut || "").toUpperCase();
  return labels[s] || statut || "";
}

/* Transforme la réponse du backend en groupes prêts à afficher.
   Format reçu :
   [{ idAppelOffre, reference, objet, publie,
      soumissionnaires: [{ idOffre, nom, rang, note, decision,
                           typeSoumissionnaire?, dateTransmission?, evaluateur? }] }] */
function normaliserGroupes(data, appelsParId) {
  return extraireListe(data)
    .filter((g) => g && typeof g === "object")
    .map((g) => {
      const id = Number(g.idAppelOffre);
      const appel = appelsParId.get(id) || null;

      const soumissionnaires = (
        Array.isArray(g.soumissionnaires) ? g.soumissionnaires : []
      )
        .map((s) => ({
          idOffre: s.idOffre,
          nom: s.nom || (s.idOffre != null ? `Offre n° ${s.idOffre}` : "Soumissionnaire"),
          rang: nombreOuNull(s.rang),
          note: nombreOuNull(s.note),
          publie: String(s.decision || "").toUpperCase() === "PUBLIE",
          type: s.typeSoumissionnaire || "",
          dateTransmission: s.dateTransmission || null,
          evaluateur: s.evaluateur || "",
        }))
        .sort((a, b) => {
          const ra = a.rang ?? Number.MAX_SAFE_INTEGER;
          const rb = b.rang ?? Number.MAX_SAFE_INTEGER;
          if (ra !== rb) return ra - rb;
          return (b.note ?? -1) - (a.note ?? -1);
        });

      let derniere = null;
      let evaluateur = "";

      soumissionnaires.forEach((s) => {
        const d = versDate(s.dateTransmission);
        if (d && (!derniere || d > derniere)) derniere = d;
        if (!evaluateur && s.evaluateur) evaluateur = s.evaluateur;
      });

      const nbPublies = soumissionnaires.filter((s) => s.publie).length;

      return {
        id,
        reference: g.reference || appel?.reference || `AO-${id}`,
        objet: g.objet || appel?.objet || "Appel d'offres",
        lieu: appel?.lieuExecution || "",
        statutAppel: appel?.statut || "",
        dateLimite: appel?.dateLimiteDepot || null,
        soumissionnaires,
        nbPublies,
        // « publie » vaut true seulement si TOUS les retenus sont publiés
        publie: Boolean(g.publie) && soumissionnaires.length > 0,
        resteAPublier: soumissionnaires.length - nbPublies,
        derniereTransmission: derniere,
        evaluateur,
      };
    })
    .filter((g) => Number.isFinite(g.id))
    .sort((a, b) => {
      if (a.publie !== b.publie) return a.publie ? 1 : -1;
      return b.id - a.id;
    });
}

function telechargerCSV(groupe) {
  const lignes = [
    ["Référence", "Objet", "Rang", "Soumissionnaire", "Type", "Note /20", "État", "Date de transmission"],
    ...groupe.soumissionnaires.map((s) => [
      groupe.reference,
      groupe.objet,
      s.rang ?? "",
      s.nom,
      s.type ? libelleType(s.type) : "",
      s.note !== null ? formatNote(s.note) : "",
      s.publie ? "Publié" : "En attente de publication",
      s.dateTransmission ? formatDateHeure(s.dateTransmission) : "",
    ]),
  ];

  const csv = lignes
    .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");

  lien.href = url;
  lien.download = `liste-transmise-${String(groupe.reference).replace(/[^\w-]+/g, "_")}.csv`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);

  URL.revokeObjectURL(url);
}

/* =========================================================
   PAGE
========================================================= */

export default function ListeTransmisePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appels, setAppels] = useState([]);
  const [brut, setBrut] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publication, setPublication] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filtreAppel, setFiltreAppel] = useState("");
  const [filtreEtat, setFiltreEtat] = useState("");
  const [fermes, setFermes] = useState({});

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [maintenant, setMaintenant] = useState(null);

  /* ---------- Thème ---------- */

  useEffect(() => {
    setMaintenant(new Date());

    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") setTheme(saved);
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

  /* ---------- Chargement ---------- */

  const chargerDonnees = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        const session = await apiFetch("/api/auth/session");

        if (session?.role !== "RESPONSABLE_MARCHES") {
          router.replace("/");
          return;
        }

        setUser(session);

        const [recusData, appelsData] = await Promise.all([
          apiFetch(RECUS_URL),
          // Les détails des appels (lieu, statut, date limite) sont facultatifs
          apiFetch("/api/appel-offres").catch(() => []),
        ]);

        setBrut(extraireListe(recusData));
        setAppels(extraireListe(appelsData));
      } catch (err) {
        if (err?.status === 401) {
          router.replace("/");
          return;
        }

        setError(err.message || "Erreur lors du chargement des listes transmises.");
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

  useEffect(() => {
    if (!success) return undefined;

    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  /* ---------- Données dérivées ---------- */

  const appelsParId = useMemo(() => {
    const map = new Map();

    appels.forEach((a) => {
      const id = Number(a?.idAppelOffre);
      if (Number.isFinite(id)) map.set(id, a);
    });

    return map;
  }, [appels]);

  const groupes = useMemo(
    () => normaliserGroupes(brut, appelsParId),
    [brut, appelsParId]
  );

  const groupesFiltres = useMemo(() => {
    const q = search.trim().toLowerCase();

    return groupes
      .filter((g) => !filtreAppel || String(g.id) === filtreAppel)
      .filter((g) => {
        if (filtreEtat === "attente") return !g.publie;
        if (filtreEtat === "publie") return g.publie;
        return true;
      })
      .map((g) => {
        if (!q) return g;

        const texteAppel = `${g.reference} ${g.objet} ${g.lieu}`.toLowerCase();

        // Si la recherche correspond à l'appel, on garde toute sa liste ;
        // sinon on ne garde que les soumissionnaires correspondants.
        if (texteAppel.includes(q)) return g;

        const correspondants = g.soumissionnaires.filter((s) =>
          s.nom.toLowerCase().includes(q)
        );

        return correspondants.length > 0
          ? { ...g, soumissionnaires: correspondants }
          : null;
      })
      .filter(Boolean);
  }, [groupes, search, filtreAppel, filtreEtat]);

  const stats = useMemo(() => {
    const total = groupes.reduce((n, g) => n + g.soumissionnaires.length, 0);
    const publies = groupes.filter((g) => g.publie).length;

    return {
      appels: groupes.length,
      soumissionnaires: total,
      enAttente: groupes.length - publies,
      publies,
    };
  }, [groupes]);

  /* ---------- Publication d'un appel ---------- */

  const publierAppel = async (g) => {
    if (publication !== null || g.publie) return;

    const ok = window.confirm(
      `Publier le résultat de ${g.reference} ?\n\n${g.resteAPublier} soumissionnaire(s) retenu(s) par l'évaluateur seront publiés.`
    );

    if (!ok) return;

    setPublication(g.id);
    setError("");
    setSuccess("");

    try {
      const res = await apiFetch(publierUrl(g.id), { method: "POST" });

      setSuccess(
        res?.message || `Le résultat de ${g.reference} a été publié.`
      );

      await chargerDonnees(false);
    } catch (err) {
      if (err?.status === 401) {
        router.replace("/");
        return;
      }

      setError(err.message || "Publication impossible.");
    } finally {
      setPublication(null);
    }
  };

  /* ---------- Navigation ---------- */

  const allerVers = (id) => {
    setSidebarOpen(false);

    if (id === "listetransmise") return;

    router.push(ROUTES[id] || "/dashboard/responsable");
  };

  const deconnexion = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}

    router.replace("/");
  };

  /* ---------- Rendu ---------- */

  if (loading) {
    return (
      <div className="resp-loading-screen">
        <div className="resp-loader"></div>
        <p>Chargement des listes transmises...</p>
      </div>
    );
  }

  const annee = maintenant ? maintenant.getFullYear() : "";

  return (
    <div className={`resp-app lt-page ${theme === "dark" ? "dark" : ""}`}>
      <style>{PAGE_CSS}</style>

      {/* SIDEBAR */}

      <aside className={`resp-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="resp-brand">
          <div className="resp-brand-logo">
            <img
              src="/spat.png"
              alt="Logo SPAT"
              style={{ width: 48, height: 48, objectFit: "contain" }}
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
            const actif = item.id === "listetransmise";

            return (
              <button
                key={item.id}
                type="button"
                className={`resp-nav-item ${actif ? "active" : ""}`}
                onClick={() => allerVers(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {item.id === "listetransmise" && stats.enAttente > 0 && (
                  <span className="rx-badge-count">{stats.enAttente}</span>
                )}

                {actif && <ChevronRight size={17} className="resp-nav-arrow" />}
              </button>
            );
          })}
        </nav>

        <div className="resp-sidebar-bottom">
          <div className="resp-sidebar-help">
            <strong>Besoin d'aide ?</strong>
            <p>Contactez votre administrateur SPAT pour toute assistance.</p>
          </div>

          <button className="resp-logout" onClick={deconnexion} type="button">
            <LogOut size={19} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="resp-overlay" onClick={() => setSidebarOpen(false)} />
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

              <h1>Listes transmises</h1>
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
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
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

            <button type="button" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="resp-alert resp-alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>

            <button type="button" onClick={() => setSuccess("")}>
              <X size={17} />
            </button>
          </div>
        )}

        <section className="resp-content">
          <div className="resp-page-intro">
            <div>
              <h2>Listes transmises par l'évaluateur</h2>
              <p>
                Pour chaque appel d'offres, retrouvez les soumissionnaires
                classés et retenus par l'évaluateur, puis publiez le résultat.
              </p>
            </div>

            <button
              className="resp-refresh-button"
              type="button"
              onClick={() => chargerDonnees(false)}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "lt-spin" : ""} />
              Actualiser
            </button>
          </div>

          {/* STATISTIQUES */}

          <div className="resp-stats-grid">
            {[
              {
                c: "blue",
                icon: Inbox,
                v: stats.appels,
                l: "Appels d'offres reçus",
                f: "Listes transmises par l'évaluateur",
              },
              {
                c: "green",
                icon: Trophy,
                v: stats.soumissionnaires,
                l: "Soumissionnaires retenus",
                f: "Toutes listes confondues",
              },
              {
                c: "orange",
                icon: Clock,
                v: stats.enAttente,
                l: "À publier",
                f: "Appels en attente de votre décision",
              },
              {
                c: "purple",
                icon: CheckCircle2,
                v: stats.publies,
                l: "Résultats publiés",
                f: "Appels dont la liste est publiée",
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

          {/* RECHERCHE + FILTRES */}

          <div className="resp-filter-panel">
            <div className="resp-search-box">
              <Search size={19} />

              <input
                type="search"
                placeholder="Rechercher par référence, objet, soumissionnaire..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="resp-select-filter">
              <Filter size={17} />

              <select
                value={filtreAppel}
                onChange={(e) => setFiltreAppel(e.target.value)}
              >
                <option value="">Tous les appels d'offres</option>

                {groupes.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.reference} — {g.objet}
                  </option>
                ))}
              </select>
            </div>

            <div className="resp-select-filter">
              <Filter size={17} />

              <select
                value={filtreEtat}
                onChange={(e) => setFiltreEtat(e.target.value)}
              >
                <option value="">Tous les états</option>
                <option value="attente">À publier</option>
                <option value="publie">Publiés</option>
              </select>
            </div>
          </div>

          {/* LISTES PAR APPEL D'OFFRES */}

          {groupesFiltres.length === 0 ? (
            <div className="resp-panel">
              <div className="lt-empty-state">
                <Inbox size={40} />

                <strong>
                  {groupes.length === 0
                    ? "Aucune liste transmise pour le moment"
                    : "Aucun résultat trouvé"}
                </strong>

                <p>
                  {groupes.length === 0
                    ? "Dès que l'évaluateur transmettra la sélection d'un appel d'offres, elle apparaîtra ici."
                    : "Modifiez votre recherche ou vos filtres."}
                </p>
              </div>
            </div>
          ) : (
            groupesFiltres.map((g) => {
              const ouvert = !fermes[g.id];
              const enCours = publication === g.id;

              return (
                <div className="resp-panel lt-group" key={g.id}>
                  <div className="lt-group-head">
                    <button
                      type="button"
                      className={`lt-expand ${ouvert ? "open" : ""}`}
                      onClick={() =>
                        setFermes((previous) => ({
                          ...previous,
                          [g.id]: !previous[g.id],
                        }))
                      }
                      title={ouvert ? "Masquer la liste" : "Afficher la liste"}
                    >
                      <ChevronDown size={17} />
                    </button>

                    <div className="lt-group-title">
                      <div className="lt-group-ref">
                        <span className="resp-reference">{g.reference}</span>

                        {g.statutAppel && (
                          <span className="lt-chip neutral">
                            {libelleStatutAppel(g.statutAppel)}
                          </span>
                        )}

                        {g.publie ? (
                          <span className="lt-chip ok">
                            <CheckCircle2 size={13} />
                            Résultat publié
                          </span>
                        ) : (
                          <span className="lt-chip warn">
                            <Clock size={13} />
                            À publier
                          </span>
                        )}
                      </div>

                      <h3>{g.objet}</h3>

                      <div className="lt-group-meta">
                        {g.lieu && (
                          <span>
                            <Building2 size={14} />
                            {g.lieu}
                          </span>
                        )}

                        {g.dateLimite && (
                          <span>
                            <CalendarDays size={14} />
                            Limite : {formatDate(g.dateLimite)}
                          </span>
                        )}

                        {g.derniereTransmission && (
                          <span>
                            <Send size={14} />
                            Transmise le{" "}
                            {formatDateHeure(g.derniereTransmission)}
                          </span>
                        )}

                        {g.evaluateur && (
                          <span>
                            <UserRound size={14} />
                            {g.evaluateur}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="lt-group-side">
                      <span className="lt-count">
                        {g.soumissionnaires.length} soumissionnaire(s)
                      </span>

                      <button
                        type="button"
                        className="lt-btn secondary"
                        onClick={() => telechargerCSV(g)}
                      >
                        <Download size={15} />
                        Exporter
                      </button>

                      {!g.publie && (
                        <button
                          type="button"
                          className="lt-btn primary"
                          disabled={publication !== null}
                          onClick={() => publierAppel(g)}
                        >
                          {enCours ? (
                            <RefreshCw size={15} className="lt-spin" />
                          ) : (
                            <Megaphone size={15} />
                          )}
                          Publier le résultat
                        </button>
                      )}
                    </div>
                  </div>

                  {ouvert && (
                    <div className="resp-table-scroll">
                      <table className="resp-table">
                        <thead>
                          <tr>
                            <th>Soumissionnaire</th>
                            <th>Type</th>
                            <th>Note pondérée</th>
                            <th>État</th>
                          </tr>
                        </thead>

                        <tbody>
                          {g.soumissionnaires.map((s) => {
                            const pourcentage =
                              s.note !== null
                                ? Math.max(
                                    0,
                                    Math.min(100, (s.note / TOTAL_POINTS) * 100)
                                  )
                                : 0;

                            return (
                              <tr key={`${g.id}-${s.idOffre ?? s.nom}`}>
        

                                <td className="resp-object-cell">
                                  <strong>{s.nom}</strong>
                                  {s.idOffre != null && (
                                    <span>Offre n° {s.idOffre}</span>
                                  )}
                                </td>

                                <td>{libelleType(s.type)}</td>

                                <td>
                                  <div className="lt-gauge">
                                    <div className="lt-gauge-head">
                                      <strong>
                                        {s.note !== null
                                          ? `${formatNote(s.note)} / ${TOTAL_POINTS}`
                                          : "—"}
                                      </strong>
                                    </div>

                                    <div className="lt-track">
                                      <div
                                        className="lt-fill"
                                        style={{ width: `${pourcentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  {s.publie ? (
                                    <span className="lt-chip ok">Publié</span>
                                  ) : (
                                    <span className="lt-chip warn">
                                      En attente
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        <footer className="resp-footer">
          <span>© {annee} SPAT - Port de Toamasina</span>
          <span>Plateforme de gestion des appels d'offres</span>
        </footer>
      </main>
    </div>
  );
}

/* =========================================================
   STYLES DE LA PAGE
========================================================= */

const PAGE_CSS = `
.lt-page {
  --lt-card:#fff;
  --lt-line:#e3e9f3;
  --lt-text:#14213d;
  --lt-soft:#64748b;
  --lt-bg:#f5f8fd;
  --lt-track:#e8edf5;
  color:var(--lt-text);
}

.lt-page.dark {
  --lt-card:#151d30;
  --lt-line:#26324a;
  --lt-text:#e8eefb;
  --lt-soft:#93a1bd;
  --lt-bg:#1b2540;
  --lt-track:#26324a;
}

.lt-group {
  margin-bottom:18px;
  overflow:hidden;
}

.lt-group-head {
  display:flex;
  align-items:flex-start;
  gap:14px;
  padding:18px;
  border-bottom:1px solid var(--lt-line);
  flex-wrap:wrap;
}

.lt-group-title {
  flex:1;
  min-width:220px;
}

.lt-group-title h3 {
  margin:8px 0 6px;
  font-size:16px;
  color:var(--lt-text);
}

.lt-group-ref {
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}

.lt-group-meta {
  display:flex;
  flex-wrap:wrap;
  gap:6px 16px;
  color:var(--lt-soft);
  font-size:12.5px;
}

.lt-group-meta span {
  display:inline-flex;
  align-items:center;
  gap:6px;
}

.lt-group-side {
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

.lt-count {
  padding:5px 11px;
  border-radius:30px;
  background:#e6efff;
  color:#1768e5;
  font-size:12.5px;
  font-weight:800;
}

.lt-expand {
  flex:none;
  width:34px;
  height:34px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:1px solid var(--lt-line);
  border-radius:8px;
  background:var(--lt-card);
  color:var(--lt-text);
  cursor:pointer;
}

.lt-expand svg {
  transition:transform .2s;
  transform:rotate(-90deg);
}

.lt-expand.open svg {
  transform:rotate(0deg);
}

.lt-chip {
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:4px 10px;
  border-radius:30px;
  font-size:12px;
  font-weight:700;
}

.lt-chip.ok {
  background:#dcfce7;
  color:#15803d;
}

.lt-chip.warn {
  background:#fef3c7;
  color:#b45309;
}

.lt-chip.neutral {
  background:var(--lt-bg);
  color:var(--lt-soft);
  border:1px solid var(--lt-line);
}

.lt-btn {
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

.lt-btn.primary {
  background:#1768e5;
  color:white;
}

.lt-btn.secondary {
  background:var(--lt-bg);
  color:var(--lt-text);
  border:1px solid var(--lt-line);
}

.lt-btn:disabled {
  opacity:.5;
  cursor:not-allowed;
}

.lt-rank {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:5px;
  min-width:40px;
  padding:5px 10px;
  border-radius:30px;
  background:var(--lt-bg);
  border:1px solid var(--lt-line);
  color:var(--lt-text);
  font-weight:800;
  font-size:13px;
}

.lt-rank.top1 {
  background:#fef3c7;
  border-color:#f5d97a;
  color:#b45309;
}

.lt-rank.top2 {
  background:#e8edf5;
  border-color:#cbd5e1;
  color:#475569;
}

.lt-rank.top3 {
  background:#ffedd5;
  border-color:#fdba74;
  color:#c2410c;
}

.lt-gauge {
  min-width:150px;
}

.lt-gauge-head {
  margin-bottom:6px;
  font-size:12.5px;
  color:var(--lt-text);
}

.lt-track {
  height:8px;
  background:var(--lt-track);
  border-radius:30px;
  overflow:hidden;
}

.lt-fill {
  height:100%;
  border-radius:30px;
  background:#1768e5;
  transition:width .25s;
}

.lt-empty-state {
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:8px;
  padding:44px 20px;
  text-align:center;
  color:var(--lt-soft);
}

.lt-empty-state strong {
  color:var(--lt-text);
  font-size:16px;
}

.lt-empty-state p {
  margin:0;
  max-width:420px;
  font-size:13.5px;
  line-height:1.6;
}

.lt-spin {
  animation:ltspin 1s linear infinite;
}

@keyframes ltspin {
  to { transform:rotate(360deg); }
}
`;