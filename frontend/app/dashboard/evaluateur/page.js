"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, FolderOpen, Trophy, Search, RefreshCw, LogOut, Menu, X,
  Download, Save, CheckCircle2, AlertCircle, Building2, UserRound, CalendarDays,
  MapPin, Mail, Phone, Hash, Eye, Trash2, FileText, FileImage, IdCard, Banknote,
  Wrench, ChevronRight, ChevronLeft, Medal, ImageOff, Users, Clock3,
  ClipboardCheck, Gauge, Send, Lock, Check,
} from "lucide-react";

import "../../css/evaluateur.css";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

/* Endpoints (ClassementController, côté backend) : transmission de la sélection d'UN appel
   d'offres au Responsable des marchés, et liste des appels déjà transmis. */
const TRANSMETTRE_URL = "/api/classements/transmettre";
const TRANSMIS_URL = "/api/classements/transmis";

/* =====================================================
   API
===================================================== */

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });

  const type = response.headers.get("content-type") || "";
  const raw = await response.text().catch(() => "");
  let data = null;

  if (raw) {
    if (type.includes("application/json")) {
      try { data = JSON.parse(raw); } catch { data = null; }
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
  const response = await fetch(`${API_BASE}${path}`, { credentials: "include" });
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
  Array.isArray(data) ? data
  : Array.isArray(data?.content) ? data.content
  : Array.isArray(data?.data) ? data.data
  : [];

const getIdOffre = (o) => o?.idOffre ?? o?.id;
const getAppel = (o) => o?.appelOffre ?? {};
const getIdAppel = (o) => getAppel(o)?.idAppelOffre;

function toDate(value) {
  if (!value) return null;
  const date = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
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
  Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COLORS = { pending: "#e8a33d", progress: "#1d5fa8", done: "#17803d" };

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
const critNom = (row) => row?.nomCritere ?? row?.critere?.nomCritere ?? "Critère";
const critDescription = (row) =>
  row?.descriptionCritere ?? row?.critere?.description ?? row?.description ?? "";
const critPonderation = (row) => {
  const n = Number(row?.ponderation ?? row?.critere?.ponderation ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function criteresPourAppel(criteres, appelId) {
  if (!appelId) return [];
  return criteres
    .filter(
      (row) =>
        Number(row?.idAppelOffre ?? row?.appelOffre?.idAppelOffre) === Number(appelId)
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
  /^https?:/i.test(photo?.url || "") ? photo.url : `${API_BASE}${photo?.url || ""}`;

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

/* Classement d'UN SEUL appel d'offres.
   - Seules les évaluations complètes sont classées (rang 1, 2, 3…, ex æquo gérés).
   - Les évaluations partielles sont listées à part, sans rang.
   - Le classement est « prêt » quand TOUTES les offres de l'appel sont complètement notées. */
function construireClassement(offresAppel, scores) {
  const notees = offresAppel
    .map((o) => ({ offre: o, res: scores[getIdOffre(o)] }))
    .filter((x) => x.res);

  const classes = notees
    .filter((x) => x.res.complet)
    .sort((a, b) => b.res.score - a.res.score);

  let rang = 0;
  let dernier = null;
  classes.forEach((x, i) => {
    const s = Math.round(x.res.score * 100) / 100;
    if (s !== dernier) {
      rang = i + 1;
      dernier = s;
    }
    x.rang = rang;
  });

  const partiels = notees
    .filter((x) => !x.res.complet)
    .sort((a, b) => b.res.score - a.res.score);

  return {
    classes,
    partiels,
    nonNotees: offresAppel.length - notees.length,
    total: offresAppel.length,
    pret: offresAppel.length > 0 && classes.length === offresAppel.length,
  };
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
  // Date courante : lue côté client après le montage (évite `new Date()` pendant le prérendu)
  const [maintenant, setMaintenant] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [notice, setNotice] = useState({ type: "", message: "" });

  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("TOUS");
  const [zoom, setZoom] = useState(null);

  // Appel d'offres sélectionné (vue détaillée) + onglet interne
  const [selectedAppelId, setSelectedAppelId] = useState(null);
  const [appelTab, setAppelTab] = useState("soumissionnaires");
  // Appel choisi dans l'onglet « Classement »
  const [classementAppelId, setClassementAppelId] = useState("");
  // Transmissions au Responsable des marchés
  const [transmis, setTransmis] = useState({});
  const [transmitting, setTransmitting] = useState(null);
  const [appelsTransmis, setAppelsTransmis] = useState([]);
  // Offres cochées pour la transmission : { [idAppelOffre]: [idOffre, ...] }
  const [selection, setSelection] = useState({});

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
          return [id, data.filter((p) => String(p?.typeContenu || "").startsWith("image/"))];
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
      const [sessionData, offresData, criteresData, pubData, transmisData] = await Promise.all([
        apiRequest("/api/auth/session"),
        apiRequest("/api/offres/evaluateur"),
        apiRequest("/api/appel-offre-criteres"),
        apiRequest("/api/appel-offres/publications").catch(() => []),
        apiRequest(TRANSMIS_URL).catch(() => []),
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
      setAppelsTransmis(normalizeList(transmisData).map(Number));

      const ids = [
        ...new Set(
          [...liste.map(getIdAppel), ...pubs.map((p) => p?.idAppelOffre)].filter((x) => x != null)
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
    setMaintenant(new Date());
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

  // Seuls les appels ayant reçu des dépôts sont classables
  const groupesAvecDepots = useMemo(
    () => groupes.filter((g) => g.offres.length > 0),
    [groupes]
  );

  // Un classement INDÉPENDANT par appel d'offres
  const classements = useMemo(() => {
    const out = {};
    groupes.forEach((g) => {
      out[g.id] = construireClassement(g.offres, scores);
    });
    return out;
  }, [groupes, scores]);

  const appelSelectionne = useMemo(
    () => groupes.find((g) => g.id === selectedAppelId) || null,
    [groupes, selectedAppelId]
  );

  // Soumissionnaires de l'appel sélectionné UNIQUEMENT (+ filtres)
  const offresFiltrees = useMemo(() => {
    if (!appelSelectionne) return [];
    const term = search.trim().toLowerCase();

    return appelSelectionne.offres.filter((o) => {
      const texte = [nomSoumissionnaire(o), o.email, o.nif, o.accuseDeReception]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      const okTexte = !term || texte.includes(term);
      const okStatut = statutFilter === "TOUS" || statutOf(o) === statutFilter;
      return okTexte && okStatut;
    });
  }, [appelSelectionne, search, statutFilter]);

  // Appel affiché dans l'onglet « Classement »
  const classementGroupe = useMemo(() => {
    if (groupesAvecDepots.length === 0) return null;
    return (
      groupesAvecDepots.find((g) => String(g.id) === String(classementAppelId)) ||
      groupesAvecDepots[0]
    );
  }, [groupesAvecDepots, classementAppelId]);

  // Données du tableau de bord
  const dash = useMemo(() => {
    const statuts = [
      { label: "À évaluer", value: stats.aEvaluer, color: COLORS.pending },
      { label: "En cours", value: stats.enCours, color: COLORS.progress },
      { label: "Évaluées", value: stats.evaluees, color: COLORS.done },
    ];

    const parAppel = groupesAvecDepots.map((g) => {
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
      if (!maintenant) {
        jours.push({ label: "", value: 0 });
        continue;
      }
      const d = new Date(maintenant);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      jours.push({
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        value: offres.filter((o) => toDate(o.dateDepot)?.toDateString() === key).length,
      });
    }

    const completes = Object.values(scores).filter((r) => r?.complet);
    const moyenne = completes.length
      ? completes.reduce((s, r) => s + r.score, 0) / completes.length
      : null;

    // Meilleure offre de CHAQUE appel d'offres
    const leaders = groupesAvecDepots
      .map((g) => ({ g, premier: classements[g.id]?.classes[0] }))
      .filter((x) => x.premier);

    return {
      statuts,
      parAppel,
      jours,
      moyenne,
      leaders,
      progression: stats.total ? Math.round((stats.evaluees / stats.total) * 100) : 0,
    };
  }, [stats, groupesAvecDepots, offres, scores, classements, maintenant]);

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

  const aTransmettre = useMemo(
    () =>
      groupesAvecDepots.filter(
        (g) => (classements[g.id]?.classes.length || 0) > 0 && !estTransmis(g)
      ).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupesAvecDepots, classements, transmis]
  );

  function estTransmis(g) {
    return !!(transmis[g.id] || appelsTransmis.includes(Number(g.id)));
  }

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
    setSelectedAppelId(null);
    setMobileMenu(false);
    setNotice({ type: "", message: "" });
  }

  function selectAppel(id, tab = "soumissionnaires") {
    setSelectedAppelId(id);
    setAppelTab(tab);
    setSearch("");
    setStatutFilter("TOUS");
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
        kind: type.startsWith("image/") ? "image" : type.includes("pdf") ? "pdf" : "other",
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
      showNotice("success", "Évaluation enregistrée. Le classement de l'appel d'offres a été mis à jour.");
    } catch (error) {
      showNotice("error", error.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(idCritere) {
    const saved = notesSauvees.find((n) => Number(n.idCritere) === Number(idCritere));
    if (!saved?.idNoter) return;

    if (!window.confirm("Supprimer cette note ? Cette action est irréversible.")) return;

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

  /* ---------- Sélection des offres à transmettre ---------- */

  function toggleSelection(idAppel, idOffre) {
    setSelection((p) => {
      const actuel = p[idAppel] || [];
      const suivant = actuel.includes(idOffre)
        ? actuel.filter((x) => x !== idOffre)
        : [...actuel, idOffre];
      return { ...p, [idAppel]: suivant };
    });
  }

  function selectionnerTout(idAppel, ids) {
    setSelection((p) => ({ ...p, [idAppel]: ids }));
  }

  function viderSelection(idAppel) {
    setSelection((p) => ({ ...p, [idAppel]: [] }));
  }

  /* ---------- Transmission au Responsable des marchés (par appel d'offres) ---------- */

  async function transmettreClassement(g) {
    const c = classements[g.id];
    if (!c || estTransmis(g) || transmitting) return;

    // Seules les offres classées ET cochées sont transmises (ordre du classement)
    const cochees = selection[g.id] || [];
    const retenues = c.classes.filter((x) => cochees.includes(getIdOffre(x.offre)));

    if (retenues.length === 0) {
      showNotice("error", "Sélectionnez au moins une offre à transmettre.");
      return;
    }

    const ref = g.appel?.reference || `#${g.id}`;
    const avert = c.pret
      ? ""
      : `\n\nAttention : ${c.total - c.classes.length} offre(s) de cet appel ne sont pas encore évaluées complètement.`;

    if (
      !window.confirm(
        `Transmettre ${retenues.length} offre(s) de l'appel d'offres ${ref} au Responsable des marchés pour publication ?${avert}`
      )
    ) {
      return;
    }

    setTransmitting(g.id);
    setNotice({ type: "", message: "" });

    try {
      await apiRequest(TRANSMETTRE_URL, {
        method: "POST",
        body: JSON.stringify({
          idAppelOffre: Number(g.id),
          classement: retenues.map((x) => ({
            idOffre: Number(getIdOffre(x.offre)),
            rang: x.rang,
            note: Number(x.res.score.toFixed(2)),
          })),
        }),
      });
      setTransmis((p) => ({ ...p, [g.id]: new Date().toISOString() }));
      showNotice(
        "success",
        `${retenues.length} offre(s) de ${ref} transmise(s) au Responsable des marchés.`
      );
    } catch (error) {
      showNotice("error", error.message || "Transmission impossible.");
    } finally {
      setTransmitting(null);
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
      <button type="button" onClick={() => setNotice({ type: "", message: "" })} aria-label="Fermer">
        <X size={15} />
      </button>
    </div>
  ) : null;

  const rankingProps = {
    onOpen: openOffre,
    onTransmit: transmettreClassement,
    selection,
    onToggle: toggleSelection,
    onSelectAll: selectionnerTout,
    onClear: viderSelection,
    detailLoading,
    transmitting,
    estTransmis,
    dateTransmission: (g) => transmis[g.id],
  };

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
              {id === "classement" && aTransmettre > 0 && (
                <span className="ev-nav-badge">{aTransmettre}</span>
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

          <button type="button" className="ev-btn ev-btn-ghost" onClick={loadDashboard} disabled={loading}>
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
                value={dash.moyenne != null ? formatScore(dash.moyenne) : "—"}
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
                    <h3>Meilleure offre de chaque appel d'offres</h3>
                    <p>Premier de chaque classement (note pondérée sur 20)</p>
                  </div>
                </div>
                {dash.leaders.length === 0 ? (
                  <p className="ev-empty-inline">Aucune évaluation complète pour le moment.</p>
                ) : (
                  <div className="ev-hbars">
                    {dash.leaders.map(({ g, premier }) => (
                      <div className="ev-hbar" key={g.id}>
                        <div className="ev-hbar-label">
                          <strong>{nomSoumissionnaire(premier.offre)}</strong>
                          <small>{g.appel?.reference}</small>
                        </div>
                        <div className="ev-hbar-track">
                          <i
                            style={{
                              width: `${Math.min(100, (premier.res.score / 20) * 100)}%`,
                              background: classements[g.id]?.pret ? COLORS.done : COLORS.progress,
                            }}
                          />
                        </div>
                        <span className="ev-hbar-value">{formatScore(premier.res.score)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {/* ================= APPELS D'OFFRES : LISTE ================= */}
        {activeTab === "appels" && !appelSelectionne && (
          <>
            <section className="ev-card ev-list-card ev-filters-card">
              <div className="ev-card-head ev-pad">
                <div>
                  <h3>Sélectionnez un appel d'offres</h3>
                  <p>
                    Vous évaluerez uniquement les soumissionnaires ayant déposé une offre pour
                    l'appel choisi. Chaque appel a son propre classement.
                  </p>
                </div>
              </div>
            </section>

            {loading ? (
              <div className="ev-card">
                <div className="ev-loading">
                  <span className="ev-loader" />
                  Chargement des appels d'offres…
                </div>
              </div>
            ) : groupes.length === 0 ? (
              <div className="ev-card">
                <div className="ev-empty">
                  <FolderOpen size={34} />
                  <h3>Aucun appel d'offres</h3>
                  <p>Les appels d'offres et les dépôts apparaissent ici.</p>
                </div>
              </div>
            ) : (
              <div className="ev-appels">
                {groupes.map((g) => (
                  <AppelCard
                    key={g.id}
                    g={g}
                    photos={photosParAppel[g.id] || []}
                    classement={classements[g.id]}
                    transmis={estTransmis(g)}
                    onZoom={setZoom}
                    onSelect={() => selectAppel(g.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= APPELS D'OFFRES : DÉTAIL D'UN APPEL ================= */}
        {activeTab === "appels" && appelSelectionne && (
          <>
            <section className="ev-appel ev-appel-head">
              <div className="ev-appel-top">
                <div className="ev-appel-info">
                  <button
                    type="button"
                    className="ev-btn ev-btn-ghost ev-btn-sm"
                    onClick={() => setSelectedAppelId(null)}
                  >
                    <ChevronLeft size={15} />
                    Tous les appels d'offres
                  </button>
                  <div className="ev-appel-line">
                    <span className="ev-ref">{appelSelectionne.appel?.reference || "—"}</span>
                    <span className={`ev-chip ${appelStatutInfo(appelSelectionne.appel).tone}`}>
                      {appelStatutInfo(appelSelectionne.appel).label}
                    </span>
                  </div>
                  <h3>{appelSelectionne.appel?.objet || "Appel d'offres"}</h3>
                  <div className="ev-appel-meta">
                    <span>
                      <MapPin size={14} />
                      {appelSelectionne.appel?.lieuExecution || "Lieu non précisé"}
                    </span>
                    <span>
                      <CalendarDays size={14} />
                      Limite : {formatDate(appelSelectionne.appel?.dateLimiteDepot)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <div className="ev-segment ev-tabs">
              <button
                type="button"
                className={appelTab === "soumissionnaires" ? "active" : ""}
                onClick={() => setAppelTab("soumissionnaires")}
              >
                Soumissionnaires ({appelSelectionne.offres.length})
              </button>
              <button
                type="button"
                className={appelTab === "classement" ? "active" : ""}
                onClick={() => setAppelTab("classement")}
              >
                Classement
              </button>
            </div>

            {appelTab === "soumissionnaires" && (
              <section className="ev-card ev-list-card">
                <div className="ev-toolbar">
                  <div className="ev-search">
                    <Search size={17} />
                    <input
                      type="search"
                      placeholder="Rechercher : soumissionnaire, NIF, email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
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

                {offresFiltrees.length === 0 ? (
                  <p className="ev-empty-inline ev-m">
                    Aucun soumissionnaire n'a déposé d'offre pour cet appel d'offres.
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
                        {offresFiltrees.map((o) => {
                          const res = scores[getIdOffre(o)];
                          const st = statutInfo(o);
                          return (
                            <tr key={getIdOffre(o)}>
                              <td>
                                <strong className="ev-cell-name">{nomSoumissionnaire(o)}</strong>
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
                )}
              </section>
            )}

            {appelTab === "classement" && (
              <RankingPanel
                g={appelSelectionne}
                classement={classements[appelSelectionne.id]}
                {...rankingProps}
              />
            )}
          </>
        )}

        {/* ================= CLASSEMENT (un appel d'offres à la fois) ================= */}
        {activeTab === "classement" && (
          <>
            <section className="ev-card ev-list-card ev-filters-card">
              <div className="ev-toolbar">
                <select
                  value={classementGroupe ? String(classementGroupe.id) : ""}
                  className="ev-select-wide"
                  onChange={(e) => setClassementAppelId(e.target.value)}
                  aria-label="Choisir un appel d'offres"
                  disabled={groupesAvecDepots.length === 0}
                >
                  {groupesAvecDepots.length === 0 && <option value="">Aucun appel avec dépôts</option>}
                  {groupesAvecDepots.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.appel?.reference || `#${g.id}`} — {g.appel?.objet || "Appel d'offres"}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {loading ? (
              <div className="ev-card">
                <div className="ev-loading">
                  <span className="ev-loader" />
                  Calcul du classement…
                </div>
              </div>
            ) : !classementGroupe ? (
              <div className="ev-card">
                <div className="ev-empty">
                  <Trophy size={34} />
                  <h3>Aucun dépôt reçu</h3>
                  <p>Le classement apparaît pour chaque appel d'offres ayant reçu des dépôts.</p>
                </div>
              </div>
            ) : (
              <RankingPanel
                g={classementGroupe}
                classement={classements[classementGroupe.id]}
                {...rankingProps}
              />
            )}
          </>
        )}

        {/* ================= POP-UP D'EVALUATION ================= */}
        {offre && (
          <div
            className="ev-modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) closeOffre();
            }}
          >
            <section className="ev-modal" role="dialog" aria-modal="true" aria-label="Évaluation du dossier">
              <header className="ev-modal-head">
                <div className="ev-modal-title">
                  <div className="ev-hero-top">
                    <span className="ev-ref">{getAppel(offre).reference || "Appel d'offres"}</span>
                    <span className={`ev-chip ${statutInfo(offre).tone}`}>{statutInfo(offre).label}</span>
                  </div>
                  <h2>{nomSoumissionnaire(offre)}</h2>
                  <p>
                    {getAppel(offre).objet || "Offre à évaluer"} · déposée le {formatDate(offre.dateDepot)}
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
                        {offre.entreprise && <Fact icon={Building2} label="Entreprise" value={offre.entreprise} />}
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
                                <button type="button" className="ev-icon-btn" title="Aperçu" onClick={() => previewDocument(doc)}>
                                  <Eye size={17} />
                                </button>
                                <button type="button" className="ev-icon-btn" title="Télécharger" onClick={() => downloadDocument(doc)}>
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
                            <button type="button" className="ev-icon-btn" onClick={resetPreview} aria-label="Fermer l'aperçu">
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
                        <p className="ev-empty-inline">Aucun critère n'est configuré pour cet appel d'offres.</p>
                      ) : (
                        <div className="ev-criteria">
                          {criteresOffre.map((row) => {
                            const id = critId(row);
                            const valeur = notesSaisie[id] ?? "";
                            const saved = notesSauvees.find((n) => Number(n.idCritere) === Number(id));
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
                                  onChange={(e) => setCommentaires((p) => ({ ...p, [id]: e.target.value }))}
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
                          <strong>{scoreLive ? formatScore(scoreLive.score) : "—"} / 20</strong>
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
            <button type="button" className="ev-icon-btn" onClick={() => setZoom(null)} aria-label="Fermer">
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

/* ---------- Carte d'un appel d'offres (liste) ---------- */
function AppelCard({ g, photos, classement, transmis, onZoom, onSelect }) {
  const appel = g.appel || {};
  const info = appelStatutInfo(appel);
  const nbEval = g.offres.filter((o) => statutOf(o) === "EVALUEE").length;
  const pct = g.offres.length ? Math.round((nbEval / g.offres.length) * 100) : 0;

  return (
    <article className="ev-appel">
      <div className="ev-appel-top">
        <div className="ev-appel-cover">
          {photos.length > 0 ? (
            <div className={`ev-gallery g${Math.min(photos.length, 4)}`}>
              {photos.slice(0, 4).map((p, i) => (
                <button
                  type="button"
                  key={p.idPhoto ?? i}
                  onClick={() => onZoom(photoUrl(p))}
                  aria-label="Agrandir la photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p)} alt={p.nomFichier || "Photo de l'appel d'offres"} loading="lazy" />
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

        <div className="ev-appel-info">
          <div className="ev-appel-line">
            <span className="ev-ref">{appel.reference || "—"}</span>
            <span className={`ev-chip ${info.tone}`}>{info.label}</span>
            {transmis && <span className="ev-chip done">Transmis</span>}
          </div>
          <h3>{appel.objet || "Appel d'offres"}</h3>
          {appel.description && <p className="ev-appel-desc">{appel.description}</p>}

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
              <strong>{pct}%</strong>
              <span>d'avancement</span>
            </div>
          </div>

          <div className="ev-appel-line">
            <button
              type="button"
              className="ev-btn ev-btn-primary ev-btn-sm"
              onClick={onSelect}
              disabled={g.offres.length === 0}
            >
              {g.offres.length === 0 ? "Aucun dépôt" : "Sélectionner et évaluer"}
              {g.offres.length > 0 && <ChevronRight size={15} />}
            </button>
            {classement?.pret && !transmis && (
              <span className="ev-chip progress">Classement prêt</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------- Classement d'UN appel d'offres + sélection + transmission ---------- */
function RankingPanel({
  g, classement, selection, onToggle, onSelectAll, onClear,
  onOpen, onTransmit, detailLoading, transmitting, estTransmis, dateTransmission,
}) {
  if (!g || !classement) return null;

  const { classes, partiels, nonNotees, total, pret } = classement;
  const transmisOk = estTransmis(g);
  const date = dateTransmission(g);
  const enCours = transmitting === g.id;
  const ref = g.appel?.reference || `#${g.id}`;

  const idsClasses = classes.map((x) => getIdOffre(x.offre));
  const choisis = (selection?.[g.id] || []).filter((id) => idsClasses.includes(id));
  const nb = choisis.length;
  const toutCoche = idsClasses.length > 0 && nb === idsClasses.length;

  let aide = "";
  if (transmisOk) {
    aide = `Sélection transmise au Responsable des marchés${
      date && typeof date === "string" && date.length > 5 ? ` le ${formatDate(date)}` : ""
    }.`;
  } else if (nb === 0) {
    aide = "Cochez une ou plusieurs offres classées à transmettre.";
  } else {
    aide = `${nb} offre(s) sélectionnée(s) sur ${classes.length} classée(s).`;
  }
  if (!transmisOk && !pret && classes.length > 0) {
    aide += ` ${total - classes.length} offre(s) pas encore évaluée(s) complètement.`;
  }

  return (
    <section className="ev-card ev-list-card">
      <div className="ev-card-head ev-pad">
        <div>
          <h3>Classement — {ref}</h3>
          <p>
            {g.appel?.objet || "Appel d'offres"} · {total} soumissionnaire(s). Ce classement est
            indépendant de ceux des autres appels d'offres.
          </p>
        </div>
        <span className={`ev-chip ${transmisOk || pret ? "done" : "progress"}`}>
          {transmisOk ? "Transmis" : pret ? "Évaluation terminée" : "En cours d'évaluation"}
        </span>
      </div>

      {classes.length === 0 && partiels.length === 0 ? (
        <div className="ev-empty">
          <Trophy size={34} />
          <h3>Aucune offre notée</h3>
          <p>Évaluez les soumissionnaires de cet appel d'offres pour générer le classement.</p>
        </div>
      ) : (
        <>
          {classes.length > 0 && (
            <div className="ev-select-bar">
              <span>
                <strong>{nb}</strong> / {classes.length} sélectionnée(s)
              </span>
              {!transmisOk && (
                <div>
                  <button
                    type="button"
                    className="ev-link-btn"
                    onClick={() => onSelectAll(g.id, idsClasses)}
                    disabled={toutCoche}
                  >
                    Tout sélectionner
                  </button>
                  <button
                    type="button"
                    className="ev-link-btn"
                    onClick={() => onClear(g.id)}
                    disabled={nb === 0}
                  >
                    Tout désélectionner
                  </button>
                </div>
              )}
            </div>
          )}

          <ol className="ev-ranking">
            {classes.map(({ offre: o, res, rang }) => {
              const id = getIdOffre(o);
              const coche = choisis.includes(id);
              return (
                <li
                  key={id}
                  className={`${rang === 1 ? "first" : ""} ${coche ? "selected" : ""}`}
                >
                  <button
                    type="button"
                    className={`ev-check ${coche ? "on" : ""}`}
                    role="checkbox"
                    aria-checked={coche}
                    aria-label={`${coche ? "Désélectionner" : "Sélectionner"} ${nomSoumissionnaire(o)}`}
                    onClick={() => onToggle(g.id, id)}
                    disabled={transmisOk}
                  >
                    {coche && <Check size={14} strokeWidth={3} />}
                  </button>
                  <span className="ev-rank">{rang <= 3 ? <Medal size={20} /> : rang}</span>
                  <div className="ev-rank-info">
                    <strong>
                      {rang <= 3 ? `${rang}${rang === 1 ? "er" : "e"} · ` : ""}
                      {nomSoumissionnaire(o)}
                    </strong>
                    <small>{typeLabel(o)} · déposée le {formatDate(o.dateDepot)}</small>
                    <span className="ev-chip done">Évaluation complète</span>
                  </div>
                  <div className="ev-rank-score">
                    <strong>{formatScore(res.score)}</strong>
                    <span>/ 20</span>
                  </div>
                  <button
                    type="button"
                    className="ev-btn ev-btn-soft"
                    onClick={() => onOpen(o)}
                    disabled={detailLoading}
                  >
                    Ouvrir
                    <ChevronRight size={15} />
                  </button>
                </li>
              );
            })}

            {partiels.map(({ offre: o, res }) => (
              <li key={getIdOffre(o)} className="partial">
                <span className="ev-check ev-check-off" title="Évaluation incomplète : non sélectionnable" />
                <span className="ev-rank">–</span>
                <div className="ev-rank-info">
                  <strong>{nomSoumissionnaire(o)}</strong>
                  <small>Non classé : évaluation incomplète</small>
                  <span className="ev-chip progress">
                    Partielle {res.nombreNotes}/{res.totalCriteres}
                  </span>
                </div>
                <div className="ev-rank-score">
                  <strong>{formatScore(res.score)}</strong>
                  <span>/ 20</span>
                </div>
                <button
                  type="button"
                  className="ev-btn ev-btn-soft"
                  onClick={() => onOpen(o)}
                  disabled={detailLoading}
                >
                  Ouvrir
                  <ChevronRight size={15} />
                </button>
              </li>
            ))}
          </ol>

          {nonNotees > 0 && (
            <p className="ev-empty-inline ev-m">{nonNotees} offre(s) pas encore notée(s).</p>
          )}
        </>
      )}

      <div className="ev-validate">
        <div>
          <span>Validation</span>
          <strong>{aide}</strong>
        </div>
        <button
          type="button"
          className="ev-btn ev-btn-primary"
          onClick={() => onTransmit(g)}
          disabled={nb === 0 || transmisOk || enCours}
        >
          {enCours ? (
            <>
              <RefreshCw size={16} className="ev-spin" />
              Transmission…
            </>
          ) : transmisOk ? (
            <>
              <Lock size={16} />
              Transmis
            </>
          ) : (
            <>
              <Send size={16} />
              Transmettre la sélection{nb > 0 ? ` (${nb})` : ""}
            </>
          )}
        </button>
      </div>
    </section>
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
