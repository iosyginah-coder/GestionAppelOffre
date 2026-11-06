"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, FolderKanban, ChartNoAxesCombined, Bell, Search,
  Plus, Pencil, Trash2, Eye, LogOut, Menu, X, RefreshCw, CheckCircle2, Clock,
  AlertTriangle, Ban, FileCheck, ClipboardList, CalendarDays, Sun, Moon,
  ChevronDown, ChevronRight, Filter, ArrowUpRight, Building2, TrendingUp,
  CircleHelp, Send, Download, Megaphone, Check,
} from "lucide-react";

import "../../css/responsable.css";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

const MENU = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "appels", label: "Appels d'offres", icon: FileText },
  { id: "publication", label: "Publication", icon: Megaphone },
  { id: "categories", label: "Catégories", icon: FolderKanban },
  { id: "rapports", label: "Rapports", icon: ChartNoAxesCombined },
];

const EMPTY_FORM = {
  reference: "", objet: "", description: "", typeMarche: "FOURNITURE", montantEstime: "",
  lieuExecution: "", dateLimiteDepot: "", idCategorie: "",
};

const STATUS_COLORS = {
  PUBLIE: "#1768e5",
  BROUILLON: "#f59e0b",
  CLOTURE: "#8b5cf6",
  ATTRIBUE: "#10b981",
  ANNULE: "#ef4444",
};

/* ---------- utilitaires ---------- */

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateHeure(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatMontant(value) {
  if (value === null || value === undefined || value === "") return "Non renseigné";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(value)) + " Ar";
}

const getCategoryId = (c) => c?.idCategorie ?? "";
const getCategoryName = (c) => c?.nomCategorie || "Sans catégorie";

function getStatusClass(status) {
  const classes = {
    BROUILLON: "brouillon", PUBLIE: "publie", CLOTURE: "cloture",
    ATTRIBUE: "attribue", ANNULE: "annule",
  };
  return classes[(status || "").toUpperCase()] || "default";
}

function getStatusLabel(status) {
  const labels = {
    BROUILLON: "Brouillon", PUBLIE: "Publié", CLOTURE: "Clôturé",
    ATTRIBUE: "Attribué", ANNULE: "Annulé",
  };
  return labels[(status || "").toUpperCase()] || status || "Inconnu";
}

const getDateInputValue = (value) => (value ? String(value).slice(0, 16) : "");
const estEnRetard = (a) =>
  a.statut === "PUBLIE" && a.dateLimiteDepot && new Date(a.dateLimiteDepot) < new Date();

/* ---------- graphiques (SVG / CSS, sans librairie) ---------- */

function DonutChart({ segments, total }) {
  const R = 72;
  const C = 2 * Math.PI * R;
  let cumul = 0;

  return (
    <svg viewBox="0 0 200 200" className="rx-donut" role="img" aria-label="Répartition par statut">
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--rx-track)" strokeWidth="26" />
      {total > 0 &&
        segments.map((s) => {
          if (!s.value) return null;
          const len = (s.value / total) * C;
          const el = (
            <circle
              key={s.key}
              cx="100" cy="100" r={R} fill="none"
              stroke={s.color} strokeWidth="26"
              strokeDasharray={`${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}`}
              strokeDashoffset={-cumul}
              transform="rotate(-90 100 100)"
            >
              <title>{`${s.label} : ${s.value}`}</title>
            </circle>
          );
          cumul += len;
          return el;
        })}
      <text x="100" y="98" textAnchor="middle" className="rx-donut-total">{total}</text>
      <text x="100" y="120" textAnchor="middle" className="rx-donut-sub">appels</text>
    </svg>
  );
}

function ColumnChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="rx-columns">
      {data.map((d) => (
        <div className="rx-column" key={d.label}>
          <span className="rx-column-value">{d.value}</span>
          <div className="rx-column-track">
            <div
              className="rx-column-bar"
              style={{ height: `${(d.value / max) * 100}%`, background: d.color || "#1768e5" }}
            />
          </div>
          <span className="rx-column-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function BarList({ data, emptyText }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) return <p className="rx-muted">{emptyText}</p>;
  return (
    <div className="rx-barlist">
      {data.map((d) => (
        <div className="rx-barrow" key={d.label}>
          <div className="rx-barrow-head">
            <span>{d.label}</span>
            <strong>{d.value}</strong>
          </div>
          <div className="rx-bar-track">
            <div className="rx-bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color || "#1768e5" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- styles additionnels (graphiques, publication, confirmation) ---------- */

const EXTRA_CSS = `
.resp-app{--rx-track:#e8edf5;--rx-card:#fff;--rx-line:#e3e9f3;--rx-text:#14213d;--rx-soft:#64748b;--rx-soft-bg:#f5f8fd}
.resp-app.dark{--rx-track:#26324a;--rx-card:#151d30;--rx-line:#26324a;--rx-text:#e8eefb;--rx-soft:#93a1bd;--rx-soft-bg:#1b2540}
.rx-donut{width:100%;max-width:230px;height:auto}
.rx-donut-total{font-size:38px;font-weight:800;fill:var(--rx-text)}
.rx-donut-sub{font-size:12px;fill:var(--rx-soft)}
.rx-chart-layout{display:flex;align-items:center;gap:28px;flex-wrap:wrap;justify-content:center}
.rx-legend{display:grid;gap:10px;min-width:200px;flex:1}
.rx-legend-row{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--rx-text)}
.rx-legend-row i{width:11px;height:11px;border-radius:3px;flex:none}
.rx-legend-row strong{margin-left:auto}
.rx-legend-row small{color:var(--rx-soft);min-width:42px;text-align:right}
.rx-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:20px}
.rx-columns{display:flex;align-items:flex-end;gap:12px;height:220px;padding-top:8px}
.rx-column{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%}
.rx-column-track{flex:1;width:100%;max-width:46px;display:flex;align-items:flex-end;background:var(--rx-soft-bg);border-radius:8px;overflow:hidden}
.rx-column-bar{width:100%;border-radius:8px 8px 0 0;min-height:3px;transition:height .5s}
.rx-column-value{font-size:13px;font-weight:700;color:var(--rx-text)}
.rx-column-label{font-size:11.5px;color:var(--rx-soft);text-transform:capitalize}
.rx-barlist{display:grid;gap:14px}
.rx-barrow-head{display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;color:var(--rx-text)}
.rx-bar-track{height:9px;background:var(--rx-track);border-radius:99px;overflow:hidden}
.rx-bar-fill{height:100%;border-radius:99px;transition:width .5s}
.rx-muted{color:var(--rx-soft);font-size:14px}
.rx-badge-count{margin-left:auto;background:#f59e0b;color:#fff;font-size:11px;font-weight:700;border-radius:99px;padding:1px 8px}
.rx-pub-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:22px}
.rx-pub-kpi{background:var(--rx-card);border:1px solid var(--rx-line);border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:14px}
.rx-pub-kpi b{font-size:26px;color:var(--rx-text);display:block;line-height:1}
.rx-pub-kpi span{font-size:13px;color:var(--rx-soft)}
.rx-pub-kpi svg{flex:none}
.rx-section-title{display:flex;align-items:center;gap:10px;margin:26px 0 14px;font-size:18px;color:var(--rx-text)}
.rx-section-title span{background:var(--rx-soft-bg);color:var(--rx-soft);border-radius:99px;font-size:12px;padding:2px 10px}
.rx-pub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}
.rx-pub-card{background:var(--rx-card);border:1px solid var(--rx-line);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px}
.rx-pub-card.is-published{border-left:4px solid #1768e5}
.rx-pub-card.is-draft{border-left:4px solid #f59e0b}
.rx-pub-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.rx-pub-ref{font-weight:700;font-size:13px;color:#1768e5}
.rx-pub-card h4{margin:0;font-size:16.5px;line-height:1.35;color:var(--rx-text)}
.rx-pub-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;font-size:13px}
.rx-pub-meta span{display:block;color:var(--rx-soft);font-size:12px}
.rx-pub-meta strong{color:var(--rx-text);font-weight:600}
.rx-checklist{list-style:none;margin:0;padding:12px 14px;background:var(--rx-soft-bg);border-radius:10px;display:grid;gap:7px;font-size:13px;color:var(--rx-text)}
.rx-checklist li{display:flex;align-items:center;gap:8px}
.rx-checklist .ok{color:#10b981}.rx-checklist .ko{color:#ef4444}
.rx-pub-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
.rx-pub-actions button{flex:1;justify-content:center;min-width:110px}
.rx-btn-publish{background:#10b981;color:#fff;border:0;border-radius:10px;padding:11px 16px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.rx-btn-publish:hover:not(:disabled){background:#059669}
.rx-btn-publish:disabled{opacity:.45;cursor:not-allowed}
.rx-btn-ghost{background:transparent;color:var(--rx-text);border:1px solid var(--rx-line);border-radius:10px;padding:11px 14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.rx-btn-ghost:hover{background:var(--rx-soft-bg)}
.rx-btn-danger{color:#ef4444;border-color:#fecaca}
.rx-empty{grid-column:1/-1;text-align:center;padding:36px 20px;border:1px dashed var(--rx-line);border-radius:16px;color:var(--rx-soft)}
.rx-confirm-overlay{position:fixed;inset:0;background:rgba(10,18,36,.55);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
.rx-confirm{background:var(--rx-card);color:var(--rx-text);border-radius:18px;padding:26px;max-width:440px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.3)}
.rx-confirm h3{margin:0 0 8px}.rx-confirm p{margin:0 0 20px;color:var(--rx-soft);line-height:1.5}
.rx-confirm-actions{display:flex;justify-content:flex-end;gap:10px}
.rx-modal-error{display:flex;align-items:center;gap:8px;background:#fee2e2;color:#b91c1c;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:14px}
`;

/* ---------- page ---------- */

export default function ResponsablePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appels, setAppels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statistiques, setStatistiques] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const themeReady = useRef(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppel, setSelectedAppel] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [busyId, setBusyId] = useState(null);

  /* ----- API ----- */

  const apiFetch = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });

    if (response.status === 401) {
      router.replace("/");
      throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
    }
    if (response.status === 403) {
      throw new Error("Vous n'avez pas l'autorisation d'effectuer cette action.");
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!response.ok) {
      throw new Error(
        typeof data === "object" && data
          ? data.message || data.detail || data.error || "Une erreur est survenue."
          : data || "Une erreur est survenue."
      );
    }
    return data;
  }, [router]);

  const chargerDonnees = useCallback(async (initial = false) => {
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

      const [appelsData, categoriesData, statsData] = await Promise.all([
        apiFetch("/api/appel-offres"),
        apiFetch("/api/categories-marches"),
        apiFetch("/api/appel-offres/statistiques").catch(() => null),
      ]);

      setAppels(Array.isArray(appelsData) ? appelsData : []);
      setCategories(
        (Array.isArray(categoriesData) ? categoriesData : []).filter(
          (c) => String(c.statut || "").toUpperCase() === "ACTIF"
        )
      );
      setStatistiques(statsData || null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible de charger les données.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch, router]);

  useEffect(() => { chargerDonnees(true); }, [chargerDonnees]);

  /* ----- thème (correction : on ne réécrit le stockage qu'après lecture) ----- */

  useEffect(() => {
    try {
      const saved = localStorage.getItem("spat-responsable-theme");
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {}
    themeReady.current = true;
  }, []);

  useEffect(() => {
    if (!themeReady.current) return;
    document.documentElement.setAttribute("data-responsable-theme", theme);
    try { localStorage.setItem("spat-responsable-theme", theme); } catch {}
  }, [theme]);

  /* message de succès qui disparaît seul */
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4500);
    return () => clearTimeout(t);
  }, [successMessage]);

  /* ----- données calculées ----- */

  const notifications = useMemo(
    () => appels.filter(estEnRetard).map((a) => ({
      id: a.idAppelOffre, title: "Date limite dépassée", message: a.objet,
    })),
    [appels]
  );

  // Les stats sont recalculées depuis la liste : toujours cohérentes avec l'écran.
  const stats = useMemo(() => {
    const count = (s) => appels.filter((a) => String(a.statut || "").toUpperCase() === s).length;
    return {
      total: appels.length,
      brouillons: count("BROUILLON"),
      publies: count("PUBLIE"),
      clotures: count("CLOTURE"),
      attribues: count("ATTRIBUE"),
      annules: count("ANNULE"),
      enRetard: appels.filter(estEnRetard).length,
    };
  }, [appels]);

  const segments = useMemo(() => [
    { key: "PUBLIE", label: "Publiés", value: stats.publies, color: STATUS_COLORS.PUBLIE },
    { key: "BROUILLON", label: "Brouillons", value: stats.brouillons, color: STATUS_COLORS.BROUILLON },
    { key: "CLOTURE", label: "Clôturés", value: stats.clotures, color: STATUS_COLORS.CLOTURE },
    { key: "ATTRIBUE", label: "Attribués", value: stats.attribues, color: STATUS_COLORS.ATTRIBUE },
    { key: "ANNULE", label: "Annulés", value: stats.annules, color: STATUS_COLORS.ANNULE },
  ], [stats]);

const parMois = useMemo(() => {
  const mois = [];

  // Générer les six derniers mois sans utiliser new Date() directement
  for (let i = 5; i >= 0; i--) {
    const date = new Date(2026, 10 - i, 1);

    mois.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("fr-FR", {
        month: "short",
      }),
      value: 0,
    });
  }

  // Compter les appels d'offres par mois
  appels.forEach((a) => {
    if (!a.dateLimiteDepot) return;

    const date = new Date(a.dateLimiteDepot);

    if (Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const moisTrouve = mois.find((m) => m.key === key);

    if (moisTrouve) {
      moisTrouve.value += 1;
    }
  });

  return mois;
}, [appels]);
  const parCategorie = useMemo(() => {
    const map = {};
    appels.forEach((a) => {
      const n = getCategoryName(a.categorieMarche);
      map[n] = (map[n] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, color: "#1768e5" }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [appels]);

  const parType = useMemo(() => [
    { label: "Fournitures", value: appels.filter((a) => a.typeMarche === "FOURNITURE").length, color: "#0ea5e9" },
    { label: "Services", value: appels.filter((a) => a.typeMarche === "SERVICE").length, color: "#8b5cf6" },
  ], [appels]);

  const filteredAppels = useMemo(() => appels.filter((a) => {
    const texte = [a.reference, a.objet, a.description, a.lieuExecution].join(" ").toLowerCase();
    return (
      (!search || texte.includes(search.toLowerCase())) &&
      (!filterStatus || a.statut === filterStatus) &&
      (!filterType || a.typeMarche === filterType)
    );
  }), [appels, search, filterStatus, filterType]);

  const derniersAppels = useMemo(
    () => [...appels].sort((a, b) => b.idAppelOffre - a.idAppelOffre).slice(0, 5),
    [appels]
  );

  const aPublier = useMemo(() => appels.filter((a) => a.statut === "BROUILLON"), [appels]);
  const dejaPublies = useMemo(() => appels.filter((a) => a.statut === "PUBLIE"), [appels]);

  /* ----- formulaire ----- */

  const modifierChamp = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const ouvrirCreation = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalError("");
    setModalOpen(true);
  };

  const ouvrirModification = (appel) => {
    setEditingId(appel.idAppelOffre);
    setForm({
      reference: appel.reference || "",
      objet: appel.objet || "",
      description: appel.description || "",
      typeMarche: appel.typeMarche || "FOURNITURE",
      montantEstime: appel.montantEstime ?? "",
      lieuExecution: appel.lieuExecution || "",
      dateLimiteDepot: getDateInputValue(appel.dateLimiteDepot),
      idCategorie: String(getCategoryId(appel.categorieMarche) || ""),
    });
    setModalError("");
    setModalOpen(true);
  };

  const fermerModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalError("");
  };

  const enregistrerAppel = async (event) => {
    event.preventDefault();

    if (!form.reference.trim()) return setModalError("Veuillez saisir la référence de l'appel d'offres.");
    if (!form.objet.trim()) return setModalError("Veuillez renseigner l'objet de l'appel d'offres.");
    if (!form.idCategorie) return setModalError("Veuillez sélectionner une catégorie.");
    if (!form.dateLimiteDepot) return setModalError("Veuillez renseigner la date limite de dépôt.");
    if (new Date(form.dateLimiteDepot) <= new Date()) {
      return setModalError("La date limite de dépôt doit être dans le futur.");
    }
    if (form.typeMarche === "FOURNITURE" && (!form.montantEstime || Number(form.montantEstime) <= 0)) {
      return setModalError("Le montant estimé est obligatoire pour une fourniture.");
    }

    setSaving(true);
    setModalError("");

    const payload = {
      reference: form.reference.trim(),
      objet: form.objet.trim(),
      description: form.description.trim(),
      typeMarche: form.typeMarche,
      montantEstime: form.typeMarche === "FOURNITURE" ? Number(form.montantEstime) : null,
      lieuExecution: form.lieuExecution.trim(),
      dateLimiteDepot: form.dateLimiteDepot.length === 16 ? form.dateLimiteDepot + ":00" : form.dateLimiteDepot,
      categorieMarche: { idCategorie: Number(form.idCategorie) },
    };

    try {
      if (editingId) {
        await apiFetch(`/api/appel-offres/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccessMessage("Appel d'offres modifié avec succès.");
      } else {
        await apiFetch("/api/appel-offres", { method: "POST", body: JSON.stringify(payload) });
        setSuccessMessage("Appel d'offres créé avec succès (statut Brouillon).");
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await chargerDonnees(false);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ----- actions ----- */

  const ACTIONS = {
    publier: { label: "Publier", message: "Appel d'offres publié avec succès.", text: "Il deviendra visible et ouvert aux dépôts d'offres." },
    cloturer: { label: "Clôturer", message: "Appel d'offres clôturé avec succès.", text: "Les dépôts d'offres ne seront plus acceptés." },
    annuler: { label: "Annuler", message: "Appel d'offres annulé avec succès.", text: "Cette action met fin à la procédure.", danger: true },
    attribuer: { label: "Attribuer", message: "Appel d'offres attribué avec succès.", text: "Le marché sera marqué comme attribué." },
  };

  const demanderConfirmation = (config) => setConfirmState(config);

  const executerAction = (appel, action) => {
    const cfg = ACTIONS[action];
    if (!cfg) return;

    demanderConfirmation({
      title: `${cfg.label} cet appel d'offres ?`,
      message: `« ${appel.objet} ». ${cfg.text}`,
      confirmLabel: cfg.label,
      danger: cfg.danger,
      onConfirm: async () => {
        setError("");
        setBusyId(appel.idAppelOffre);
        try {
          await apiFetch(`/api/appel-offres/${appel.idAppelOffre}/${action}`, { method: "PATCH" });
          setSuccessMessage(cfg.message);
          await chargerDonnees(false);
        } catch (err) {
          setError(err.message);
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const supprimerAppel = (appel) => {
    if (appel.statut !== "BROUILLON") {
      setError("Seuls les brouillons peuvent être supprimés.");
      return;
    }
    demanderConfirmation({
      title: "Supprimer ce brouillon ?",
      message: `« ${appel.objet} » sera supprimé définitivement.`,
      confirmLabel: "Supprimer",
      danger: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/appel-offres/${appel.idAppelOffre}`, { method: "DELETE" });
          setSuccessMessage("Appel d'offres supprimé avec succès.");
          await chargerDonnees(false);
        } catch (err) {
          setError(err.message);
        }
      },
    });
  };

  const afficherDetail = (appel) => { setSelectedAppel(appel); setDetailOpen(true); };

  const deconnexion = async () => {
    try { await apiFetch("/api/auth/logout", { method: "POST" }); }
    catch (err) { console.error(err); }
    finally { router.replace("/"); }
  };

  const exporterCSV = () => {
    const lignes = [
      ["Référence", "Objet", "Type", "Catégorie", "Statut", "Date limite", "Lieu"],
      ...filteredAppels.map((a) => [
        a.reference || "", a.objet || "", a.typeMarche || "",
        getCategoryName(a.categorieMarche), getStatusLabel(a.statut),
        formatDate(a.dateLimiteDepot), a.lieuExecution || "",
      ]),
    ];
    const csv = lignes
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "appels-offres-spat.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ----- rendu ----- */

  if (loading) {
    return (
      <div className="resp-loading-screen">
        <div className="resp-loader"></div>
        <p>Chargement de votre espace SPAT...</p>
      </div>
    );
  }

  const premierNom = user?.nomComplet?.split(" ")[0] || "Responsable";

  const renderActionsLigne = (appel) => (
    <div className="resp-action-group">
      <button className="resp-action view" title="Détails" onClick={() => afficherDetail(appel)}>
        <Eye size={16} />
      </button>

      {appel.statut === "BROUILLON" && (
        <>
          <button className="resp-action edit" title="Modifier" onClick={() => ouvrirModification(appel)}>
            <Pencil size={16} />
          </button>
          <button className="resp-action publish" title="Publier" onClick={() => executerAction(appel, "publier")}>
            <Send size={16} />
          </button>
          <button className="resp-action delete" title="Supprimer" onClick={() => supprimerAppel(appel)}>
            <Trash2 size={16} />
          </button>
        </>
      )}

      {appel.statut === "PUBLIE" && (
        <>
          <button className="resp-action close" title="Clôturer" onClick={() => executerAction(appel, "cloturer")}>
            <CheckCircle2 size={16} />
          </button>
          <button className="resp-action cancel" title="Annuler" onClick={() => executerAction(appel, "annuler")}>
            <Ban size={16} />
          </button>
        </>
      )}

      {appel.statut === "CLOTURE" && (
        <button className="resp-action publish" title="Attribuer" onClick={() => executerAction(appel, "attribuer")}>
          <FileCheck size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className={`resp-app ${theme === "dark" ? "dark" : ""}`}>
      <style>{EXTRA_CSS}</style>

      {/* SIDEBAR */}
      <aside className={`resp-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="resp-brand">
          <div className="resp-brand-logo"><Building2 size={29} /></div>
          <div>
            <h2>SPAT</h2>
            <span>Port de Toamasina</span>
          </div>
          <button className="resp-close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={21} />
          </button>
        </div>

        <div className="resp-profile-mini">
          <div className="resp-avatar">{(user?.nomComplet || "R").charAt(0).toUpperCase()}</div>
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
            return (
              <button
                key={item.id}
                className={`resp-nav-item ${activeMenu === item.id ? "active" : ""}`}
                onClick={() => { setActiveMenu(item.id); setSidebarOpen(false); }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "publication" && aPublier.length > 0 && (
                  <span className="rx-badge-count">{aPublier.length}</span>
                )}
                {activeMenu === item.id && <ChevronRight size={17} className="resp-nav-arrow" />}
              </button>
            );
          })}
        </nav>

        <div className="resp-sidebar-bottom">
          <div className="resp-sidebar-help">
            <div className="resp-help-icon"><CircleHelp size={22} /></div>
            <strong>Besoin d'aide ?</strong>
            <p>Contactez votre administrateur SPAT pour toute assistance.</p>
          </div>
          <button className="resp-logout" onClick={deconnexion}>
            <LogOut size={19} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="resp-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* CONTENU */}
      <main className="resp-main">
        <header className="resp-header">
          <div className="resp-header-left">
            <button className="resp-mobile-menu" onClick={() => setSidebarOpen(true)}>
              <Menu size={23} />
            </button>
            <div>
              <span className="resp-breadcrumb">
                SPAT <ChevronRight size={13} /> Responsable
              </span>
              <h1>{MENU.find((m) => m.id === activeMenu)?.label}</h1>
            </div>
          </div>

          <div className="resp-header-right">
            <div className="resp-header-date">
              <CalendarDays size={16} />
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </div>

            <button
              className="resp-icon-button"
              onClick={() => setTheme((p) => (p === "light" ? "dark" : "light"))}
              title="Changer le thème"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="resp-notification-wrapper">
              <button
                className="resp-icon-button resp-notification-button"
                onClick={() => setNotificationOpen(!notificationOpen)}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="resp-notification-count">{notifications.length}</span>
                )}
              </button>

              {notificationOpen && (
                <div className="resp-notification-panel">
                  <div className="resp-notification-head">
                    <strong>Notifications</strong>
                    <button onClick={() => setNotificationOpen(false)}><X size={17} /></button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="resp-empty-notification">Aucune nouvelle notification.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="resp-notification-item">
                        <AlertTriangle size={18} />
                        <div>
                          <strong>{n.title}</strong>
                          <span>{n.message}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="resp-header-user">
              <div className="resp-avatar resp-avatar-small">
                {(user?.nomComplet || "R").charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{user?.nomComplet || "Responsable"}</strong>
                <span>Responsable des marchés</span>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        {error && (
          <div className="resp-alert resp-alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={17} /></button>
          </div>
        )}
        {successMessage && (
          <div className="resp-alert resp-alert-success">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage("")}><X size={17} /></button>
          </div>
        )}

        {/* ================= DASHBOARD ================= */}
        {activeMenu === "dashboard" && (
          <section className="resp-content">
            <div className="resp-hero">
              <div className="resp-hero-content">
                <span className="resp-hero-label"><span></span> ESPACE PROFESSIONNEL SPAT</span>
                <h2>Bonjour, {premierNom} !</h2>
                <p>
                  {aPublier.length > 0
                    ? `${aPublier.length} brouillon(s) attendent d'être publiés.`
                    : "Pilotez vos appels d'offres et assurez le suivi des marchés."}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="resp-primary-button resp-hero-button" onClick={ouvrirCreation}>
                    <Plus size={19} /> Nouvel appel d'offres
                  </button>
                  {aPublier.length > 0 && (
                    <button className="resp-primary-button resp-hero-button" onClick={() => setActiveMenu("publication")}>
                      <Megaphone size={19} /> Aller à la publication
                    </button>
                  )}
                </div>
              </div>
              <div className="resp-hero-decoration">
                <div className="resp-hero-circle"></div>
                <Building2 size={110} strokeWidth={1} />
              </div>
            </div>

            <div className="resp-section-heading">
              <div>
                <h2>Vue générale</h2>
                <p>Indicateurs de votre activité</p>
              </div>
              <button className="resp-refresh-button" onClick={() => chargerDonnees(false)} disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? "resp-spin" : ""} />
                Actualiser
              </button>
            </div>

            <div className="resp-stats-grid">
              {[
                { c: "blue", icon: FileText, v: stats.total, l: "Total des appels d'offres", f: "Tous les dossiers enregistrés", t: <><TrendingUp size={14} /> Global</> },
                { c: "orange", icon: Pencil, v: stats.brouillons, l: "Brouillons", f: "Appels non encore publiés", t: "En préparation" },
                { c: "green", icon: Send, v: stats.publies, l: "Appels publiés", f: "Offres actuellement ouvertes", t: "En cours" },
                { c: "purple", icon: FileCheck, v: stats.clotures, l: "Appels clôturés", f: "Dossiers clôturés", t: "Terminés" },
                { c: "red", icon: AlertTriangle, v: stats.enRetard, l: "Appels en retard", f: "Dates limites dépassées", t: "Attention" },
              ].map(({ c, icon: Icon, v, l, f, t }) => (
                <div className={`resp-stat-card ${c}`} key={l}>
                  <div className="resp-stat-top">
                    <div className="resp-stat-icon"><Icon size={23} /></div>
                    <span className="resp-stat-trend">{t}</span>
                  </div>
                  <div className="resp-stat-value">{v}</div>
                  <div className="resp-stat-label">{l}</div>
                  <div className="resp-stat-footer">{f}</div>
                </div>
              ))}
            </div>

            {/* GRAPHIQUES */}
            <div className="rx-two">
              <div className="resp-panel resp-chart-panel">
                <div className="resp-panel-header">
                  <div>
                    <h3><ChartNoAxesCombined size={19} /> État des appels d'offres</h3>
                    <p>Répartition des dossiers par statut</p>
                  </div>
                  <span className="resp-panel-badge">En temps réel</span>
                </div>

                <div className="rx-chart-layout">
                  <DonutChart segments={segments} total={stats.total} />
                  <div className="rx-legend">
                    {segments.map((s) => (
                      <div className="rx-legend-row" key={s.key}>
                        <i style={{ background: s.color }} />
                        {s.label}
                        <strong>{s.value}</strong>
                        <small>{stats.total ? Math.round((s.value / stats.total) * 100) : 0}%</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="resp-panel">
                <div className="resp-panel-header">
                  <div>
                    <h3><CalendarDays size={19} /> Échéances par mois</h3>
                    <p>Dates limites de dépôt sur 6 mois</p>
                  </div>
                </div>
                <ColumnChart data={parMois} />
              </div>
            </div>

            <div className="rx-two">
              <div className="resp-panel">
                <div className="resp-panel-header">
                  <div>
                    <h3><FolderKanban size={19} /> Appels par catégorie</h3>
                    <p>Les catégories les plus utilisées</p>
                  </div>
                </div>
                <BarList data={parCategorie} emptyText="Aucune donnée disponible." />
              </div>

              <div className="resp-panel resp-summary-panel">
                <div className="resp-panel-header">
                  <div>
                    <h3><TrendingUp size={19} /> Résumé d'activité</h3>
                    <p>Indicateurs de performance</p>
                  </div>
                </div>

                <BarList data={parType} emptyText="" />

                <div className="resp-summary-list" style={{ marginTop: 18 }}>
                  <div className="resp-summary-item">
                    <div className="resp-summary-icon green-bg"><CheckCircle2 size={20} /></div>
                    <div className="resp-summary-text">
                      <strong>Marchés attribués</strong>
                      <span>Décisions enregistrées</span>
                    </div>
                    <b>{stats.attribues}</b>
                  </div>
                  <div className="resp-summary-item">
                    <div className="resp-summary-icon orange-bg"><Clock size={20} /></div>
                    <div className="resp-summary-text">
                      <strong>En attente de publication</strong>
                      <span>Dossiers en préparation</span>
                    </div>
                    <b>{stats.brouillons}</b>
                  </div>
                  <div className="resp-summary-item">
                    <div className="resp-summary-icon red-bg"><AlertTriangle size={20} /></div>
                    <div className="resp-summary-text">
                      <strong>Dates dépassées</strong>
                      <span>Appels à vérifier</span>
                    </div>
                    <b>{stats.enRetard}</b>
                  </div>
                </div>

                <button className="resp-outline-button" onClick={() => setActiveMenu("publication")}>
                  Gérer les publications <ArrowUpRight size={16} />
                </button>
              </div>
            </div>

            {/* DERNIERS APPELS */}
            <div className="resp-panel resp-table-panel">
              <div className="resp-panel-header">
                <div>
                  <h3><ClipboardList size={19} /> Derniers appels d'offres</h3>
                  <p>Les cinq derniers dossiers enregistrés</p>
                </div>
                <button className="resp-outline-button" onClick={() => setActiveMenu("appels")}>
                  Voir tous <ArrowUpRight size={16} />
                </button>
              </div>

              <div className="resp-table-scroll">
                <table className="resp-table">
                  <thead>
                    <tr>
                      <th>Référence</th><th>Objet</th><th>Type</th><th>Catégorie</th>
                      <th>Statut</th><th>Date limite</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derniersAppels.map((appel) => (
                      <tr key={appel.idAppelOffre}>
                        <td className="resp-reference">{appel.reference || `AO-${appel.idAppelOffre}`}</td>
                        <td className="resp-object-cell">{appel.objet}</td>
                        <td>
                          <span className={`resp-type-badge ${appel.typeMarche?.toLowerCase()}`}>{appel.typeMarche}</span>
                        </td>
                        <td>{getCategoryName(appel.categorieMarche)}</td>
                        <td>
                          <span className={`resp-status ${getStatusClass(appel.statut)}`}>{getStatusLabel(appel.statut)}</span>
                        </td>
                        <td>{formatDate(appel.dateLimiteDepot)}</td>
                        <td>
                          <div className="resp-action-group">
                            <button className="resp-action view" title="Consulter" onClick={() => afficherDetail(appel)}>
                              <Eye size={16} />
                            </button>
                            <button
                              className="resp-action edit" title="Modifier"
                              disabled={appel.statut !== "BROUILLON"}
                              onClick={() => ouvrirModification(appel)}
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {derniersAppels.length === 0 && (
                      <tr><td colSpan="7" className="resp-empty-table">Aucun appel d'offres enregistré.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================= APPELS D'OFFRES ================= */}
        {activeMenu === "appels" && (
          <section className="resp-content">
            <div className="resp-page-intro">
              <div>
                <h2>Gestion des appels d'offres</h2>
                <p>Créez, publiez et suivez les appels d'offres du SPAT.</p>
              </div>
              <button className="resp-primary-button" onClick={ouvrirCreation}>
                <Plus size={18} /> Créer un appel
              </button>
            </div>

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
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  <option value="BROUILLON">Brouillon</option>
                  <option value="PUBLIE">Publié</option>
                  <option value="CLOTURE">Clôturé</option>
                  <option value="ATTRIBUE">Attribué</option>
                  <option value="ANNULE">Annulé</option>
                </select>
              </div>

              <div className="resp-select-filter">
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="">Tous les types</option>
                  <option value="FOURNITURE">Fourniture</option>
                  <option value="SERVICE">Service</option>
                </select>
              </div>

              <button className="resp-export-button" onClick={exporterCSV}>
                <Download size={17} /> Exporter
              </button>
            </div>

            <div className="resp-table-panel resp-panel">
              <div className="resp-panel-header">
                <div>
                  <h3>Liste des appels d'offres</h3>
                  <p>{filteredAppels.length} dossier(s) trouvé(s)</p>
                </div>
                <button className="resp-refresh-button" onClick={() => chargerDonnees(false)}>
                  <RefreshCw size={16} className={refreshing ? "resp-spin" : ""} /> Actualiser
                </button>
              </div>

              <div className="resp-table-scroll">
                <table className="resp-table">
                  <thead>
                    <tr>
                      <th>Référence</th><th>Objet</th><th>Type</th><th>Catégorie</th>
                      <th>Montant estimé</th><th>Date limite</th><th>Statut</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppels.map((appel) => (
                      <tr key={appel.idAppelOffre}>
                        <td className="resp-reference">{appel.reference || `AO-${appel.idAppelOffre}`}</td>
                        <td className="resp-object-cell">
                          <strong>{appel.objet}</strong>
                          <span>{appel.lieuExecution || "Lieu non renseigné"}</span>
                        </td>
                        <td>
                          <span className={`resp-type-badge ${appel.typeMarche?.toLowerCase()}`}>{appel.typeMarche}</span>
                        </td>
                        <td>{getCategoryName(appel.categorieMarche)}</td>
                        <td>{formatMontant(appel.montantEstime)}</td>
                        <td>{formatDate(appel.dateLimiteDepot)}</td>
                        <td>
                          <span className={`resp-status ${getStatusClass(appel.statut)}`}>{getStatusLabel(appel.statut)}</span>
                        </td>
                        <td>{renderActionsLigne(appel)}</td>
                      </tr>
                    ))}
                    {filteredAppels.length === 0 && (
                      <tr><td colSpan="8" className="resp-empty-table">Aucun résultat trouvé.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================= PUBLICATION ================= */}
        {activeMenu === "publication" && (
          <section className="resp-content">
            <div className="resp-page-intro">
              <div>
                <h2>Publication des appels d'offres</h2>
                <p>Vérifiez chaque brouillon, puis publiez-le pour ouvrir les dépôts d'offres.</p>
              </div>
              <button className="resp-primary-button" onClick={ouvrirCreation}>
                <Plus size={18} /> Créer un appel
              </button>
            </div>

            <div className="rx-pub-summary">
              <div className="rx-pub-kpi">
                <Clock size={28} color="#f59e0b" />
                <div><b>{aPublier.length}</b><span>À publier</span></div>
              </div>
              <div className="rx-pub-kpi">
                <Megaphone size={28} color="#1768e5" />
                <div><b>{dejaPublies.length}</b><span>Actuellement publiés</span></div>
              </div>
              <div className="rx-pub-kpi">
                <AlertTriangle size={28} color="#ef4444" />
                <div><b>{stats.enRetard}</b><span>Échéance dépassée</span></div>
              </div>
            </div>

            <h3 className="rx-section-title">
              Brouillons prêts à publier <span>{aPublier.length}</span>
            </h3>

            <div className="rx-pub-grid">
              {aPublier.map((appel) => {
                const dateOk = appel.dateLimiteDepot && new Date(appel.dateLimiteDepot) > new Date();
                const categorieOk = Boolean(appel.categorieMarche);
                const montantOk = appel.typeMarche !== "FOURNITURE" || Number(appel.montantEstime) > 0;
                const pret = dateOk && categorieOk && montantOk;

                const verifs = [
                  [categorieOk, "Catégorie renseignée"],
                  [montantOk, appel.typeMarche === "FOURNITURE" ? "Montant estimé renseigné" : "Montant non requis (service)"],
                  [dateOk, dateOk ? "Date limite dans le futur" : "Date limite dépassée : modifiez le dossier"],
                ];

                return (
                  <article className="rx-pub-card is-draft" key={appel.idAppelOffre}>
                    <div className="rx-pub-top">
                      <span className="rx-pub-ref">{appel.reference || `AO-${appel.idAppelOffre}`}</span>
                      <span className="resp-status brouillon">Brouillon</span>
                    </div>

                    <h4>{appel.objet}</h4>

                    <div className="rx-pub-meta">
                      <div><span>Type</span><strong>{appel.typeMarche === "SERVICE" ? "Service" : "Fourniture"}</strong></div>
                      <div><span>Catégorie</span><strong>{getCategoryName(appel.categorieMarche)}</strong></div>
                      <div><span>Montant estimé</span><strong>{formatMontant(appel.montantEstime)}</strong></div>
                      <div><span>Date limite</span><strong>{formatDateHeure(appel.dateLimiteDepot)}</strong></div>
                    </div>

                    <ul className="rx-checklist">
                      {verifs.map(([ok, texte]) => (
                        <li key={texte}>
                          {ok ? <Check size={16} className="ok" /> : <X size={16} className="ko" />}
                          {texte}
                        </li>
                      ))}
                    </ul>

                   <div className="rx-pub-actions">
                    <button
                      type="button"
                      className="rx-btn-publish"
                      disabled={!pret || busyId === appel.idAppelOffre}
                      onClick={() => executerAction(appel, "publier")}
                      title={!pret ? "Complétez les informations obligatoires avant publication" : "Publier cet appel d'offres"}
                    >
                      {busyId === appel.idAppelOffre ? (
                        <RefreshCw size={17} className="resp-spin" />
                      ) : (
                        <Send size={17} />
                      )}
                      {busyId === appel.idAppelOffre ? "Publication..." : "Publier"}
                    </button>

                    <button
                      type="button"
                      className="rx-btn-ghost"
                      onClick={() => ouvrirModification(appel)}
                      disabled={busyId === appel.idAppelOffre}
                    >
                      <Pencil size={16} />
                      Modifier
                    </button>

                    <button
                      type="button"
                      className="rx-btn-ghost"
                      onClick={() => afficherDetail(appel)}
                    >
                      <Eye size={16} />
                      Aperçu
                    </button>
                  </div>
                  </article>
                );
              })}

              {aPublier.length === 0 && (
                <div className="rx-empty">
                  <CheckCircle2 size={34} />
                  <p>Aucun brouillon en attente. Créez un appel d'offres pour le publier ici.</p>
                </div>
              )}
            </div>

            <h3 className="rx-section-title">
              Appels publiés <span>{dejaPublies.length}</span>
            </h3>

            <div className="rx-pub-grid">
              {dejaPublies.map((appel) => (
                <article className="rx-pub-card is-published" key={appel.idAppelOffre}>
                  <div className="rx-pub-top">
                    <span className="rx-pub-ref">{appel.reference || `AO-${appel.idAppelOffre}`}</span>
                    <span className={`resp-status ${estEnRetard(appel) ? "annule" : "publie"}`}>
                      {estEnRetard(appel) ? "Échéance dépassée" : "Publié"}
                    </span>
                  </div>

                  <h4>{appel.objet}</h4>

                  <div className="rx-pub-meta">
                    <div><span>Publié le</span><strong>{formatDate(appel.datePublication)}</strong></div>
                    <div><span>Date limite</span><strong>{formatDateHeure(appel.dateLimiteDepot)}</strong></div>
                    <div><span>Catégorie</span><strong>{getCategoryName(appel.categorieMarche)}</strong></div>
                    <div><span>Lieu</span><strong>{appel.lieuExecution || "Non renseigné"}</strong></div>
                  </div>

                  <div className="rx-pub-actions">
                    <button className="rx-btn-ghost" onClick={() => afficherDetail(appel)}>
                      <Eye size={16} /> Détails
                    </button>
                    <button className="rx-btn-ghost" onClick={() => executerAction(appel, "cloturer")}>
                      <CheckCircle2 size={16} /> Clôturer
                    </button>
                    <button className="rx-btn-ghost rx-btn-danger" onClick={() => executerAction(appel, "annuler")}>
                      <Ban size={16} /> Annuler
                    </button>
                  </div>
                </article>
              ))}

              {dejaPublies.length === 0 && (
                <div className="rx-empty">
                  <Megaphone size={34} />
                  <p>Aucun appel d'offres n'est publié pour le moment.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= CATEGORIES ================= */}
        {activeMenu === "categories" && (
          <section className="resp-content">
            <div className="resp-page-intro">
              <div>
                <h2>Catégories des marchés</h2>
                <p>Catégories actives configurées par l'administrateur.</p>
              </div>
            </div>

            <div className="resp-category-grid">
              {categories.map((categorie) => (
                <div className="resp-category-card" key={getCategoryId(categorie)}>
                  <div className="resp-category-icon"><FolderKanban size={25} /></div>
                  <div>
                    <h3>{getCategoryName(categorie)}</h3>
                    <p>{categorie.description || "Aucune description disponible."}</p>
                  </div>
                  <span className="resp-category-active">Active</span>
                </div>
              ))}

              {categories.length === 0 && (
                <div className="resp-empty-categories">
                  <FolderKanban size={35} />
                  <h3>Aucune catégorie active</h3>
                  <p>Veuillez contacter l'administrateur pour configurer les catégories.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= RAPPORTS ================= */}
        {activeMenu === "rapports" && (
          <section className="resp-content">
            <div className="resp-page-intro">
              <div>
                <h2>Rapports et statistiques</h2>
                <p>Vue synthétique des activités des appels d'offres.</p>
              </div>
              <button className="resp-export-button" onClick={exporterCSV}>
                <Download size={17} /> Exporter les données
              </button>
            </div>

            <div className="resp-stats-grid resp-report-stats">
              {[
                { c: "blue", icon: FileText, v: stats.total, l: "Total des appels" },
                { c: "green", icon: CheckCircle2, v: stats.attribues, l: "Marchés attribués" },
                { c: "purple", icon: FileCheck, v: stats.clotures, l: "Dossiers clôturés" },
                { c: "red", icon: AlertTriangle, v: stats.enRetard, l: "Dossiers en retard" },
              ].map(({ c, icon: Icon, v, l }) => (
                <div className={`resp-stat-card ${c}`} key={l}>
                  <div className="resp-stat-icon"><Icon size={22} /></div>
                  <div className="resp-stat-value">{v}</div>
                  <div className="resp-stat-label">{l}</div>
                </div>
              ))}
            </div>

            <div className="rx-two">
              <div className="resp-panel">
                <div className="resp-panel-header">
                  <div>
                    <h3>Répartition par statut</h3>
                    <p>État actuel de tous les appels d'offres</p>
                  </div>
                </div>
                <div className="rx-chart-layout">
                  <DonutChart segments={segments} total={stats.total} />
                  <div className="rx-legend">
                    {segments.map((s) => (
                      <div className="rx-legend-row" key={s.key}>
                        <i style={{ background: s.color }} />
                        {s.label}
                        <strong>{s.value}</strong>
                        <small>{stats.total ? Math.round((s.value / stats.total) * 100) : 0}%</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="resp-panel">
                <div className="resp-panel-header">
                  <div>
                    <h3>Échéances sur 6 mois</h3>
                    <p>Nombre de dates limites par mois</p>
                  </div>
                </div>
                <ColumnChart data={parMois} />
              </div>
            </div>

            <div className="resp-panel resp-report-panel">
              <div className="resp-panel-header">
                <div>
                  <h3>Rapport détaillé</h3>
                  <p>Part de chaque statut dans le total</p>
                </div>
              </div>
              <BarList
                emptyText="Aucune donnée."
                data={segments.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
              />
            </div>
          </section>
        )}

        <footer className="resp-footer">
          <span>© {new Date().getFullYear()} SPAT - Port de Toamasina</span>
          <span>Plateforme de gestion des appels d'offres</span>
        </footer>
      </main>

      {/* ============ MODAL CREATION / MODIFICATION ============ */}
      {modalOpen && (
        <div className="resp-modal-overlay" onMouseDown={fermerModal}>
          <div className="resp-modal resp-large-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="resp-modal-header">
              <div>
                <span className="resp-modal-kicker">GESTION DES MARCHÉS</span>
                <h2>{editingId ? "Modifier l'appel d'offres" : "Nouvel appel d'offres"}</h2>
                <p>Complétez les informations du dossier.</p>
              </div>
              <button className="resp-modal-close" onClick={fermerModal}><X size={21} /></button>
            </div>

            <form onSubmit={enregistrerAppel}>
              {modalError && (
                <div className="rx-modal-error"><AlertTriangle size={17} /> {modalError}</div>
              )}

              <div className="resp-form-grid">
                <div className="resp-form-group full">
                  <label>Référence *</label>
                  <input
                    name="reference"
                    value={form.reference}
                    onChange={modifierChamp}
                    placeholder="Exemple : AO-2026-001"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="resp-form-group full">
                  <label>Objet de l'appel d'offres *</label>
                  <input
                    name="objet" value={form.objet} onChange={modifierChamp}
                    placeholder="Exemple : Fourniture de matériels informatiques"
                    maxLength={255} required
                  />
                </div>

                <div className="resp-form-group full">
                  <label>Description</label>
                  <textarea
                    name="description" value={form.description} onChange={modifierChamp}
                    placeholder="Décrivez les besoins et les caractéristiques du marché..." rows={4}
                  />
                </div>

                <div className="resp-form-group">
                  <label>Type de marché *</label>
                  <select name="typeMarche" value={form.typeMarche} onChange={modifierChamp} required>
                    <option value="FOURNITURE">Fourniture</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>

                <div className="resp-form-group">
                  <label>Catégorie du marché *</label>
                  <select name="idCategorie" value={form.idCategorie} onChange={modifierChamp} required>
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((c) => (
                      <option key={getCategoryId(c)} value={getCategoryId(c)}>{getCategoryName(c)}</option>
                    ))}
                  </select>
                </div>

                {form.typeMarche === "FOURNITURE" && (
                  <div className="resp-form-group">
                    <label>Montant estimé (Ar) *</label>
                    <input
                      type="number" name="montantEstime" value={form.montantEstime}
                      onChange={modifierChamp} min="1" step="0.01"
                      placeholder="Exemple : 50000000" required
                    />
                  </div>
                )}

                <div className="resp-form-group">
                  <label>Date limite de dépôt *</label>
                  <input
                    type="datetime-local" name="dateLimiteDepot"
                    value={form.dateLimiteDepot} onChange={modifierChamp} required
                  />
                </div>

                <div className="resp-form-group full">
                  <label>Lieu d'exécution</label>
                  <input
                    name="lieuExecution" value={form.lieuExecution} onChange={modifierChamp}
                    maxLength={255} placeholder="Exemple : Port de Toamasina"
                  />
                </div>
              </div>

              <div className="resp-form-note">
                <AlertTriangle size={16} />
                La référence est saisie par vos soins et doit être unique. Le dossier est enregistré au statut Brouillon ;
                publiez-le ensuite depuis la page Publication.
              </div>

              <div className="resp-modal-actions">
                <button type="button" className="resp-secondary-button" onClick={fermerModal} disabled={saving}>
                  Annuler
                </button>
                <button type="submit" className="resp-primary-button" disabled={saving}>
                  {saving ? (
                    <><RefreshCw size={17} className="resp-spin" /> Enregistrement...</>
                  ) : (
                    <><CheckCircle2 size={18} /> {editingId ? "Enregistrer les modifications" : "Créer l'appel d'offres"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL DETAILS ============ */}
      {detailOpen && selectedAppel && (
        <div className="resp-modal-overlay" onMouseDown={() => setDetailOpen(false)}>
          <div className="resp-modal resp-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="resp-modal-header">
              <div>
                <span className="resp-modal-kicker">DÉTAIL DU DOSSIER</span>
                <h2>{selectedAppel.objet}</h2>
                <p>{selectedAppel.reference || `AO-${selectedAppel.idAppelOffre}`}</p>
              </div>
              <button className="resp-modal-close" onClick={() => setDetailOpen(false)}><X size={21} /></button>
            </div>

            <div className="resp-detail-status">
              <span className={`resp-status ${getStatusClass(selectedAppel.statut)}`}>
                {getStatusLabel(selectedAppel.statut)}
              </span>
              <span className={`resp-type-badge ${selectedAppel.typeMarche?.toLowerCase()}`}>
                {selectedAppel.typeMarche}
              </span>
            </div>

            <div className="resp-detail-grid">
              <div className="resp-detail-item"><span>Référence</span><strong>{selectedAppel.reference || "—"}</strong></div>
              <div className="resp-detail-item"><span>Catégorie</span><strong>{getCategoryName(selectedAppel.categorieMarche)}</strong></div>
              <div className="resp-detail-item"><span>Montant estimé</span><strong>{formatMontant(selectedAppel.montantEstime)}</strong></div>
              <div className="resp-detail-item"><span>Date de publication</span><strong>{formatDate(selectedAppel.datePublication)}</strong></div>
              <div className="resp-detail-item"><span>Date limite de dépôt</span><strong>{formatDateHeure(selectedAppel.dateLimiteDepot)}</strong></div>
              <div className="resp-detail-item"><span>Lieu d'exécution</span><strong>{selectedAppel.lieuExecution || "Non renseigné"}</strong></div>
              <div className="resp-detail-item full">
                <span>Description</span>
                <p>{selectedAppel.description || "Aucune description disponible."}</p>
              </div>
            </div>

            <div className="resp-modal-actions">
              <button className="resp-secondary-button" onClick={() => setDetailOpen(false)}>Fermer</button>

              {selectedAppel.statut === "BROUILLON" && (
                <>
                  <button
                    className="resp-secondary-button"
                    onClick={() => { setDetailOpen(false); ouvrirModification(selectedAppel); }}
                  >
                    <Pencil size={17} /> Modifier
                  </button>
                  <button
                    className="resp-primary-button"
                    onClick={() => { setDetailOpen(false); executerAction(selectedAppel, "publier"); }}
                  >
                    <Send size={17} /> Publier
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ CONFIRMATION ============ */}
      {confirmState && (
        <div className="rx-confirm-overlay" onMouseDown={() => setConfirmState(null)}>
          <div className="rx-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <h3>{confirmState.title}</h3>
            <p>{confirmState.message}</p>
            <div className="rx-confirm-actions">
              <button className="rx-btn-ghost" onClick={() => setConfirmState(null)}>Retour</button>
              <button
                className="rx-btn-publish"
                style={confirmState.danger ? { background: "#ef4444" } : undefined}
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState(null);
                  fn();
                }}
              >
                {confirmState.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
