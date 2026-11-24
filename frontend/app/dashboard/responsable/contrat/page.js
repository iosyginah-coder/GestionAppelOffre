"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ChartNoAxesCombined,
  Megaphone,
  ClipboardList,
  Inbox,
  FileSignature,
  LogOut,
  Menu,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Sun,
  Moon,
  Filter,
  ChevronRight,
  Building2,
  UserRound,
  Plus,
  Pencil,
  Eye,
  Printer,
  PenLine,
  Trash2,
  Trophy,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

import "../../../css/responsable.css";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const THEME_KEY = "spat-responsable-theme";

/* Endpoints du ContratController (backend) :
   - GET    /api/contrats/responsable        -> soumissionnaires publiés (fournisseurs / prestataires)
   - POST   /api/contrats/offre/{idOffre}    -> établir un contrat
   - PUT    /api/contrats/{id}               -> modifier (brouillon)
   - POST   /api/contrats/{id}/signer        -> signer
   - DELETE /api/contrats/{id}               -> supprimer (brouillon) */
const CONTRATS_URL = "/api/contrats";
const LISTE_URL = `${CONTRATS_URL}/responsable`;

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
  { id: "contrat", label: "Contrats", icon: FileSignature },
  { id: "rapports", label: "Rapports", icon: ChartNoAxesCombined },
];

const ROUTES = {
  critereevaluation: "/dashboard/responsable/critereevaluation",
  listetransmise: "/dashboard/responsable/listetransmise",
  contrat: "/dashboard/responsable/contrat",
};

const TYPES = {
  FOURNISSEUR: {
    cle: "fournisseurs",
    titre: "Contrat Fournisseur",
    sousTitre: "Fourniture de biens — entreprises",
    partie: "Fournisseur",
    vide: "Aucun fournisseur retenu pour cet appel d'offres.",
  },
  PRESTATAIRE: {
    cle: "prestataires",
    titre: "Contrat Prestataire",
    sousTitre: "Prestation de services — personnes physiques",
    partie: "Prestataire",
    vide: "Aucun prestataire retenu pour cet appel d'offres.",
  },
};

const FORM_VIDE = {
  objet: "",
  montant: "",
  delaiValeur: "",
  delaiUnite: "JOUR",
  dateDebut: "",
  lieuExecution: "",
  clauses: "",
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

function nombreOuNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Les dates du contrat arrivent au format "AAAA-MM-JJ" : pas de décalage de fuseau
function versDateLocale(value) {
  if (!value) return null;

  if (Array.isArray(value)) {
    return new Date(value[0], (value[1] || 1) - 1, value[2] || 1);
  }

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = versDateLocale(value);
  if (!date) return "—";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateLongue(value) {
  const date = versDateLocale(value);
  if (!date) return "…………………";

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatNote(value) {
  const n = nombreOuNull(value);
  if (n === null) return "—";

  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Ex. : "15 jours", "6 mois", "1 an", "2 ans" à partir de { delaiValeur, delaiUnite }
function formatDelai(d) {
  const v = Number(d?.delaiValeur) || 0;
  if (v <= 0) return "—";

  const unite = String(d?.delaiUnite || "JOUR").toUpperCase();

  if (unite === "MOIS") return `${v} mois`;
  if (unite === "ANNEE") return `${v} ${v > 1 ? "ans" : "an"}`;
  return `${v} ${v > 1 ? "jours" : "jour"}`;
}

function formatMontant(value) {
  const n = nombreOuNull(value);
  if (n === null) return "—";

  return `${n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} Ar`;
}

function echapper(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normaliserLigne(s) {
  return {
    idOffre: s.idOffre,
    accuse: s.accuseDeReception || "",
    type: String(s.type || "").toUpperCase(),
    nom: s.nom || `Offre n° ${s.idOffre}`,
    adresse: s.adresse || "",
    nif: s.nif || "",
    stat: s.stat || "",
    email: s.email || "",
    telephone: s.telephone || "",
    rang: nombreOuNull(s.rang),
    note: nombreOuNull(s.note),
    contrat: s.contrat || null,
  };
}

function normaliserGroupes(data) {
  return extraireListe(data)
    .filter((g) => g && typeof g === "object")
    .map((g) => ({
      id: Number(g.idAppelOffre),
      reference: g.reference || `AO-${g.idAppelOffre}`,
      objet: g.objet || "Appel d'offres",
      lieu: g.lieuExecution || "",
      fournisseurs: (Array.isArray(g.fournisseurs) ? g.fournisseurs : []).map(
        normaliserLigne
      ),
      prestataires: (Array.isArray(g.prestataires) ? g.prestataires : []).map(
        normaliserLigne
      ),
    }))
    .filter((g) => Number.isFinite(g.id))
    .sort((a, b) => b.id - a.id);
}

/* =========================================================
   CONTENU DU CONTRAT (un modèle par famille)
========================================================= */

function descriptionPartie(ligne, type) {
  const morceaux = [ligne.nom];

  if (type === "FOURNISSEUR") {
    if (ligne.adresse) morceaux.push(`entreprise dont le siège est situé à ${ligne.adresse}`);
    if (ligne.nif) morceaux.push(`NIF n° ${ligne.nif}`);
    if (ligne.stat) morceaux.push(`STAT n° ${ligne.stat}`);
  } else if (ligne.adresse) {
    morceaux.push(`demeurant à ${ligne.adresse}`);
  }

  return morceaux.join(", ");
}

function construireContrat({ type, ligne, contrat, groupe, responsable }) {
  const fournisseur = type === "FOURNISSEUR";
  const nomPartie = fournisseur ? "le Fournisseur" : "le Prestataire";
  const montant = formatMontant(contrat.montant);
  const delai = formatDelai(contrat);
  const lieu = contrat.lieuExecution || groupe.lieu || "le lieu indiqué par la SPAT";
  const debut = contrat.dateDebut
    ? `à compter du ${formatDateLongue(contrat.dateDebut)}`
    : "à compter de la notification du présent contrat";

  const articles = fournisseur
    ? [
        {
          titre: "Objet du contrat",
          texte: `Le présent contrat a pour objet la fourniture suivante : ${contrat.objet}. Il est conclu à la suite de l'appel d'offres ${groupe.reference} dont l'offre du Fournisseur a été retenue.`,
        },
        {
          titre: "Documents contractuels",
          texte: `Font partie du contrat : le dossier d'appel d'offres ${groupe.reference}, l'offre technique et financière du Fournisseur (accusé de réception ${ligne.accuse || "—"}) et le présent contrat. En cas de contradiction, le présent contrat prévaut.`,
        },
        {
          titre: "Prix et modalités de paiement",
          texte: `Le montant du marché est fixé à ${montant}. Le paiement intervient après livraison complète et réception des fournitures par la SPAT, sur présentation d'une facture conforme.`,
        },
        {
          titre: "Délai et lieu de livraison",
          texte: `Le Fournisseur s'engage à livrer les fournitures dans un délai de ${delai}, ${debut}, à l'adresse suivante : ${lieu}.`,
        },
        {
          titre: "Conformité et garantie",
          texte:
            "Les fournitures doivent être neuves, conformes aux spécifications de l'offre retenue et exemptes de vice. La SPAT peut refuser toute fourniture non conforme ; le Fournisseur la remplace à ses frais dans les meilleurs délais.",
        },
        {
          titre: "Pénalités de retard",
          texte:
            "En cas de retard de livraison imputable au Fournisseur, une pénalité d'un millième (1/1000) du montant du marché est appliquée par jour de retard, dans la limite de 10 % de ce montant.",
        },
        {
          titre: "Résiliation",
          texte:
            "La SPAT peut résilier le contrat, après mise en demeure restée sans effet pendant quinze (15) jours, en cas de manquement grave du Fournisseur à ses obligations.",
        },
        {
          titre: "Litiges",
          texte:
            "Les parties recherchent un règlement amiable. À défaut, les tribunaux compétents de Toamasina sont seuls compétents.",
        },
      ]
    : [
        {
          titre: "Objet du contrat",
          texte: `Le présent contrat a pour objet la prestation de services suivante : ${contrat.objet}. Il est conclu à la suite de l'appel d'offres ${groupe.reference} dont l'offre du Prestataire a été retenue.`,
        },
        {
          titre: "Documents contractuels",
          texte: `Font partie du contrat : le dossier d'appel d'offres ${groupe.reference}, l'offre du Prestataire (accusé de réception ${ligne.accuse || "—"}) et le présent contrat. En cas de contradiction, le présent contrat prévaut.`,
        },
        {
          titre: "Rémunération et modalités de paiement",
          texte: `La rémunération du Prestataire est fixée à ${montant}. Elle est versée après exécution de la prestation et constat du service fait par la SPAT, sur présentation d'une facture ou d'une note d'honoraires.`,
        },
        {
          titre: "Délai et lieu d'exécution",
          texte: `Le Prestataire exécute la prestation dans un délai de ${delai}, ${debut}, à l'adresse suivante : ${lieu}.`,
        },
        {
          titre: "Obligations du Prestataire",
          texte:
            "Le Prestataire exécute personnellement la mission avec diligence et professionnalisme, rend compte de son avancement à la SPAT et respecte la confidentialité des informations dont il a connaissance. Il ne peut sous-traiter la prestation sans l'accord écrit de la SPAT.",
        },
        {
          titre: "Indépendance",
          texte:
            "Le Prestataire exerce sa mission en toute indépendance : le présent contrat ne crée aucun lien de subordination ni contrat de travail avec la SPAT.",
        },
        {
          titre: "Pénalités de retard",
          texte:
            "En cas de retard d'exécution imputable au Prestataire, une pénalité d'un millième (1/1000) du montant du contrat est appliquée par jour de retard, dans la limite de 10 % de ce montant.",
        },
        {
          titre: "Résiliation",
          texte:
            "La SPAT peut résilier le contrat, après mise en demeure restée sans effet pendant quinze (15) jours, en cas de manquement grave du Prestataire à ses obligations.",
        },
        {
          titre: "Litiges",
          texte:
            "Les parties recherchent un règlement amiable. À défaut, les tribunaux compétents de Toamasina sont seuls compétents.",
        },
      ];

  if (contrat.clauses) {
    articles.push({ titre: "Clauses particulières", texte: contrat.clauses });
  }

  return {
    titre: fournisseur
      ? "CONTRAT DE FOURNITURE"
      : "CONTRAT DE PRESTATION DE SERVICES",
    numero: contrat.numero,
    partieSpat: `La Société du Port à gestion Autonome de Toamasina (SPAT), représentée par ${
      responsable || "le Responsable des marchés"
    }, Responsable des marchés, ci-après dénommée « la SPAT »,`,
    partieAutre: `${descriptionPartie(ligne, type)}, ci-après dénommé « ${nomPartie} ».`,
    articles,
    signataireSpat: responsable || "Le Responsable des marchés",
    signataireAutre: ligne.nom,
    nomPartie,
    dateFait: contrat.dateSignature
      ? formatDateLongue(contrat.dateSignature)
      : "…………………",
    signe: contrat.statut === "SIGNE",
  };
}

/* =========================================================
   STYLES
========================================================= */

const DOC_CSS = `
.ct-doc{font-family:"Times New Roman",Georgia,serif;color:#111;background:#fff;line-height:1.55;font-size:14px;padding:36px 44px}
.ct-doc h1{text-align:center;font-size:20px;letter-spacing:.04em;margin:0 0 4px}
.ct-doc .ct-doc-num{text-align:center;font-size:13px;margin-bottom:22px;color:#444}
.ct-doc .ct-doc-sous{font-weight:700;text-transform:uppercase;margin:18px 0 6px}
.ct-doc p{margin:0 0 8px;text-align:justify}
.ct-doc h3{font-size:14px;margin:14px 0 4px}
.ct-doc .ct-doc-sign{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:34px;text-align:center}
.ct-doc .ct-doc-sign strong{display:block;margin-bottom:60px}
.ct-doc .ct-doc-cachet{display:inline-block;border:2px solid #15803d;color:#15803d;padding:2px 10px;border-radius:4px;font-weight:700;font-size:12px;margin-bottom:10px}
@media print{body{margin:0}.ct-doc{padding:20mm}}
`;

const PAGE_CSS = `
.ct-page{--ct-card:#ffffff;--ct-border:#e2e8f0;--ct-text:#0f172a;--ct-muted:#64748b;--ct-soft:#f8fafc;--ct-f:#2563eb;--ct-f-bg:#eff6ff;--ct-p:#ea580c;--ct-p-bg:#fff7ed}
.ct-page.dark{--ct-card:#111827;--ct-border:#263244;--ct-text:#e5e7eb;--ct-muted:#94a3b8;--ct-soft:#0f172a;--ct-f:#60a5fa;--ct-f-bg:#172554;--ct-p:#fb923c;--ct-p-bg:#431407}
.ct-page .rx-badge-count{margin-left:auto;background:#ef4444;color:#fff;border-radius:999px;font-size:11px;min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}
.ct-page .lt-spin{animation:ct-spin 1s linear infinite}
@keyframes ct-spin{to{transform:rotate(360deg)}}
.ct-toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:4px 0 18px}
.ct-toolbar select{min-width:280px;max-width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--ct-border);background:var(--ct-card);color:var(--ct-text);font-size:14px}
.ct-appel-info{background:var(--ct-card);border:1px solid var(--ct-border);border-radius:16px;padding:14px 18px;margin-bottom:18px;color:var(--ct-text)}
.ct-appel-info strong{display:block;font-size:15px}
.ct-appel-info span{color:var(--ct-muted);font-size:13px}
.ct-split{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
@media (max-width:1000px){.ct-split{grid-template-columns:1fr}}
.ct-col{background:var(--ct-card);border:1px solid var(--ct-border);border-radius:18px;overflow:hidden;color:var(--ct-text)}
.ct-col-head{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--ct-border)}
.ct-col-f .ct-col-head{background:var(--ct-f-bg)}
.ct-col-p .ct-col-head{background:var(--ct-p-bg)}
.ct-col-ico{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--ct-card)}
.ct-col-f .ct-col-ico{color:var(--ct-f)}
.ct-col-p .ct-col-ico{color:var(--ct-p)}
.ct-col-head h3{margin:0;font-size:16px}
.ct-col-head p{margin:2px 0 0;font-size:12.5px;color:var(--ct-muted)}
.ct-col-count{margin-left:auto;font-weight:700;font-size:13px;border-radius:999px;padding:4px 12px;background:var(--ct-card)}
.ct-col-body{padding:14px;display:flex;flex-direction:column;gap:12px}
.ct-empty{padding:26px 10px;text-align:center;color:var(--ct-muted);font-size:14px}
.ct-card{border:1px solid var(--ct-border);border-radius:14px;padding:14px;background:var(--ct-soft)}
.ct-card-top{display:flex;gap:10px;align-items:flex-start}
.ct-rang{flex:none;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;background:var(--ct-card);border:1px solid var(--ct-border)}
.ct-card h4{margin:0;font-size:15px}
.ct-note{margin-left:auto;font-size:12.5px;color:var(--ct-muted);white-space:nowrap}
.ct-infos{display:grid;gap:4px;margin:10px 0 0;font-size:13px;color:var(--ct-muted)}
.ct-infos div{display:flex;gap:6px;align-items:center}
.ct-contrat-box{margin-top:12px;padding-top:12px;border-top:1px dashed var(--ct-border)}
.ct-contrat-line{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:13px;margin-bottom:10px}
.ct-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;border-radius:999px;padding:3px 10px}
.ct-badge.none{background:#fee2e2;color:#b91c1c}
.ct-badge.draft{background:#fef3c7;color:#b45309}
.ct-badge.signed{background:#dcfce7;color:#15803d}
.ct-actions{display:flex;gap:8px;flex-wrap:wrap}
.ct-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;border:1px solid var(--ct-border);background:var(--ct-card);color:var(--ct-text);font-size:13px;font-weight:600;cursor:pointer}
.ct-btn:hover{border-color:var(--ct-f)}
.ct-btn:disabled{opacity:.55;cursor:not-allowed}
.ct-btn.primary{background:var(--ct-f);border-color:var(--ct-f);color:#fff}
.ct-col-p .ct-btn.primary{background:var(--ct-p);border-color:var(--ct-p)}
.ct-btn.danger{color:#dc2626}
.ct-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto}
.ct-modal{width:100%;max-width:640px;background:var(--ct-card);color:var(--ct-text);border-radius:18px;border:1px solid var(--ct-border);box-shadow:0 24px 60px rgba(0,0,0,.3)}
.ct-modal.large{max-width:860px}
.ct-modal-head{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--ct-border)}
.ct-modal-head h3{margin:0;font-size:17px}
.ct-modal-head button.ct-x{margin-left:auto;background:none;border:none;color:var(--ct-muted);cursor:pointer}
.ct-modal-body{padding:18px 20px}
.ct-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--ct-border)}
.ct-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ct-form .full{grid-column:1/-1}
.ct-delai{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ct-form select{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--ct-border);background:var(--ct-soft);color:var(--ct-text);font-size:14px;font-family:inherit}
@media (max-width:640px){.ct-form{grid-template-columns:1fr}}
.ct-form label{display:block;font-size:13px;font-weight:600;margin-bottom:5px}
.ct-form input,.ct-form textarea{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--ct-border);background:var(--ct-soft);color:var(--ct-text);font-size:14px;font-family:inherit}
.ct-form textarea{min-height:90px;resize:vertical}
.ct-paper{background:#e5e7eb;padding:14px;border-radius:0 0 18px 18px;max-height:70vh;overflow:auto}
${DOC_CSS}
`;

/* =========================================================
   PAGE
========================================================= */

export default function ContratsPage() {
  const router = useRouter();
  const documentRef = useRef(null);

  const [user, setUser] = useState(null);
  const [brut, setBrut] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [occupe, setOccupe] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [appelId, setAppelId] = useState("");
  const [formulaire, setFormulaire] = useState(null); // { ligne, contrat? }
  const [champs, setChamps] = useState(FORM_VIDE);
  const [apercu, setApercu] = useState(null); // { ligne, contrat }

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
        setBrut(extraireListe(await apiFetch(LISTE_URL)));
      } catch (err) {
        if (err?.status === 401) {
          router.replace("/");
          return;
        }

        setError(err.message || "Erreur lors du chargement des contrats.");
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

  const groupes = useMemo(() => normaliserGroupes(brut), [brut]);

  const groupe = useMemo(
    () =>
      groupes.find((g) => String(g.id) === String(appelId)) ||
      groupes[0] ||
      null,
    [groupes, appelId]
  );

  const stats = useMemo(() => {
    let fournisseurs = 0;
    let prestataires = 0;
    let signes = 0;
    let sansContrat = 0;

    groupes.forEach((g) => {
      fournisseurs += g.fournisseurs.length;
      prestataires += g.prestataires.length;

      [...g.fournisseurs, ...g.prestataires].forEach((l) => {
        if (!l.contrat) sansContrat += 1;
        else if (l.contrat.statut === "SIGNE") signes += 1;
      });
    });

    return { fournisseurs, prestataires, signes, sansContrat };
  }, [groupes]);

  /* ---------- Actions ---------- */

  const gererErreur = (err, defaut) => {
    if (err?.status === 401) {
      router.replace("/");
      return;
    }

    setError(err.message || defaut);
  };

  const ouvrirFormulaire = (ligne) => {
    const c = ligne.contrat;

    setChamps(
      c
        ? {
            objet: c.objet || "",
            montant: c.montant ?? "",
            delaiValeur: c.delaiValeur ?? "",
            delaiUnite: c.delaiUnite || "JOUR",
            dateDebut: c.dateDebut || "",
            lieuExecution: c.lieuExecution || "",
            clauses: c.clauses || "",
          }
        : {
            ...FORM_VIDE,
            objet: groupe?.objet || "",
            lieuExecution: groupe?.lieu || "",
          }
    );

    setError("");
    setFormulaire({ ligne, contrat: c });
  };

  const changerChamp = (nom) => (e) =>
    setChamps((prev) => ({ ...prev, [nom]: e.target.value }));

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!formulaire || occupe) return;

    const montant = Number(champs.montant);
    const delai = Number(champs.delaiValeur);

    if (!Number.isFinite(montant) || montant <= 0) {
      setError("Saisissez un montant supérieur à 0.");
      return;
    }

    if (!Number.isInteger(delai) || delai <= 0) {
      setError("Saisissez un délai d'exécution (nombre entier supérieur à 0).");
      return;
    }

    const { ligne, contrat } = formulaire;

    setOccupe(`form-${ligne.idOffre}`);
    setError("");

    try {
      await apiFetch(
        contrat
          ? `${CONTRATS_URL}/${contrat.idContrat}`
          : `${CONTRATS_URL}/offre/${ligne.idOffre}`,
        {
          method: contrat ? "PUT" : "POST",
          body: JSON.stringify({
            objet: champs.objet.trim(),
            montant,
            delaiValeur: delai,
            delaiUnite: champs.delaiUnite || "JOUR",
            dateDebut: champs.dateDebut || null,
            lieuExecution: champs.lieuExecution.trim(),
            clauses: champs.clauses.trim(),
          }),
        }
      );

      setFormulaire(null);
      setSuccess(
        contrat
          ? "Le contrat a été modifié."
          : `Le contrat de ${ligne.nom} a été établi.`
      );

      await chargerDonnees(false);
    } catch (err) {
      gererErreur(err, "Enregistrement impossible.");
    } finally {
      setOccupe("");
    }
  };

  const signer = async (ligne) => {
    if (occupe) return;

    const ok = window.confirm(
      `Signer le contrat ${ligne.contrat.numero} avec ${ligne.nom} ?\n\nAprès signature, le contrat ne pourra plus être modifié ni supprimé.`
    );

    if (!ok) return;

    setOccupe(`signer-${ligne.idOffre}`);
    setError("");

    try {
      await apiFetch(`${CONTRATS_URL}/${ligne.contrat.idContrat}/signer`, {
        method: "POST",
      });

      setSuccess(`Le contrat ${ligne.contrat.numero} a été signé.`);
      await chargerDonnees(false);
    } catch (err) {
      gererErreur(err, "Signature impossible.");
    } finally {
      setOccupe("");
    }
  };

  const supprimer = async (ligne) => {
    if (occupe) return;

    const ok = window.confirm(
      `Supprimer le contrat ${ligne.contrat.numero} (brouillon) ?`
    );

    if (!ok) return;

    setOccupe(`suppr-${ligne.idOffre}`);
    setError("");

    try {
      await apiFetch(`${CONTRATS_URL}/${ligne.contrat.idContrat}`, {
        method: "DELETE",
      });

      setSuccess("Le contrat a été supprimé.");
      await chargerDonnees(false);
    } catch (err) {
      gererErreur(err, "Suppression impossible.");
    } finally {
      setOccupe("");
    }
  };

  const imprimer = () => {
    if (!documentRef.current || !apercu) return;

    const fenetre = window.open("", "_blank", "width=900,height=1100");

    if (!fenetre) {
      setError("Autorisez les fenêtres pop-up pour imprimer le contrat.");
      return;
    }

    fenetre.document.write(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(
        apercu.contrat.numero
      )}</title><style>${DOC_CSS}</style></head><body>${
        documentRef.current.outerHTML
      }</body></html>`
    );
    fenetre.document.close();
    fenetre.focus();
    setTimeout(() => fenetre.print(), 300);
  };

  /* ---------- Navigation ---------- */

  const allerVers = (id) => {
    setSidebarOpen(false);

    if (id === "contrat") return;

    router.push(ROUTES[id] || "/dashboard/responsable");
  };

  const deconnexion = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}

    router.replace("/");
  };

  /* ---------- Rendu d'une colonne ---------- */

  const renderColonne = (type) => {
    const def = TYPES[type];
    const fournisseur = type === "FOURNISSEUR";
    const Icone = fournisseur ? Building2 : UserRound;
    const lignes = groupe ? groupe[def.cle] : [];

    return (
      <section className={`ct-col ${fournisseur ? "ct-col-f" : "ct-col-p"}`}>
        <div className="ct-col-head">
          <div className="ct-col-ico">
            <Icone size={22} />
          </div>

          <div>
            <h3>{def.titre}</h3>
            <p>{def.sousTitre}</p>
          </div>

          <span className="ct-col-count">{lignes.length}</span>
        </div>

        <div className="ct-col-body">
          {lignes.length === 0 && <div className="ct-empty">{def.vide}</div>}

          {lignes.map((ligne) => {
            const c = ligne.contrat;
            const signe = c?.statut === "SIGNE";
            const enCours = occupe.endsWith(`-${ligne.idOffre}`);

            return (
              <article className="ct-card" key={ligne.idOffre}>
                <div className="ct-card-top">
                  <div className="ct-rang">
                    {ligne.rang !== null ? ligne.rang : <Trophy size={16} />}
                  </div>

                  <div>
                    <h4>{ligne.nom}</h4>
                  </div>

                  <span className="ct-note">
                    Note : {formatNote(ligne.note)} / 20
                  </span>
                </div>

                <div className="ct-infos">
                  {fournisseur && (ligne.nif || ligne.stat) && (
                    <div>
                      <FileText size={14} />
                      {[
                        ligne.nif && `NIF ${ligne.nif}`,
                        ligne.stat && `STAT ${ligne.stat}`,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}

                  {ligne.adresse && (
                    <div>
                      <MapPin size={14} />
                      {ligne.adresse}
                    </div>
                  )}

                  {ligne.email && (
                    <div>
                      <Mail size={14} />
                      {ligne.email}
                    </div>
                  )}

                  {ligne.telephone && (
                    <div>
                      <Phone size={14} />
                      {ligne.telephone}
                    </div>
                  )}
                </div>

                <div className="ct-contrat-box">
                  {!c && (
                    <>
                      <div className="ct-contrat-line">
                        <span className="ct-badge none">Aucun contrat</span>
                      </div>

                      <div className="ct-actions">
                        <button
                          type="button"
                          className="ct-btn primary"
                          onClick={() => ouvrirFormulaire(ligne)}
                          disabled={Boolean(occupe)}
                        >
                          <Plus size={15} />
                          Établir le contrat
                        </button>
                      </div>
                    </>
                  )}

                  {c && (
                    <>
                      <div className="ct-contrat-line">
                        <strong>{c.numero}</strong>

                        <span
                          className={`ct-badge ${signe ? "signed" : "draft"}`}
                        >
                          {signe
                            ? `Signé le ${formatDate(c.dateSignature)}`
                            : "Brouillon"}
                        </span>

                        <span>
                          {formatMontant(c.montant)} • {formatDelai(c)}
                        </span>
                      </div>

                      <div className="ct-actions">
                        <button
                          type="button"
                          className="ct-btn"
                          onClick={() => setApercu({ ligne, contrat: c })}
                        >
                          <Eye size={15} />
                          Aperçu
                        </button>

                        {!signe && (
                          <>
                            <button
                              type="button"
                              className="ct-btn"
                              onClick={() => ouvrirFormulaire(ligne)}
                              disabled={enCours}
                            >
                              <Pencil size={15} />
                              Modifier
                            </button>

                            <button
                              type="button"
                              className="ct-btn primary"
                              onClick={() => signer(ligne)}
                              disabled={Boolean(occupe)}
                            >
                              <PenLine size={15} />
                              Signer
                            </button>

                            <button
                              type="button"
                              className="ct-btn danger"
                              onClick={() => supprimer(ligne)}
                              disabled={Boolean(occupe)}
                            >
                              <Trash2 size={15} />
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  /* ---------- Rendu ---------- */

  if (loading) {
    return (
      <div className="resp-loading-screen">
        <div className="resp-loader"></div>
        <p>Chargement des contrats...</p>
      </div>
    );
  }

  const documentContrat = apercu
    ? construireContrat({
        type: apercu.ligne.type,
        ligne: apercu.ligne,
        contrat: apercu.contrat,
        groupe: groupe || { reference: "", lieu: "" },
        responsable: user?.nomComplet,
      })
    : null;

  return (
    <div className={`resp-app ct-page ${theme === "dark" ? "dark" : ""}`}>
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
            const actif = item.id === "contrat";

            return (
              <button
                key={item.id}
                type="button"
                className={`resp-nav-item ${actif ? "active" : ""}`}
                onClick={() => allerVers(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {item.id === "contrat" && stats.sansContrat > 0 && (
                  <span className="rx-badge-count">{stats.sansContrat}</span>
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

              <h1>Contrats</h1>
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
              <h2>Contrats des soumissionnaires retenus</h2>
              <p>
                Établissez, signez et imprimez le contrat de chaque
                soumissionnaire publié : fournisseurs à gauche, prestataires à
                droite.
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
                icon: Building2,
                v: stats.fournisseurs,
                l: "Fournisseurs retenus",
                f: "Contrats de fourniture",
              },
              {
                c: "orange",
                icon: UserRound,
                v: stats.prestataires,
                l: "Prestataires retenus",
                f: "Contrats de prestation",
              },
              {
                c: "purple",
                icon: FileSignature,
                v: stats.sansContrat,
                l: "Contrats à établir",
                f: "Soumissionnaires sans contrat",
              },
              {
                c: "green",
                icon: CheckCircle2,
                v: stats.signes,
                l: "Contrats signés",
                f: "Tous appels confondus",
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

          {/* CHOIX DE L'APPEL D'OFFRES */}

          {groupes.length === 0 ? (
            <div className="ct-col">
              <div className="ct-empty">
                Aucun résultat publié pour le moment. Publiez d'abord le
                résultat d'un appel d'offres dans « Listes transmises ».
              </div>
            </div>
          ) : (
            <>
              <div className="ct-toolbar">
                <Filter size={17} />

                <select
                  value={groupe ? String(groupe.id) : ""}
                  onChange={(e) => setAppelId(e.target.value)}
                >
                  {groupes.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.reference} — {g.objet}
                    </option>
                  ))}
                </select>
              </div>

              {groupe && (
                <div className="ct-appel-info">
                  <strong>
                    {groupe.reference} — {groupe.objet}
                  </strong>
                  <span>
                    {groupe.lieu ? `Lieu d'exécution : ${groupe.lieu} • ` : ""}
                    {groupe.fournisseurs.length} fournisseur(s) •{" "}
                    {groupe.prestataires.length} prestataire(s)
                  </span>
                </div>
              )}

              {/* DEUX CONTRATS : FOURNISSEUR (GAUCHE) | PRESTATAIRE (DROITE) */}

              <div className="ct-split">
                {renderColonne("FOURNISSEUR")}
                {renderColonne("PRESTATAIRE")}
              </div>
            </>
          )}
        </section>
      </main>

      {/* FORMULAIRE : ÉTABLIR / MODIFIER */}

      {formulaire && (
        <div
          className="ct-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget && !occupe) setFormulaire(null);
          }}
        >
          <form className="ct-modal" onSubmit={enregistrer}>
            <div className="ct-modal-head">
              <FileSignature size={20} />

              <h3>
                {formulaire.contrat ? "Modifier" : "Établir"} le{" "}
                {TYPES[formulaire.ligne.type]?.titre?.toLowerCase() ||
                  "contrat"}
              </h3>

              <button
                type="button"
                className="ct-x"
                onClick={() => setFormulaire(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="ct-modal-body">
              <p style={{ margin: "0 0 14px" }}>
                <strong>{formulaire.ligne.nom}</strong>
                {" — "}
                {TYPES[formulaire.ligne.type]?.partie}
              </p>

              <div className="ct-form">
                <div className="full">
                  <label htmlFor="ct-objet">Objet du contrat</label>
                  <input
                    id="ct-objet"
                    value={champs.objet}
                    onChange={changerChamp("objet")}
                    placeholder="Par défaut : objet de l'appel d'offres"
                  />
                </div>

                <div>
                  <label htmlFor="ct-montant">Montant (Ar) *</label>
                  <input
                    id="ct-montant"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={champs.montant}
                    onChange={changerChamp("montant")}
                  />
                </div>

                <div>
                  <label htmlFor="ct-debut">Date de début</label>
                  <input
                    id="ct-debut"
                    type="date"
                    value={champs.dateDebut}
                    onChange={changerChamp("dateDebut")}
                  />
                </div>

                <div className="full">
                  <label htmlFor="ct-delai-valeur">Délai d'exécution *</label>

                  <div className="ct-delai">
                    <input
                      id="ct-delai-valeur"
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="Durée"
                      value={champs.delaiValeur}
                      onChange={changerChamp("delaiValeur")}
                    />

                    <select
                      id="ct-delai-unite"
                      aria-label="Unité du délai"
                      value={champs.delaiUnite}
                      onChange={changerChamp("delaiUnite")}
                    >
                      <option value="JOUR">Jour(s)</option>
                      <option value="MOIS">Mois</option>
                      <option value="ANNEE">Année(s)</option>
                    </select>
                  </div>
                </div>

                <div className="full">
                  <label htmlFor="ct-lieu">Lieu d'exécution / livraison</label>
                  <input
                    id="ct-lieu"
                    value={champs.lieuExecution}
                    onChange={changerChamp("lieuExecution")}
                  />
                </div>

                <div className="full">
                  <label htmlFor="ct-clauses">Clauses particulières</label>
                  <textarea
                    id="ct-clauses"
                    value={champs.clauses}
                    onChange={changerChamp("clauses")}
                    placeholder="Facultatif"
                  />
                </div>
              </div>
            </div>

            <div className="ct-modal-foot">
              <button
                type="button"
                className="ct-btn"
                onClick={() => setFormulaire(null)}
                disabled={Boolean(occupe)}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="ct-btn primary"
                disabled={Boolean(occupe)}
              >
                {occupe ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* APERÇU / IMPRESSION */}

      {apercu && documentContrat && (
        <div
          className="ct-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget) setApercu(null);
          }}
        >
          <div className="ct-modal large">
            <div className="ct-modal-head">
              <Eye size={20} />
              <h3>Aperçu — {apercu.contrat.numero}</h3>

              <button type="button" className="ct-btn" onClick={imprimer}>
                <Printer size={15} />
                Imprimer
              </button>

              <button
                type="button"
                className="ct-x"
                style={{ marginLeft: 0 }}
                onClick={() => setApercu(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="ct-paper">
              <div className="ct-doc" ref={documentRef}>
                <h1>{documentContrat.titre}</h1>
                <div className="ct-doc-num">N° {documentContrat.numero}</div>

                <div className="ct-doc-sous">Entre les soussignés</div>
                <p>{documentContrat.partieSpat}</p>
                <p>et</p>
                <p>{documentContrat.partieAutre}</p>

                <p>Il a été convenu et arrêté ce qui suit :</p>

                {documentContrat.articles.map((a, i) => (
                  <div key={a.titre}>
                    <h3>
                      Article {i + 1} — {a.titre}
                    </h3>
                    <p>{a.texte}</p>
                  </div>
                ))}

                <p style={{ marginTop: 18 }}>
                  Fait à Toamasina, le {documentContrat.dateFait}, en deux
                  exemplaires originaux.
                </p>

                <div className="ct-doc-sign">
                  <div>
                    {documentContrat.signe && (
                      <span className="ct-doc-cachet">SIGNÉ</span>
                    )}
                    <strong>Pour la SPAT</strong>
                    {documentContrat.signataireSpat}
                  </div>

                  <div>
                    {documentContrat.signe && (
                      <span className="ct-doc-cachet">SIGNÉ</span>
                    )}
                    <strong>Pour {documentContrat.nomPartie}</strong>
                    {documentContrat.signataireAutre}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
