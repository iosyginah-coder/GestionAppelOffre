"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Trophy,
  Search,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  UserRound,
  CalendarDays,
  MapPin,
  Mail,
  Phone,
  Hash,
  Eye,
  Trash2,
  FileText,
  FileImage,
  IdCard,
  Banknote,
  Wrench,
  ChevronRight,
  ChevronDown,
  Medal,
  ImageOff,
  Users,
  Clock3,
  ClipboardCheck,
  Gauge,
} from "lucide-react";

import "../../css/evaluateur.css";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

/* =====================================================
   API
===================================================== */

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const type = response.headers.get("content-type") || "";
  const raw = await response.text().catch(() => "");
  let data = null;

  if (raw) {
    if (type.includes("application/json")) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
    } else {
      data = raw;
    }
  }

  if (!response.ok) {
    let message = `Erreur HTTP ${response.status}`;
    if (typeof data === "string" && data.trim()) message = data;
    else if (data?.message) message = data.message;
    else if (data?.error) message = data.error;
    throw new Error(message);
  }

  return data;
}

async function fetchBlob(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Erreur HTTP ${response.status}`);
  }

  return response.blob();
}

/* =====================================================
   UTILITAIRES
===================================================== */

const normalizeList = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.content)
    ? data.content
    : Array.isArray(data?.data)
    ? data.data
    : [];

const getIdOffre = (o) => o?.idOffre ?? o?.id;
const getAppel = (o) => o?.appelOffre ?? {};
const getIdAppel = (o) => getAppel(o)?.idAppelOffre;

function toDate(value) {
  if (!value) return null;
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

function formatDate(value, withTime = true) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  });
}

const formatScore = (n) =>
  Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const COLORS = {
  pending: "#e8a33d",
  progress: "#1d5fa8",
  done: "#17803d",
};

const STATUTS = {
  DEPOSEE: { label: "À évaluer", tone: "pending" },
  EN_EVALUATION: { label: "En cours", tone: "progress" },
  EVALUEE: { label: "Évaluée", tone: "done" },
};

const statutOf = (o) => String(o?.statut || "").toUpperCase();
const statutInfo = (o) =>
  STATUTS[statutOf(o)] || { label: o?.statut || "—", tone: "pending" };

function appelStatutInfo(appel) {
  const s = String(appel?.statut || "").toUpperCase();
  if (s === "PUBLIE") return { label: "Publié", tone: "done" };
  if (s === "CLOTURE" || s === "CLOTUREE") return { label: "Clôturé", tone: "pending" };
  return { label: appel?.statut || "—", tone: "progress" };
}

const nomSoumissionnaire = (o) =>
  o?.nomAffiche || o?.entreprise || o?.nomSoumissionnaire || "Soumissionnaire";

const typeLabel = (o) =>
  String(o?.typeSoumissionnaire || "").toUpperCase() === "FOURNISSEUR"
    ? "Entreprise"
    : "Personne physique";

const critId = (row) => row?.idCritere ?? row?.critere?.idCritere;
const critNom = (row) =>
  row?.nomCritere ?? row?.critere?.nomCritere ?? "Critère";
const critDescription = (row) =>
  row?.descriptionCritere ??
  row?.critere?.description ??
  row?.description ??
  "";
const critPonderation = (row) => {
  const n = Number(row?.ponderation ?? row?.critere?.ponderation ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function criteresPourAppel(criteres, appelId) {
  if (!appelId) return [];
  return criteres
    .filter(
      (row) =>
        Number(row?.idAppelOffre ?? row?.appelOffre?.idAppelOffre) ===
        Number(appelId)
    )
    .sort((a, b) => critNom(a).localeCompare(critNom(b), "fr"));
}

function docIcon(doc) {
  const cle = String(doc?.cle || "");
  if (cle.startsWith("cin")) return IdCard;
  if (cle === "financiere") return Banknote;
  if (cle === "technique") return Wrench;
  if (String(doc?.typeContenu || "").startsWith("image/")) return FileImage;
  return FileText;
}

const photoUrl = (photo) =>
  /^https?:/i.test(photo?.url || "")
    ? photo.url
    : `${API_BASE}${photo?.url || ""}`;

/* Score pondéré sur 20 : somme(note × pondération) / somme(pondérations notées) */
function calculerScore(notesParCritere, criteres) {
  let points = 0;
  let poids = 0;
  let nb = 0;

  criteres.forEach((row) => {
    const id = critId(row);
    const raw = notesParCritere[id];
    if (raw === undefined || raw === "" || raw === null) return;

    const note = Number(raw);
    const pond = critPonderation(row);
    if (!Number.isFinite(note) || pond <= 0) return;

    points += note * pond;
    poids += pond;
    nb += 1;
  });

  if (poids <= 0) return null;

  return {
    score: points / poids,
    nombreNotes: nb,
    totalCriteres: criteres.length,
    complet: nb === criteres.length,
  };
}

function notesVersMap(notes) {
  const map = {};
  notes.forEach((n) => {
    if (n?.idCritere != null) map[n.idCritere] = n.note;
  });
  return map;
}

/* =====================================================
   PAGE
===================================================== */

export default function EvaluateurPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [offres, setOffres] = useState([]);
  const [publications, setPublications] = useState([]);
  const [photosParAppel, setPhotosParAppel] = useState({});
  const [criteresTous, setCriteresTous] = useState([]);
  const [scores, setScores] = useState({});

  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [notice, setNotice] = useState({ type: "", message: "" });

  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("TOUS");
  const [appelFilter, setAppelFilter] = useState("TOUS");
  const [fermes, setFermes] = useState({});
  const [zoom, setZoom] = useState(null);

  // Fenêtre d'évaluation
  const [offre, setOffre] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [notesSaisie, setNotesSaisie] = useState({});
  const [commentaires, setCommentaires] = useState({});
  const [notesSauvees, setNotesSauvees] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("dossier");
  const previewUrlRef = useRef(null);

  const showNotice = (type, message) => setNotice({ type, message });

  /* ---------- Chargement ---------- */

  const chargerScores = useCallback(async (liste, criteres) => {
    const entries = await Promise.all(
      liste.map(async (o) => {
        const id = getIdOffre(o);
        try {
          const notes = normalizeList(await apiRequest(`/api/notes/offre/${id}`));
          if (notes.length === 0) return [id, null];
          const crit = criteresPourAppel(criteres, getIdAppel(o));
          return [id, calculerScore(notesVersMap(notes), crit)];
        } catch {
          return [id, null];
        }
      })
    );
    setScores(Object.fromEntries(entries));
  }, []);

  const chargerPhotos = useCallback(async (ids) => {
    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          const data = normalizeList(
            await apiRequest(`/api/appel-offres/publications/${id}/photos`)
          );
          return [
            id,
            data.filter((p) => String(p?.typeContenu || "").startsWith("image/")),
          ];
        } catch {
          return [id, []];
        }
      })
    );
    setPhotosParAppel(Object.fromEntries(entries));
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionData, offresData, criteresData, pubData] =
        await Promise.all([
          apiRequest("/api/auth/session"),
          apiRequest("/api/offres/evaluateur"),
          apiRequest("/api/appel-offre-criteres"),
          apiRequest("/api/appel-offres/publications").catch(() => []),
        ]);

      const role = String(sessionData?.role || "").toUpperCase();
      if (role && role !== "EVALUATEUR") {
        throw new Error("Cette page est réservée au rôle EVALUATEUR.");
      }

      const liste = normalizeList(offresData);
      const criteres = normalizeList(criteresData);
      const pubs = normalizeList(pubData);

      setSession(sessionData);
      setOffres(liste);
      setCriteresTous(criteres);
      setPublications(pubs);

      const ids = [
        ...new Set(
          [...liste.map(getIdAppel), ...pubs.map((p) => p?.idAppelOffre)].filter(
            (x) => x != null
          )
        ),
      ];

      await Promise.all([chargerScores(liste, criteres), chargerPhotos(ids)]);
      return liste;
    } catch (error) {
      showNotice("error", error.message || "Chargement impossible.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [chargerScores, chargerPhotos]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  // Fenêtre : blocage du défilement + touche Échap
  useEffect(() => {
    if (!offre && !zoom) return;

    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function surTouche(e) {
      if (e.key !== "Escape") return;
      if (zoom) setZoom(null);
      else if (!saving) closeOffre();
    }

    window.addEventListener("keydown", surTouche);
    return () => {
      document.body.style.overflow = ancien;
      window.removeEventListener("keydown", surTouche);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offre, zoom, saving]);

  /* ---------- Données dérivées ---------- */

  const stats = useMemo(() => {
    const count = (s) => offres.filter((o) => statutOf(o) === s).length;
    return {
      total: offres.length,
      aEvaluer: count("DEPOSEE"),
      enCours: count("EN_EVALUATION"),
      evaluees: count("EVALUEE"),
    };
  }, [offres]);

  // Offres regroupées par appel d'offres
  const groupes = useMemo(() => {
    const map = new Map();

    offres.forEach((o) => {
      const id = getIdAppel(o);
      if (id == null) return;
      if (!map.has(id)) map.set(id, { id, appel: getAppel(o), offres: [] });
      map.get(id).offres.push(o);
    });

    publications.forEach((p) => {
      if (p?.idAppelOffre != null && !map.has(p.idAppelOffre)) {
        map.set(p.idAppelOffre, { id: p.idAppelOffre, appel: p, offres: [] });
      }
    });

    return [...map.values()].sort((a, b) => {
      const da = toDate(a.appel?.dateLimiteDepot)?.getTime() || 0;
      const db = toDate(b.appel?.dateLimiteDepot)?.getTime() || 0;
      return db - da;
    });
  }, [offres, publications]);

  const groupesFiltres = useMemo(() => {
    const term = search.trim().toLowerCase();

    return groupes
      .filter((g) => appelFilter === "TOUS" || String(g.id) === appelFilter)
      .map((g) => {
        const appelTexte = [g.appel?.reference, g.appel?.objet]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        const appelMatch = !!term && appelTexte.includes(term);

        const liste = g.offres.filter((o) => {
          const texte = [
            nomSoumissionnaire(o),
            o.email,
            o.nif,
            o.accuseDeReception,
          ]
            .map((v) => String(v || "").toLowerCase())
            .join(" ");

          const okTexte = !term || appelMatch || texte.includes(term);
          const okStatut = statutFilter === "TOUS" || statutOf(o) === statutFilter;
          return okTexte && okStatut;
        });

        return { ...g, offresFiltrees: liste, appelMatch };
      })
      .filter((g) => {
        const filtre = term || statutFilter !== "TOUS";
        return !filtre || g.offresFiltrees.length > 0 || g.appelMatch;
      });
  }, [groupes, search, statutFilter, appelFilter]);

  const classement = useMemo(
    () =>
      offres
        .map((o) => ({ offre: o, res: scores[getIdOffre(o)] }))
        .filter((x) => x.res)
        .sort((a, b) => {
          if (a.res.complet !== b.res.complet) return a.res.complet ? -1 : 1;
          return b.res.score - a.res.score;
        }),
    [offres, scores]
  );

  // Données du tableau de bord
  const dash = useMemo(() => {
    const statuts = [
      { label: "À évaluer", value: stats.aEvaluer, color: COLORS.pending },
      { label: "En cours", value: stats.enCours, color: COLORS.progress },
      { label: "Évaluées", value: stats.evaluees, color: COLORS.done },
    ];

    const parAppel = groupes
      .filter((g) => g.offres.length > 0)
      .map((g) => {
        const c = (s) => g.offres.filter((o) => statutOf(o) === s).length;
        return {
          label: g.appel?.reference || `#${g.id}`,
          objet: g.appel?.objet || "",
          a: c("DEPOSEE"),
          b: c("EN_EVALUATION"),
          c: c("EVALUEE"),
          total: g.offres.length,
        };
      });

    const jours = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      jours.push({
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        value: offres.filter((o) => toDate(o.dateDepot)?.toDateString() === key).length,
      });
    }

    const completes = classement.filter((x) => x.res.complet);
    const moyenne = completes.length
      ? completes.reduce((s, x) => s + x.res.score, 0) / completes.length
      : null;

    return {
      statuts,
      parAppel,
      jours,
      moyenne,
      top: classement.slice(0, 5),
      progression: stats.total ? Math.round((stats.evaluees / stats.total) * 100) : 0,
    };
  }, [stats, groupes, offres, classement]);

  const criteresOffre = useMemo(
    () => (offre ? criteresPourAppel(criteresTous, getIdAppel(offre)) : []),
    [offre, criteresTous]
  );

  const totalPonderation = useMemo(
    () => criteresOffre.reduce((s, r) => s + critPonderation(r), 0),
    [criteresOffre]
  );

  const scoreLive = useMemo(
    () => calculerScore(notesSaisie, criteresOffre),
    [notesSaisie, criteresOffre]
  );

  /* ---------- Ouvrir / fermer la fenêtre d'évaluation ---------- */

  function resetPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
  }

  async function reloadNotes(offreId) {
    const notes = normalizeList(await apiRequest(`/api/notes/offre/${offreId}`));
    setNotesSauvees(notes);

    const n = {};
    const c = {};
    notes.forEach((x) => {
      if (x.idCritere != null) {
        n[x.idCritere] = String(x.note ?? "");
        c[x.idCritere] = x.commentaire || "";
      }
    });
    setNotesSaisie(n);
    setCommentaires(c);
  }

  async function openOffre(o) {
    const id = getIdOffre(o);
    if (!id) return;

    setDetailLoading(true);
    setNotice({ type: "", message: "" });

    try {
      const docs = normalizeList(await apiRequest(`/api/offres/${id}/documents`));
      await reloadNotes(id);

      resetPreview();
      setDocuments(docs);
      setOffre(o);
      setDetailTab("dossier");
      setMobileMenu(false);
    } catch (error) {
      showNotice("error", error.message || "Impossible d'ouvrir le dossier.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeOffre() {
    resetPreview();
    setOffre(null);
    setDocuments([]);
    setNotesSaisie({});
    setCommentaires({});
    setNotesSauvees([]);
  }

  function navigateTo(tab) {
    closeOffre();
    setActiveTab(tab);
    setMobileMenu(false);
    setNotice({ type: "", message: "" });
  }

  /* ---------- Documents ---------- */

  async function previewDocument(doc) {
    if (!offre) return;
    setPreviewLoading(true);

    try {
      const blob = await fetchBlob(
        `/api/offres/${getIdOffre(offre)}/documents/${doc.cle}/telecharger`
      );
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);

      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;

      const type = blob.type || doc.typeContenu || "";
      setPreview({
        doc,
        url,
        kind: type.startsWith("image/")
          ? "image"
          : type.includes("pdf")
          ? "pdf"
          : "other",
      });
    } catch (error) {
      showNotice("error", error.message || "Aperçu impossible.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function downloadDocument(doc) {
    try {
      const blob = await fetchBlob(
        `/api/offres/${getIdOffre(offre)}/documents/${doc.cle}/telecharger`
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.nomFichier || doc.libelle || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showNotice("error", error.message || "Téléchargement impossible.");
    }
  }

  /* ---------- Notation ---------- */

  function updateNote(id, value) {
    if (value !== "") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 20) return;
    }
    setNotesSaisie((p) => ({ ...p, [id]: value }));
  }

  async function saveEvaluations(event) {
    event.preventDefault();
    if (!offre || saving) return;

    if (criteresOffre.length === 0) {
      showNotice("error", "Aucun critère n'est associé à cet appel d'offres.");
      return;
    }

    const notes = [];

    for (const row of criteresOffre) {
      const id = critId(row);
      const valeur = notesSaisie[id];

      if (valeur === undefined || valeur === "") {
        showNotice("error", `Veuillez noter le critère « ${critNom(row)} ».`);
        return;
      }

      notes.push({
        idCritere: Number(id),
        note: Number(valeur),
        commentaire: commentaires[id] || "",
      });
    }

    setSaving(true);
    setNotice({ type: "", message: "" });

    try {
      await apiRequest("/api/notes/evaluer", {
        method: "POST",
        body: JSON.stringify({ idOffre: Number(getIdOffre(offre)), notes }),
      });

      await reloadNotes(getIdOffre(offre));
      const liste = await loadDashboard();
      const maj = liste?.find((o) => getIdOffre(o) === getIdOffre(offre));
      if (maj) setOffre(maj);
      showNotice("success", "Évaluation enregistrée avec succès.");
    } catch (error) {
      showNotice("error", error.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(idCritere) {
    const saved = notesSauvees.find((n) => Number(n.idCritere) === Number(idCritere));
    if (!saved?.idNoter) return;

    if (!window.confirm("Supprimer cette note ? Cette action est irréversible.")) {
      return;
    }

    setDeletingId(saved.idNoter);

    try {
      await apiRequest(`/api/notes/${saved.idNoter}`, { method: "DELETE" });
      await reloadNotes(getIdOffre(offre));
      const liste = await loadDashboard();
      const maj = liste?.find((o) => getIdOffre(o) === getIdOffre(offre));
      if (maj) setOffre(maj);
      showNotice("success", "La note a été supprimée.");
    } catch (error) {
      showNotice("error", error.message || "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
    } catch {
      /* ignoré */
    } finally {
      router.push("/");
    }
  }

  /* =====================================================
     RENDU
  ===================================================== */

  const NAV = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "appels", label: "Appels d'offres", icon: FolderOpen },
    { id: "classement", label: "Classement", icon: Trophy },
  ];

  const noticeBox = notice.message ? (
    <div className={`ev-notice ${notice.type}`} role="alert">
      {notice.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <p>{notice.message}</p>
      <button
        type="button"
        onClick={() => setNotice({ type: "", message: "" })}
        aria-label="Fermer"
      >
        <X size={15} />
      </button>
    </div>
  ) : null;

  return (
    <main className="ev-app">
      {/* ===== Barre latérale ===== */}
      <aside className={`ev-side ${mobileMenu ? "is-open" : ""}`}>
        <div className="ev-brand">
          <img src="/spat.png" alt="Logo SPAT" />
          <div>
            <strong>SPAT</strong>
            <span>Espace évaluateur</span>
          </div>
          <button
            type="button"
            className="ev-icon-btn ev-only-mobile"
            onClick={() => setMobileMenu(false)}
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="ev-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={activeTab === id ? "active" : ""}
              onClick={() => navigateTo(id)}
            >
              <Icon size={18} />
              {label}
              {id === "appels" && stats.aEvaluer > 0 && (
                <span className="ev-nav-badge">{stats.aEvaluer}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="ev-side-bottom">
          <div className="ev-profile">
            <div className="ev-avatar">
              {(session?.nomComplet || "E").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{session?.nomComplet || "Évaluateur"}</strong>
              <span>{session?.matricule || "Compte connecté"}</span>
            </div>
          </div>
          <button type="button" className="ev-logout" onClick={logout}>
            <LogOut size={17} />
            Déconnexion
          </button>
        </div>
      </aside>

      {mobileMenu && <div className="ev-backdrop" onClick={() => setMobileMenu(false)} />}

      {/* ===== Contenu ===== */}
      <section className="ev-main">
        <header className="ev-topbar">
          <button
            type="button"
            className="ev-icon-btn ev-only-mobile"
            onClick={() => setMobileMenu(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>

          <div className="ev-topbar-title">
            <span>Port de Toamasina</span>
            <h1>{NAV.find((n) => n.id === activeTab)?.label}</h1>
          </div>

          <button
            type="button"
            className="ev-btn ev-btn-ghost"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "ev-spin" : ""} />
            Actualiser
          </button>
        </header>

        {!offre && noticeBox}

        {/* ================= TABLEAU DE BORD ================= */}
        {activeTab === "dashboard" && (
          <>
            <section className="ev-stats ev-stats-5">
              <Stat icon={FolderOpen} label="Appels d'offres" value={dash.parAppel.length} />
              <Stat icon={Users} label="Offres reçues" value={stats.total} />
              <Stat icon={Clock3} label="À évaluer" value={stats.aEvaluer} tone="pending" />
              <Stat icon={ClipboardCheck} label="Évaluées" value={stats.evaluees} tone="done" />
              <Stat
                icon={Gauge}
                label="Note moyenne"
                value={dash.moyenne != null ? `${formatScore(dash.moyenne)}` : "—"}
                suffix={dash.moyenne != null ? "/ 20" : ""}
              />
            </section>

            <div className="ev-dash-grid">
              <section className="ev-card ev-chart-card">
                <div className="ev-card-head">
                  <div>
                    <h3>Répartition des offres</h3>
                    <p>Par statut d'évaluation</p>
                  </div>
                </div>
                <div className="ev-donut-wrap">
                  <Donut
                    data={dash.statuts}
                    total={stats.total}
                    center={`${dash.progression}%`}
                    caption="évaluées"
                  />
                  <ul className="ev-legend">
                    {dash.statuts.map((s) => (
                      <li key={s.label}>
                        <i style={{ background: s.color }} />
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="ev-card ev-chart-card">
                <div className="ev-card-head">
                  <div>
                    <h3>Dépôts des 14 derniers jours</h3>
                    <p>Nombre d'offres reçues par jour</p>
                  </div>
                </div>
                <ColumnChart data={dash.jours} color={COLORS.progress} />
              </section>

              <section className="ev-card ev-chart-card ev-span-2">
                <div className="ev-card-head">
                  <div>
                    <h3>Avancement par appel d'offres</h3>
                    <p>Offres à évaluer, en cours et évaluées</p>
                  </div>
                </div>
                <StackedBars rows={dash.parAppel} />
              </section>

              <section className="ev-card ev-chart-card ev-span-2">
                <div className="ev-card-head">
                  <div>
                    <h3>Meilleures notes</h3>
                    <p>Top 5 des offres notées (note pondérée sur 20)</p>
                  </div>
                </div>
                {dash.top.length === 0 ? (
                  <p className="ev-empty-inline">Aucune offre notée pour le moment.</p>
                ) : (
                  <div className="ev-hbars">
                    {dash.top.map(({ offre: o, res }) => (
                      <div className="ev-hbar" key={getIdOffre(o)}>
                        <div className="ev-hbar-label">
                          <strong>{nomSoumissionnaire(o)}</strong>
                          <small>{getAppel(o).reference}</small>
                        </div>
                        <div className="ev-hbar-track">
                          <i
                            style={{
                              width: `${Math.min(100, (res.score / 20) * 100)}%`,
                              background: res.complet ? COLORS.done : COLORS.progress,
                            }}
                          />
                        </div>
                        <span className="ev-hbar-value">{formatScore(res.score)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {/* ================= APPELS D'OFFRES ================= */}
        {activeTab === "appels" && (
          <>
            <section className="ev-card ev-list-card ev-filters-card">
              <div className="ev-toolbar">
                <div className="ev-search">
                  <Search size={17} />
                  <input
                    type="search"
                    placeholder="Rechercher : appel d'offres, soumissionnaire, NIF, email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  value={appelFilter}
                  onChange={(e) => setAppelFilter(e.target.value)}
                  aria-label="Filtrer par appel d'offres"
                >
                  <option value="TOUS">Tous les appels d'offres</option>
                  {groupes.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.appel?.reference || `#${g.id}`}
                    </option>
                  ))}
                </select>

                <select
                  value={statutFilter}
                  onChange={(e) => setStatutFilter(e.target.value)}
                  aria-label="Filtrer par statut"
                >
                  <option value="TOUS">Tous les statuts</option>
                  <option value="DEPOSEE">À évaluer</option>
                  <option value="EN_EVALUATION">En cours</option>
                  <option value="EVALUEE">Évaluées</option>
                </select>
              </div>
            </section>

            {loading ? (
              <div className="ev-card">
                <div className="ev-loading">
                  <span className="ev-loader" />
                  Chargement des appels d'offres…
                </div>
              </div>
            ) : groupesFiltres.length === 0 ? (
              <div className="ev-card">
                <div className="ev-empty">
                  <FolderOpen size={34} />
                  <h3>Aucun appel d'offres trouvé</h3>
                  <p>Les appels d'offres et les dépôts apparaissent ici.</p>
                </div>
              </div>
            ) : (
              <div className="ev-appels">
                {groupesFiltres.map((g) => {
                  const appel = g.appel || {};
                  const photos = photosParAppel[g.id] || [];
                  const info = appelStatutInfo(appel);
                  const ferme = !!fermes[g.id];
                  const nbEval = g.offres.filter((o) => statutOf(o) === "EVALUEE").length;

                  return (
                    <article className="ev-appel" key={g.id}>
                      <div className="ev-appel-top">
                        {/* Images en haut */}
                        <div className="ev-appel-cover">
                          {photos.length > 0 ? (
                            <div className={`ev-gallery g${Math.min(photos.length, 4)}`}>
                              {photos.slice(0, 4).map((p, i) => (
                                <button
                                  type="button"
                                  key={p.idPhoto ?? i}
                                  onClick={() => setZoom(photoUrl(p))}
                                  aria-label="Agrandir la photo"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photoUrl(p)}
                                    alt={p.nomFichier || "Photo de l'appel d'offres"}
                                    loading="lazy"
                                  />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="ev-cover-empty">
                              <ImageOff size={30} />
                              <span>Aucune photo publiée</span>
                            </div>
                          )}
                        </div>

                        {/* Contenu de l'appel d'offres publié */}
                        <div className="ev-appel-info">
                          <div className="ev-appel-line">
                            <span className="ev-ref">{appel.reference || "—"}</span>
                            <span className={`ev-chip ${info.tone}`}>{info.label}</span>
                          </div>
                          <h3>{appel.objet || "Appel d'offres"}</h3>
                          {appel.description && (
                            <p className="ev-appel-desc">{appel.description}</p>
                          )}

                          <div className="ev-appel-meta">
                            <span>
                              <MapPin size={14} />
                              {appel.lieuExecution || "Lieu non précisé"}
                            </span>
                            <span>
                              <CalendarDays size={14} />
                              Limite : {formatDate(appel.dateLimiteDepot)}
                            </span>
                          </div>

                          <div className="ev-appel-counters">
                            <div>
                              <strong>{g.offres.length}</strong>
                              <span>offre(s) reçue(s)</span>
                            </div>
                            <div>
                              <strong>{nbEval}</strong>
                              <span>évaluée(s)</span>
                            </div>
                            <div>
                              <strong>
                                {g.offres.length
                                  ? Math.round((nbEval / g.offres.length) * 100)
                                  : 0}
                                %
                              </strong>
                              <span>d'avancement</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Liste des soumissionnaires en bas */}
                      <div className="ev-appel-list">
                        <button
                          type="button"
                          className="ev-appel-toggle"
                          onClick={() => setFermes((p) => ({ ...p, [g.id]: !p[g.id] }))}
                          aria-expanded={!ferme}
                        >
                          <Users size={17} />
                          <strong>Soumissionnaires ayant déposé une offre</strong>
                          <span className="ev-count">{g.offresFiltrees.length}</span>
                          <ChevronDown size={18} className={ferme ? "" : "ev-rot"} />
                        </button>

                        {!ferme &&
                          (g.offresFiltrees.length === 0 ? (
                            <p className="ev-empty-inline ev-m">
                              Aucun dépôt pour cet appel d'offres.
                            </p>
                          ) : (
                            <div className="ev-table-wrap">
                              <table className="ev-table">
                                <thead>
                                  <tr>
                                    <th>Soumissionnaire</th>
                                    <th>Contact</th>
                                    <th>Déposée le</th>
                                    <th>Statut</th>
                                    <th>Note</th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.offresFiltrees.map((o) => {
                                    const res = scores[getIdOffre(o)];
                                    const st = statutInfo(o);
                                    return (
                                      <tr key={getIdOffre(o)}>
                                        <td>
                                          <strong className="ev-cell-name">
                                            {nomSoumissionnaire(o)}
                                          </strong>
                                          <small>{typeLabel(o)}</small>
                                        </td>
                                        <td>
                                          <span className="ev-cell-line">{o.email || "—"}</span>
                                          <small>{o.telephone || ""}</small>
                                        </td>
                                        <td>{formatDate(o.dateDepot)}</td>
                                        <td>
                                          <span className={`ev-chip ${st.tone}`}>{st.label}</span>
                                        </td>
                                        <td>
                                          {res ? (
                                            <span className="ev-cell-score">
                                              <strong>{formatScore(res.score)}</strong> / 20
                                              {!res.complet && (
                                                <small>
                                                  {res.nombreNotes}/{res.totalCriteres} critères
                                                </small>
                                              )}
                                            </span>
                                          ) : (
                                            <span className="ev-muted">Non noté</span>
                                          )}
                                        </td>
                                        <td className="ev-cell-action">
                                          <button
                                            type="button"
                                            className="ev-btn ev-btn-primary ev-btn-sm"
                                            onClick={() => openOffre(o)}
                                            disabled={detailLoading}
                                          >
                                            Évaluer
                                            <ChevronRight size={15} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ================= CLASSEMENT ================= */}
        {activeTab === "classement" && (
          <section className="ev-card ev-list-card">
            <div className="ev-card-head ev-pad">
              <div>
                <h3>Classement des offres notées</h3>
                <p>
                  Les évaluations complètes passent en premier, puis tri par note pondérée
                  décroissante.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="ev-loading">
                <span className="ev-loader" />
                Calcul du classement…
              </div>
            ) : classement.length === 0 ? (
              <div className="ev-empty">
                <Trophy size={34} />
                <h3>Aucune offre notée</h3>
                <p>Le classement apparaîtra dès que des notes seront enregistrées.</p>
              </div>
            ) : (
              <ol className="ev-ranking">
                {classement.map(({ offre: o, res }, i) => (
                  <li key={getIdOffre(o)} className={res.complet && i === 0 ? "first" : ""}>
                    <span className="ev-rank">
                      {res.complet && i < 3 ? <Medal size={20} /> : i + 1}
                    </span>
                    <div className="ev-rank-info">
                      <strong>{nomSoumissionnaire(o)}</strong>
                      <small>
                        {getAppel(o).reference} · {getAppel(o).objet}
                      </small>
                      <span className={`ev-chip ${res.complet ? "done" : "progress"}`}>
                        {res.complet
                          ? "Évaluation complète"
                          : `Partielle ${res.nombreNotes}/${res.totalCriteres}`}
                      </span>
                    </div>
                    <div className="ev-rank-score">
                      <strong>{formatScore(res.score)}</strong>
                      <span>/ 20</span>
                    </div>
                    <button
                      type="button"
                      className="ev-btn ev-btn-soft"
                      onClick={() => openOffre(o)}
                      disabled={detailLoading}
                    >
                      Ouvrir
                      <ChevronRight size={15} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* ================= POP-UP D'EVALUATION ================= */}
        {offre && (
          <div
            className="ev-modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) closeOffre();
            }}
          >
            <section
              className="ev-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Évaluation du dossier"
            >
              <header className="ev-modal-head">
                <div className="ev-modal-title">
                  <div className="ev-hero-top">
                    <span className="ev-ref">
                      {getAppel(offre).reference || "Appel d'offres"}
                    </span>
                    <span className={`ev-chip ${statutInfo(offre).tone}`}>
                      {statutInfo(offre).label}
                    </span>
                  </div>
                  <h2>{nomSoumissionnaire(offre)}</h2>
                  <p>
                    {getAppel(offre).objet || "Offre à évaluer"} · déposée le{" "}
                    {formatDate(offre.dateDepot)}
                  </p>
                </div>

                <div className="ev-modal-score">
                  <span>Note pondérée</span>
                  <strong>
                    {scoreLive ? formatScore(scoreLive.score) : "—"}
                    <small> / 20</small>
                  </strong>
                  <div className="ev-progress">
                    <i
                      style={{
                        width: `${
                          criteresOffre.length
                            ? ((scoreLive?.nombreNotes || 0) / criteresOffre.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <em>
                    {scoreLive?.nombreNotes || 0} / {criteresOffre.length} critères
                  </em>
                </div>

                <button
                  type="button"
                  className="ev-icon-btn ev-modal-close"
                  onClick={closeOffre}
                  disabled={saving}
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="ev-modal-scroll">
                {noticeBox}

                {/* Onglets mobiles */}
                <div className="ev-segment ev-only-mobile-flex">
                  <button
                    type="button"
                    className={detailTab === "dossier" ? "active" : ""}
                    onClick={() => setDetailTab("dossier")}
                  >
                    Dossier
                  </button>
                  <button
                    type="button"
                    className={detailTab === "notation" ? "active" : ""}
                    onClick={() => setDetailTab("notation")}
                  >
                    Notation
                  </button>
                </div>

                <div className="ev-workspace">
                  {/* ---------- Dossier ---------- */}
                  <div className={`ev-col ${detailTab === "dossier" ? "" : "ev-hide-mobile"}`}>
                    <section className="ev-card">
                      <h3>Soumissionnaire</h3>
                      <dl className="ev-facts">
                        <Fact icon={Building2} label="Profil" value={typeLabel(offre)} />
                        {offre.entreprise && (
                          <Fact icon={Building2} label="Entreprise" value={offre.entreprise} />
                        )}
                        {offre.nomSoumissionnaire && (
                          <Fact icon={UserRound} label="Nom et prénom" value={offre.nomSoumissionnaire} />
                        )}
                        {offre.nif && <Fact icon={Hash} label="NIF" value={offre.nif} />}
                        {offre.stat && <Fact icon={Hash} label="STAT" value={offre.stat} />}
                        <Fact icon={MapPin} label="Adresse" value={offre.adresse} />
                        <Fact icon={Mail} label="Email" value={offre.email} />
                        <Fact icon={Phone} label="Téléphone" value={offre.telephone} />
                        <Fact icon={Hash} label="Accusé de réception" value={offre.accuseDeReception} mono />
                      </dl>
                    </section>

                    <section className="ev-card">
                      <div className="ev-card-head">
                        <h3>Pièces du dossier</h3>
                        <span className="ev-count">{documents.length}</span>
                      </div>

                      {documents.length === 0 ? (
                        <p className="ev-empty-inline">Aucun document déposé.</p>
                      ) : (
                        <ul className="ev-docs">
                          {documents.map((doc) => {
                            const Icon = docIcon(doc);
                            const active = preview?.doc?.cle === doc.cle;
                            return (
                              <li key={doc.cle} className={active ? "active" : ""}>
                                <span className="ev-doc-icon">
                                  <Icon size={19} />
                                </span>
                                <div className="ev-doc-text">
                                  <strong>{doc.libelle}</strong>
                                  <small>
                                    {doc.categorie} · {doc.nomFichier}
                                  </small>
                                </div>
                                <button
                                  type="button"
                                  className="ev-icon-btn"
                                  title="Aperçu"
                                  onClick={() => previewDocument(doc)}
                                >
                                  <Eye size={17} />
                                </button>
                                <button
                                  type="button"
                                  className="ev-icon-btn"
                                  title="Télécharger"
                                  onClick={() => downloadDocument(doc)}
                                >
                                  <Download size={17} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    {(preview || previewLoading) && (
                      <section className="ev-card ev-preview">
                        <div className="ev-card-head">
                          <h3>{preview?.doc?.libelle || "Chargement…"}</h3>
                          {preview && (
                            <button
                              type="button"
                              className="ev-icon-btn"
                              onClick={resetPreview}
                              aria-label="Fermer l'aperçu"
                            >
                              <X size={17} />
                            </button>
                          )}
                        </div>

                        {previewLoading ? (
                          <div className="ev-loading">
                            <span className="ev-loader" />
                            Chargement du document…
                          </div>
                        ) : preview.kind === "image" ? (
                          <img src={preview.url} alt={preview.doc.libelle} />
                        ) : preview.kind === "pdf" ? (
                          <iframe src={preview.url} title={preview.doc.libelle} />
                        ) : (
                          <p className="ev-empty-inline">
                            Aperçu indisponible pour ce format. Utilisez le téléchargement.
                          </p>
                        )}
                      </section>
                    )}
                  </div>

                  {/* ---------- Notation ---------- */}
                  <form
                    className={`ev-col ev-grid-col ${detailTab === "notation" ? "" : "ev-hide-mobile"}`}
                    onSubmit={saveEvaluations}
                  >
                    <section className="ev-card">
                      <div className="ev-card-head">
                        <div>
                          <h3>Grille de notation</h3>
                          <p>Chaque critère est noté sur 20.</p>
                        </div>
                        <span className="ev-count">
                          Σ pondérations : {totalPonderation.toLocaleString("fr-FR")} %
                        </span>
                      </div>

                      {criteresOffre.length === 0 ? (
                        <p className="ev-empty-inline">
                          Aucun critère n'est configuré pour cet appel d'offres.
                        </p>
                      ) : (
                        <div className="ev-criteria">
                          {criteresOffre.map((row) => {
                            const id = critId(row);
                            const valeur = notesSaisie[id] ?? "";
                            const saved = notesSauvees.find(
                              (n) => Number(n.idCritere) === Number(id)
                            );
                            const description = critDescription(row);

                            return (
                              <article className="ev-criterion" key={id}>
                                <header>
                                  <div>
                                    <h4>{critNom(row)}</h4>
                                    {description && <p>{description}</p>}
                                  </div>
                                  <span className="ev-weight">{critPonderation(row)} %</span>
                                </header>

                                <div className="ev-note-row">
                                  <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    step="0.5"
                                    value={valeur === "" ? 0 : valeur}
                                    onChange={(e) => updateNote(id, e.target.value)}
                                    disabled={saving}
                                    aria-label={`Curseur de note pour ${critNom(row)}`}
                                    className={valeur === "" ? "untouched" : ""}
                                  />
                                  <label className="ev-note-input">
                                    <input
                                      type="number"
                                      min="0"
                                      max="20"
                                      step="0.01"
                                      value={valeur}
                                      onChange={(e) => updateNote(id, e.target.value)}
                                      placeholder="–"
                                      disabled={saving}
                                    />
                                    <span>/ 20</span>
                                  </label>
                                </div>

                                <textarea
                                  rows={2}
                                  value={commentaires[id] ?? ""}
                                  onChange={(e) =>
                                    setCommentaires((p) => ({ ...p, [id]: e.target.value }))
                                  }
                                  placeholder="Justification (facultatif)"
                                  disabled={saving}
                                />

                                {saved && (
                                  <div className="ev-saved">
                                    <span>
                                      <CheckCircle2 size={14} />
                                      Note enregistrée : {Number(saved.note)} / 20
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => deleteNote(id)}
                                      disabled={deletingId === saved.idNoter}
                                    >
                                      {deletingId === saved.idNoter ? (
                                        <RefreshCw size={14} className="ev-spin" />
                                      ) : (
                                        <Trash2 size={14} />
                                      )}
                                      Supprimer
                                    </button>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {criteresOffre.length > 0 && (
                      <div className="ev-savebar">
                        <div>
                          <span>Note pondérée</span>
                          <strong>
                            {scoreLive ? formatScore(scoreLive.score) : "—"} / 20
                          </strong>
                        </div>
                        <button type="submit" className="ev-btn ev-btn-primary" disabled={saving}>
                          {saving ? (
                            <>
                              <RefreshCw size={16} className="ev-spin" />
                              Enregistrement…
                            </>
                          ) : (
                            <>
                              <Save size={16} />
                              Enregistrer l'évaluation
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= AGRANDISSEMENT D'UNE PHOTO ================= */}
        {zoom && (
          <div className="ev-lightbox" onClick={() => setZoom(null)}>
            <button
              type="button"
              className="ev-icon-btn"
              onClick={() => setZoom(null)}
              aria-label="Fermer"
            >
              <X size={22} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom} alt="Photo de l'appel d'offres" />
          </div>
        )}
      </section>
    </main>
  );
}

/* =====================================================
   COMPOSANTS
===================================================== */

function Fact({ icon: Icon, label, value, mono }) {
  return (
    <div className="ev-fact">
      <dt>
        <Icon size={14} />
        {label}
      </dt>
      <dd className={mono ? "mono" : ""}>{value || "Non renseigné"}</dd>
    </div>
  );
}

function Stat({ icon: Icon, label, value, suffix, tone = "" }) {
  return (
    <article className={`ev-stat ${tone}`}>
      <span className="ev-stat-label">
        {Icon && <Icon size={15} />}
        {label}
      </span>
      <strong>
        {value}
        {suffix && <small> {suffix}</small>}
      </strong>
    </article>
  );
}

/* ---------- Graphique en anneau ---------- */
function Donut({ data, total, center, caption }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <svg className="ev-donut" viewBox="0 0 140 140" role="img" aria-label="Répartition des offres par statut">
      <circle cx="70" cy="70" r={R} fill="none" stroke="#e8edf2" strokeWidth="16" />
      {total > 0 &&
        data.map((d) => {
          const len = (d.value / total) * C;
          const el = (
            <circle
              key={d.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
      <text x="70" y="68" textAnchor="middle" className="ev-donut-value">
        {center}
      </text>
      <text x="70" y="86" textAnchor="middle" className="ev-donut-caption">
        {caption}
      </text>
    </svg>
  );
}

/* ---------- Histogramme (dépôts par jour) ---------- */
function ColumnChart({ data, color }) {
  const W = 560;
  const H = 190;
  const padL = 28;
  const padB = 26;
  const padT = 10;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = Math.max(1, Math.ceil(max / 4));
  const top = Math.ceil(max / step) * step;
  const bw = (W - padL) / data.length;

  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  return (
    <svg className="ev-columns" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Dépôts par jour">
      {ticks.map((v) => {
        const y = padT + (H - padT - padB) * (1 - v / top);
        return (
          <g key={v}>
            <line x1={padL} x2={W} y1={y} y2={y} stroke="#e3e9ef" />
            <text x={padL - 6} y={y + 4} textAnchor="end" className="ev-axis">
              {v}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const h = (H - padT - padB) * (d.value / top);
        const x = padL + i * bw + bw * 0.18;
        const y = H - padB - h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={d.value ? y : H - padB - 1}
              width={bw * 0.64}
              height={d.value ? h : 1}
              rx="3"
              fill={color}
              opacity={d.value ? 1 : 0.25}
            >
              <title>{`${d.label} : ${d.value} offre(s)`}</title>
            </rect>
            {i % 2 === 0 && (
              <text x={x + bw * 0.32} y={H - 8} textAnchor="middle" className="ev-axis">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Barres empilées par appel d'offres ---------- */
function StackedBars({ rows }) {
  if (rows.length === 0) {
    return <p className="ev-empty-inline">Aucun dépôt pour le moment.</p>;
  }

  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="ev-stack">
      {rows.map((r) => (
        <div className="ev-stack-row" key={r.label}>
          <div className="ev-stack-label">
            <strong>{r.label}</strong>
            <small>{r.objet}</small>
          </div>

          <div className="ev-stack-track">
            <div className="ev-stack-bar" style={{ width: `${(r.total / max) * 100}%` }}>
              {r.c > 0 && (
                <i style={{ flex: r.c, background: COLORS.done }} title={`Évaluées : ${r.c}`}>
                  {r.c}
                </i>
              )}
              {r.b > 0 && (
                <i style={{ flex: r.b, background: COLORS.progress }} title={`En cours : ${r.b}`}>
                  {r.b}
                </i>
              )}
              {r.a > 0 && (
                <i style={{ flex: r.a, background: COLORS.pending }} title={`À évaluer : ${r.a}`}>
                  {r.a}
                </i>
              )}
            </div>
          </div>

          <span className="ev-stack-total">{r.total}</span>
        </div>
      ))}

      <ul className="ev-legend ev-legend-row">
        <li><i style={{ background: COLORS.done }} />Évaluées</li>
        <li><i style={{ background: COLORS.progress }} />En cours</li>
        <li><i style={{ background: COLORS.pending }} />À évaluer</li>
      </ul>
    </div>
  );
}