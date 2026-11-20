"use client";

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

import {
  FileText,
  Building2,
  UserRound,
  Upload,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Send,
  ShieldCheck,
  FileCheck,
  CalendarDays,
  LoaderCircle,
  X,
  Copy,
  Check,
  Clock,
  Trash2,
  ArrowRight,
  ClipboardList
} from "lucide-react";

import "../../css/soumissionnaire.css";

/*
  API_URL vide  => requêtes relatives (/api/...) : à utiliser avec un proxy Next.js
  (rewrites vers http://localhost:8080) pour éviter les problèmes de CORS.
  Sinon définir NEXT_PUBLIC_API_URL=http://localhost:8080 dans .env.local
*/
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo (identique au backend)
const EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const ACCEPT = ".pdf,.jpg,.jpeg,.png";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM = {
  entreprise: "",
  nomSoumissionnaire: "",
  emailSoumissionnaire: "",
  telephoneSoumissionnaire: "",
  adresse: "",
  nif: "",
  stat: ""
};

// ------------------------------------------------------------------
// Utilitaires
// ------------------------------------------------------------------

function formaterTaille(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function verifierFichier(fichier) {
  if (!fichier) return null;

  const nom = fichier.name.toLowerCase();

  if (!EXTENSIONS.some((ext) => nom.endsWith(ext))) {
    return "Format refusé. Utilisez PDF, JPG, JPEG ou PNG.";
  }

  if (fichier.size === 0) {
    return "Ce fichier est vide.";
  }

  if (fichier.size > MAX_FILE_SIZE) {
    return `Ce fichier fait ${formaterTaille(fichier.size)} (maximum 10 Mo).`;
  }

  return null;
}

// Convertit une date du backend (texte ISO ou tableau Jackson) en Date valide, sinon null
function versDate(valeur) {
  if (!valeur) return null;

  let date;

  if (Array.isArray(valeur)) {
    const [a, m = 1, j = 1, h = 0, min = 0, sec = 0] = valeur;
    date = new Date(a, m - 1, j, h, min, sec);
  } else {
    date = new Date(valeur);
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

function formaterDate(valeur) {
  const date = versDate(valeur);

  if (!date) return "Non renseignée";

  return date.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short"
  });
}

function tempsRestant(valeur, maintenant) {
  const date = versDate(valeur);

  if (!date || !maintenant) return null;

  const diff = date.getTime() - maintenant;

  if (diff <= 0) return null;

  const jours = Math.floor(diff / 86400000);
  const heures = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (jours > 0) return `${jours} j ${heures} h restants`;
  if (heures > 0) return `${heures} h ${minutes} min restantes`;
  return `${minutes} min restantes`;
}

// Le backend renvoie { "message": "..." } en cas d'erreur
async function lireReponse(response, nomAPI) {
  const texte = await response.text();

  let json = null;

  try {
    json = texte ? JSON.parse(texte) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    console.error(`Erreur API ${nomAPI}:`, response.status, texte);

    if (json?.message) {
      throw new Error(json.message);
    }

    if (response.status === 404) {
      throw new Error(
        "Ressource introuvable. Vérifiez que cet appel d'offres est publié."
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("Accès refusé par le serveur.");
    }

    if (response.status === 413) {
      throw new Error(
        "Le dossier est trop volumineux. Réduisez la taille des fichiers."
      );
    }

    throw new Error(`Erreur serveur (${response.status}). Réessayez plus tard.`);
  }

  if (json === null) {
    if (texte.includes("ngrok") || texte.includes("You are about to visit")) {
      throw new Error(
        "Ngrok renvoie sa page d'avertissement. Vérifiez le proxy et l'accès ngrok."
      );
    }

    throw new Error(`Réponse inattendue du serveur (${nomAPI}).`);
  }

  return json;
}

// ------------------------------------------------------------------
// Champ fichier réutilisable
// ------------------------------------------------------------------

function ChampFichier({
  id,
  fichier,
  onChange,
  erreur,
  placeholder = "Choisir un fichier"
}) {
  function choisir(e) {
    const f = e.target.files?.[0] || null;

    // Permet de re-choisir le même fichier après suppression
    e.target.value = "";

    onChange(f);
  }

  return (
    <div className="sp-file">
      {fichier ? (
        <div className={`sp-file-chosen ${erreur ? "invalid" : ""}`}>
          <FileText size={20} />

          <div className="sp-file-meta">
            <strong title={fichier.name}>{fichier.name}</strong>
            <small>{formaterTaille(fichier.size)}</small>
          </div>

          <button
            type="button"
            className="sp-file-remove"
            aria-label={`Retirer ${fichier.name}`}
            onClick={() => onChange(null)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      ) : (
        <label className="sp-file-drop" htmlFor={id}>
          <Upload size={20} />
          <span>{placeholder}</span>
          <small>PDF, JPG ou PNG, 10 Mo maximum</small>
        </label>
      )}

      <input
        id={id}
        type="file"
        accept={ACCEPT}
        className="sp-file-input"
        onChange={choisir}
      />

      {erreur && <p className="sp-field-error">{erreur}</p>}
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

function SoumissionnaireForm({ idAppelOffre }) {

  const [appel, setAppel] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [type, setType] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [erreurPieces, setErreurPieces] = useState("");
  const [success, setSuccess] = useState(null);
  const [copie, setCopie] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  // 0 au rendu serveur, mis à jour côté navigateur (compatible cacheComponents)
  const [maintenant, setMaintenant] = useState(0);

  const [form, setForm] = useState(INITIAL_FORM);
  const [cinRecto, setCinRecto] = useState(null);
  const [cinVerso, setCinVerso] = useState(null);
  const [offreTechnique, setOffreTechnique] = useState(null);
  const [offreFinanciere, setOffreFinanciere] = useState(null);
  const [fichiersPieces, setFichiersPieces] = useState({});

  // Erreurs par fichier : { cinRecto: "...", "piece-3": "..." }
  const [erreursFichiers, setErreursFichiers] = useState({});

  const alerteRef = useRef(null);
  const modalRef = useRef(null);

  // Horloge pour la date limite (mise à jour chaque 30 s)
  useEffect(() => {
    setMaintenant(Date.now());
    const timer = setInterval(() => setMaintenant(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fenêtre de dépôt : blocage du défilement de la page et touche Échap
  useEffect(() => {
    if (!ouvert) return;

    const ancienStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function surTouche(e) {
      if (e.key !== "Escape" || sending) return;

      if (success) terminer();
      else setOuvert(false);
    }

    window.addEventListener("keydown", surTouche);

    return () => {
      document.body.style.overflow = ancienStyle;
      window.removeEventListener("keydown", surTouche);
    };
  }, [ouvert, sending, success]);

  // Place le focus dans la fenêtre à l'ouverture
  useEffect(() => {
    if (ouvert) modalRef.current?.focus();
  }, [ouvert]);

  // ---------------- Chargement ----------------

  const chargerDonnees = useCallback(async (signal) => {
    if (!/^\d+$/.test(idAppelOffre)) {
      setError("Identifiant de l'appel d'offres invalide.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setErreurPieces("");

    const options = {
      method: "GET",
      signal,
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true"
      }
    };

    const id = encodeURIComponent(idAppelOffre);

    try {
      const [appelResponse, piecesResponse, photosResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/appel-offres/publications/${id}`, options),

          // Route réelle du contrôleur : /public/appel-offre/{id}
          fetch(
            `${API_URL}/api/pieces-requises/public/appel-offre/${id}`,
            options
          ),

          fetch(
            `${API_URL}/api/appel-offres/publications/${id}/photos`,
            options
          )
        ]);

      const appelData = await lireReponse(appelResponse, "appel d'offres");

      // Une erreur sur les pièces n'empêche pas d'afficher l'appel d'offres
      let piecesData = [];
      let messagePieces = "";

      try {
        piecesData = await lireReponse(piecesResponse, "pièces requises");
      } catch (errPieces) {
        messagePieces = `Impossible de charger les pièces requises. ${errPieces.message}`;
      }

      if (!appelData || typeof appelData !== "object" || Array.isArray(appelData)) {
        throw new Error("Les informations de l'appel d'offres sont invalides.");
      }

      // Les photos sont facultatives : une erreur ne bloque pas la page
      let photosData = [];

      try {
        const lues = await lireReponse(photosResponse, "photos");
        photosData = Array.isArray(lues)
          ? lues.filter((p) => (p.typeContenu || "").startsWith("image/"))
          : [];
      } catch {
        photosData = [];
      }

      if (signal?.aborted) return;

      setAppel(appelData);
      setPieces(Array.isArray(piecesData) ? piecesData : []);
      setErreurPieces(messagePieces);
      setPhotos(photosData);
      setFichiersPieces({});
      setErreursFichiers({});
    } catch (e) {
      if (e?.name === "AbortError" || signal?.aborted) return;

      console.error("Erreur chargement formulaire :", e);

      setError(e.message || "Erreur lors du chargement des données.");
      setAppel(null);
      setPieces([]);
      setPhotos([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [idAppelOffre]);

  useEffect(() => {
    const controleur = new AbortController();

    chargerDonnees(controleur.signal);

    return () => controleur.abort();
  }, [idAppelOffre, chargerDonnees]);

  // ---------------- État dérivé ----------------

  const ferme = useMemo(() => {
    const limite = versDate(appel?.dateLimiteDepot);

    if (!limite || !maintenant) return false;

    return maintenant >= limite.getTime();
  }, [appel, maintenant]);

  const restant = useMemo(
    () => tempsRestant(appel?.dateLimiteDepot, maintenant),
    [appel, maintenant]
  );

  // ---------------- Gestion des champs ----------------

  function modifierChamp(e) {
    const { name, value } = e.target;
    setForm((ancien) => ({ ...ancien, [name]: value }));
  }

  function changerType(nouveauType) {
    if (nouveauType === type) return;

    setType(nouveauType);
    setError("");
    setErreursFichiers({});
  }

  // Valide le fichier au moment du choix
  function definirFichier(cle, setter, fichier) {
    const erreur = verifierFichier(fichier);

    setErreursFichiers((ancien) => {
      const copieErreurs = { ...ancien };

      if (erreur) copieErreurs[cle] = erreur;
      else delete copieErreurs[cle];

      return copieErreurs;
    });

    setter(erreur ? null : fichier);

    // Fichier refusé : on garde le message, pas le fichier
    if (erreur) return;

    setError("");
  }

  function definirFichierPiece(piece, fichier) {
    const cle = `piece-${piece.idPiece}`;
    const erreur = verifierFichier(fichier);

    setErreursFichiers((ancien) => {
      const copieErreurs = { ...ancien };

      if (erreur) copieErreurs[cle] = erreur;
      else delete copieErreurs[cle];

      return copieErreurs;
    });

    setFichiersPieces((ancien) => {
      const copieFichiers = { ...ancien };

      if (!erreur && fichier) copieFichiers[piece.idPiece] = fichier;
      else delete copieFichiers[piece.idPiece];

      return copieFichiers;
    });

    if (!erreur) setError("");
  }

  // ---------------- Validation ----------------

  function verifierFormulaire() {
    if (!type) return "Choisissez d'abord votre type de soumissionnaire.";

    if (erreurPieces) {
      return "Les pièces requises n'ont pas pu être chargées. Rechargez-les avant d'envoyer.";
    }

    if (!form.emailSoumissionnaire.trim()) {
      return "L'adresse email est obligatoire.";
    }

    if (!EMAIL_REGEX.test(form.emailSoumissionnaire.trim())) {
      return "L'adresse email n'est pas valide.";
    }

    if (!form.adresse.trim()) return "L'adresse est obligatoire.";

    if (type === "FOURNISSEUR") {
      if (!form.entreprise.trim()) {
        return "Le nom de l'entreprise est obligatoire.";
      }

      if (!form.nif.trim() || !form.stat.trim()) {
        return "Le NIF et le STAT sont obligatoires.";
      }
    }

    if (type === "PRESTATAIRE") {
      if (!form.nomSoumissionnaire.trim()) {
        return "Le nom et prénom sont obligatoires.";
      }

      if (!cinRecto || !cinVerso) {
        return "Joignez les deux faces de votre CIN.";
      }
    }

    for (const piece of pieces) {
      if (piece.obligatoire && !fichiersPieces[piece.idPiece]) {
        return `Joignez la pièce obligatoire : ${piece.nomPiece}`;
      }
    }

    if (Object.keys(erreursFichiers).length > 0) {
      return "Corrigez les fichiers signalés en rouge avant d'envoyer.";
    }

    return null;
  }

  function afficherErreur(message) {
    setError(message);

    requestAnimationFrame(() => {
      alerteRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });
  }

  // ---------------- Dépôt ----------------

  async function deposerOffre(e) {
    e.preventDefault();

    if (sending) return;

    setError("");

    if (ferme) {
      afficherErreur("La date limite de dépôt est dépassée.");
      return;
    }

    const erreur = verifierFormulaire();

    if (erreur) {
      afficherErreur(erreur);
      return;
    }

    setSending(true);

    try {
      const data = new FormData();

      data.append("idAppelOffre", String(idAppelOffre));
      data.append("typeSoumissionnaire", type);
      data.append("emailSoumissionnaire", form.emailSoumissionnaire.trim());
      data.append("adresse", form.adresse.trim());

      if (form.telephoneSoumissionnaire.trim()) {
        data.append(
          "telephoneSoumissionnaire",
          form.telephoneSoumissionnaire.trim()
        );
      }

      if (type === "FOURNISSEUR") {
        data.append("entreprise", form.entreprise.trim());
        data.append("nif", form.nif.trim());
        data.append("stat", form.stat.trim());

        if (offreTechnique) data.append("offreTechnique", offreTechnique);
        if (offreFinanciere) data.append("offreFinanciere", offreFinanciere);
      }

      if (type === "PRESTATAIRE") {
        data.append("nomSoumissionnaire", form.nomSoumissionnaire.trim());
        data.append("cinRecto", cinRecto);
        data.append("cinVerso", cinVerso);
      }

      // Le backend associe idsPieces[i] <-> fichiersPieces[i] par position
      pieces.forEach((piece) => {
        const fichier = fichiersPieces[piece.idPiece];

        if (fichier) {
          data.append("idsPieces", String(piece.idPiece));
          data.append("fichiersPieces", fichier);
        }
      });

      const response = await fetch(`${API_URL}/api/offres/deposer`, {
        method: "POST",
        credentials: "omit",
        headers: { "ngrok-skip-browser-warning": "true" },
        body: data
      });

      const resultat = await lireReponse(response, "dépôt de l'offre");

      setSuccess(resultat);
    } catch (err) {
      console.error("Erreur dépôt offre :", err);

      afficherErreur(
        err instanceof TypeError
          ? "Impossible de joindre le serveur. Vérifiez votre connexion."
          : err.message || "Erreur lors de l'envoi du dossier."
      );
    } finally {
      setSending(false);
    }
  }

  async function copierAccuse() {
    const valeur = success?.accuseDeReception;

    if (!valeur) return;

    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  function ouvrirModal() {
    if (ferme) return;

    setError("");
    setOuvert(true);
  }

  function fermerModal() {
    if (sending) return;

    setOuvert(false);
  }

  function terminer() {
    setOuvert(false);
    setSuccess(null);
    setType("");
    setForm(INITIAL_FORM);
    setCinRecto(null);
    setCinVerso(null);
    setOffreTechnique(null);
    setOffreFinanciere(null);
    setFichiersPieces({});
    setErreursFichiers({});
  }

  // ------------------------------------------------------------------
  // Rendus
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <main className="sp-loading" aria-busy="true">
        <LoaderCircle className="sp-spin" size={36} />
        <p>Chargement de l'appel d'offres...</p>
      </main>
    );
  }

  if (!appel) {
    return (
      <main className="sp-page">
        <div className="sp-error-page">
          <AlertCircle size={44} />
          <h2>Impossible d'accéder à cet appel d'offres</h2>
          <p>{error || "Appel d'offres introuvable."}</p>

          <button
            type="button"
            className="sp-btn sp-btn-primary"
            onClick={() => chargerDonnees()}
          >
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  const nbObligatoires = pieces.filter((p) => p.obligatoire).length;

  return (
    <main className="sp-page">
      {/* EN-TETE */}
      <header className="sp-header">
        <div className="sp-header-inner">
          <div className="sp-brand">
            <Image
              src="/spat.png"
              alt="Logo SPAT"
              width={150}
              height={60}
              priority
              className="sp-logo"
            />

            <div className="sp-brand-text">
              <strong>SPAT</strong>
              <span>Société du Port à gestion Autonome de Toamasina</span>
            </div>
          </div>

          <div className="sp-header-tag">
            <ShieldCheck size={18} />
            <span>Plateforme de soumission</span>
          </div>
        </div>
      </header>

      {/* BANDEAU */}
      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="sp-hero-text">
            <p className="sp-badge">Appel d'offres public</p>
            <p className="sp-ref">Réf. {appel.reference}</p>

            <h1>{appel.objet}</h1>

            {appel.description && (
              <p className="sp-hero-desc">{appel.description}</p>
            )}
          </div>

          <aside className="sp-deposit-card">
            <div className={`sp-status ${ferme ? "closed" : "open"}`}>
              <Clock size={16} />
              <span>{ferme ? "Dépôts fermés" : "Dépôts ouverts"}</span>
            </div>

            <dl className="sp-deposit-info">
              <div>
                <dt>Date limite de dépôt</dt>
                <dd>{formaterDate(appel.dateLimiteDepot)}</dd>
              </div>

              {!ferme && restant && (
                <div>
                  <dt>Temps restant</dt>
                  <dd>{restant}</dd>
                </div>
              )}
            </dl>

            <button
              type="button"
              className="sp-btn sp-btn-primary sp-btn-block"
              onClick={ouvrirModal}
              disabled={ferme}
            >
              Déposer mon offre
              <ArrowRight size={18} />
            </button>

            {ferme ? (
              <p className="sp-deposit-note closed">
                La date limite est dépassée. Les dépôts sont fermés.
              </p>
            ) : (
              <p className="sp-deposit-note">
                Un accusé de réception vous est remis après le dépôt.
              </p>
            )}
          </aside>
        </div>
      </section>

      <div className="sp-container">
        {/* INFORMATIONS */}
        <section className="sp-card">
          <h2>
            <ClipboardList size={20} />
            Informations générales
          </h2>

          <dl className="sp-info">
            <div>
              <dt>Référence</dt>
              <dd>{appel.reference}</dd>
            </div>

            <div>
              <dt>Lieu d'exécution</dt>
              <dd>
                <MapPin size={16} />
                {appel.lieuExecution || "Non renseigné"}
              </dd>
            </div>

            <div>
              <dt>Date limite de dépôt</dt>
              <dd>
                <CalendarDays size={16} />
                {formaterDate(appel.dateLimiteDepot)}
              </dd>
            </div>

            <div>
              <dt>Statut</dt>
              <dd>{ferme ? "Fermé" : "Ouvert aux dépôts"}</dd>
            </div>
          </dl>
        </section>

        {/* DOCUMENTS */}
        <section className="sp-card">
          <h2>
            <FileText size={20} />
            Documents à fournir
          </h2>

          {erreurPieces ? (
            <div className="sp-alert error" role="alert">
              <AlertCircle size={20} />
              <span>{erreurPieces}</span>

              <button
                type="button"
                className="sp-btn sp-btn-light"
                onClick={() => chargerDonnees()}
              >
                Recharger
              </button>
            </div>
          ) : pieces.length === 0 ? (
            <p className="sp-muted">
              Aucune pièce supplémentaire n'est demandée pour cet appel d'offres.
            </p>
          ) : (
            <>
              <p className="sp-muted">
                {nbObligatoires} pièce{nbObligatoires > 1 ? "s" : ""}{" "}
                obligatoire{nbObligatoires > 1 ? "s" : ""} sur {pieces.length}.
              </p>

              <ul className="sp-doc-list">
                {pieces.map((piece) => (
                  <li key={piece.idPiece}>
                    <FileText size={20} />

                    <div>
                      <strong>{piece.nomPiece}</strong>
                      {piece.description && <small>{piece.description}</small>}
                    </div>

                    <span
                      className={`sp-tag ${piece.obligatoire ? "required" : ""}`}
                    >
                      {piece.obligatoire ? "Obligatoire" : "Facultative"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="sp-muted sp-small">
            Selon votre profil, d'autres informations sont demandées dans le
            formulaire : NIF et STAT pour une entreprise, carte d'identité
            nationale pour une personne physique.
          </p>
        </section>

        {/* PHOTOS */}
        {photos.length > 0 && (
          <section className="sp-card">
            <h2>Photos</h2>

            <div className="sp-gallery">
              {photos.map((photo) => (
                <a
                  key={photo.idPhoto}
                  href={`${API_URL}${photo.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sp-gallery-item"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${API_URL}${photo.url}`}
                    alt={photo.nomFichier || "Photo de l'appel d'offres"}
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* PROCEDURE */}
        <section className="sp-card">
          <h2>Comment déposer votre offre</h2>

          <ol className="sp-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Ouvrez le formulaire</strong>
                <p>Cliquez sur « Déposer mon offre ».</p>
              </div>
            </li>

            <li>
              <span>2</span>
              <div>
                <strong>Renseignez vos informations</strong>
                <p>Choisissez votre profil puis complétez les champs demandés.</p>
              </div>
            </li>

            <li>
              <span>3</span>
              <div>
                <strong>Joignez vos documents</strong>
                <p>PDF, JPG ou PNG, 10 Mo maximum par fichier.</p>
              </div>
            </li>

            <li>
              <span>4</span>
              <div>
                <strong>Conservez l'accusé de réception</strong>
                <p>Il atteste de la bonne réception de votre dossier.</p>
              </div>
            </li>
          </ol>

          <div className="sp-cta-row">
            <button
              type="button"
              className="sp-btn sp-btn-primary"
              onClick={ouvrirModal}
              disabled={ferme}
            >
              Déposer mon offre
              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <footer className="sp-footer">
          <Image src="/spat.png" alt="SPAT" width={90} height={36} />
          <span>Plateforme de gestion des appels d'offres</span>
        </footer>
      </div>

      {/* FENETRE DE DEPOT */}
      {ouvert && (
        <div className="sp-overlay">
          <div
            className="sp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sp-modal-titre"
            tabIndex={-1}
            ref={modalRef}
          >
            {success ? (
              <div className="sp-success" role="status">
                <button
                  type="button"
                  className="sp-modal-close"
                  aria-label="Fermer"
                  onClick={terminer}
                >
                  <X size={20} />
                </button>

                <div className="sp-success-icon">
                  <CheckCircle2 size={52} />
                </div>

                <h2 id="sp-modal-titre">Dossier déposé</h2>

                <p>
                  Votre dossier pour l'appel d'offres{" "}
                  <strong>{appel.reference}</strong> a bien été enregistré.
                  Conservez votre accusé de réception.
                </p>

                <div className="sp-receipt">
                  <span>Accusé de réception</span>

                  <div className="sp-receipt-line">
                    <strong>{success.accuseDeReception || "Enregistré"}</strong>

                    {success.accuseDeReception && (
                      <button
                        type="button"
                        className="sp-btn sp-btn-light"
                        onClick={copierAccuse}
                        aria-label="Copier l'accusé de réception"
                      >
                        {copie ? <Check size={16} /> : <Copy size={16} />}
                        {copie ? "Copié" : "Copier"}
                      </button>
                    )}
                  </div>

                  {success.dateDepot && (
                    <small>Déposé le {formaterDate(success.dateDepot)}</small>
                  )}
                </div>

                <div className="sp-success-info">
                  <FileCheck size={20} />
                  <span>Votre dossier a été transmis à la SPAT.</span>
                </div>

                <button
                  type="button"
                  className="sp-btn sp-btn-primary"
                  onClick={terminer}
                >
                  Terminer
                </button>
              </div>
            ) : (
              <form className="sp-form" onSubmit={deposerOffre} noValidate>
                <header className="sp-modal-header">
                  <div>
                    <p className="sp-modal-eyebrow">Réf. {appel.reference}</p>
                    <h2 id="sp-modal-titre">Dépôt de dossier</h2>
                  </div>

                  <button
                    type="button"
                    className="sp-modal-close"
                    aria-label="Fermer la fenêtre"
                    onClick={fermerModal}
                    disabled={sending}
                  >
                    <X size={20} />
                  </button>
                </header>

                <div className="sp-modal-body">
                  {ferme && (
                    <div className="sp-alert error" role="alert">
                      <AlertCircle size={20} />
                      <span>La date limite est dépassée. Les dépôts sont fermés.</span>
                    </div>
                  )}

                  {error && (
                    <div className="sp-alert error" role="alert" ref={alerteRef}>
                      <AlertCircle size={20} />
                      <span>{error}</span>

                      <button
                        type="button"
                        className="sp-alert-close"
                        aria-label="Fermer le message"
                        onClick={() => setError("")}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <fieldset className="sp-section" disabled={sending}>
                    <legend>
                      <span className="sp-num">1</span>
                      Vous êtes
                    </legend>

                    <div className="sp-types">
                      <button
                        type="button"
                        aria-pressed={type === "FOURNISSEUR"}
                        className={`sp-type ${type === "FOURNISSEUR" ? "selected" : ""}`}
                        onClick={() => changerType("FOURNISSEUR")}
                      >
                        <Building2 size={26} />
                        <strong>Fournisseur</strong>
                        <span>Entreprise ou société</span>
                        {type === "FOURNISSEUR" && (
                          <CheckCircle2 className="sp-type-check" size={20} />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-pressed={type === "PRESTATAIRE"}
                        className={`sp-type ${type === "PRESTATAIRE" ? "selected" : ""}`}
                        onClick={() => changerType("PRESTATAIRE")}
                      >
                        <UserRound size={26} />
                        <strong>Prestataire</strong>
                        <span>Personne physique</span>
                        {type === "PRESTATAIRE" && (
                          <CheckCircle2 className="sp-type-check" size={20} />
                        )}
                      </button>
                    </div>
                  </fieldset>

                  {type && (
                    <>
                      <fieldset className="sp-section" disabled={sending}>
                        <legend>
                          <span className="sp-num">2</span>
                          Vos informations
                        </legend>

                        <div className="sp-grid">
                          {type === "FOURNISSEUR" && (
                            <>
                              <div className="sp-field full">
                                <label htmlFor="entreprise">
                                  Nom de l'entreprise *
                                </label>
                                <input
                                  id="entreprise"
                                  name="entreprise"
                                  value={form.entreprise}
                                  onChange={modifierChamp}
                                  placeholder="Ex : Entreprise ABC"
                                  autoComplete="organization"
                                />
                              </div>

                              <div className="sp-field">
                                <label htmlFor="nif">NIF *</label>
                                <input
                                  id="nif"
                                  name="nif"
                                  value={form.nif}
                                  onChange={modifierChamp}
                                  placeholder="Numéro NIF"
                                />
                              </div>

                              <div className="sp-field">
                                <label htmlFor="stat">STAT *</label>
                                <input
                                  id="stat"
                                  name="stat"
                                  value={form.stat}
                                  onChange={modifierChamp}
                                  placeholder="Numéro STAT"
                                />
                              </div>
                            </>
                          )}

                          {type === "PRESTATAIRE" && (
                            <div className="sp-field full">
                              <label htmlFor="nomSoumissionnaire">
                                Nom et prénom *
                              </label>
                              <input
                                id="nomSoumissionnaire"
                                name="nomSoumissionnaire"
                                value={form.nomSoumissionnaire}
                                onChange={modifierChamp}
                                placeholder="Votre nom complet"
                                autoComplete="name"
                              />
                            </div>
                          )}

                          <div className="sp-field full">
                            <label htmlFor="adresse">
                              {type === "FOURNISSEUR"
                                ? "Adresse de l'entreprise *"
                                : "Adresse *"}
                            </label>
                            <input
                              id="adresse"
                              name="adresse"
                              value={form.adresse}
                              onChange={modifierChamp}
                              placeholder="Adresse complète"
                              autoComplete="street-address"
                            />
                          </div>

                          <div className="sp-field">
                            <label htmlFor="emailSoumissionnaire">Email *</label>
                            <div className="sp-input-icon">
                              <Mail size={18} />
                              <input
                                id="emailSoumissionnaire"
                                type="email"
                                name="emailSoumissionnaire"
                                value={form.emailSoumissionnaire}
                                onChange={modifierChamp}
                                placeholder="exemple@email.com"
                                autoComplete="email"
                              />
                            </div>
                          </div>

                          <div className="sp-field">
                            <label htmlFor="telephoneSoumissionnaire">
                              Téléphone
                            </label>
                            <div className="sp-input-icon">
                              <Phone size={18} />
                              <input
                                id="telephoneSoumissionnaire"
                                type="tel"
                                name="telephoneSoumissionnaire"
                                value={form.telephoneSoumissionnaire}
                                onChange={modifierChamp}
                                placeholder="+261 ..."
                                autoComplete="tel"
                              />
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      {type === "PRESTATAIRE" && (
                        <fieldset className="sp-section" disabled={sending}>
                          <legend>
                            <span className="sp-num">3</span>
                            Carte d'identité nationale
                          </legend>

                          <div className="sp-grid">
                            <div className="sp-field">
                              <span className="sp-label">CIN, recto *</span>
                              <ChampFichier
                                id="cinRecto"
                                fichier={cinRecto}
                                erreur={erreursFichiers.cinRecto}
                                placeholder="Joindre le recto"
                                onChange={(f) =>
                                  definirFichier("cinRecto", setCinRecto, f)
                                }
                              />
                            </div>

                            <div className="sp-field">
                              <span className="sp-label">CIN, verso *</span>
                              <ChampFichier
                                id="cinVerso"
                                fichier={cinVerso}
                                erreur={erreursFichiers.cinVerso}
                                placeholder="Joindre le verso"
                                onChange={(f) =>
                                  definirFichier("cinVerso", setCinVerso, f)
                                }
                              />
                            </div>
                          </div>
                        </fieldset>
                      )}

                      <fieldset className="sp-section" disabled={sending}>
                        <legend>
                          <span className="sp-num">
                            {type === "PRESTATAIRE" ? 4 : 3}
                          </span>
                          Pièces requises
                        </legend>

                        {erreurPieces ? (
                          <div className="sp-alert error" role="alert">
                            <AlertCircle size={20} />
                            <span>{erreurPieces}</span>

                            <button
                              type="button"
                              className="sp-btn sp-btn-light"
                              onClick={() => chargerDonnees()}
                            >
                              Recharger
                            </button>
                          </div>
                        ) : pieces.length === 0 ? (
                          <div className="sp-empty">
                            Aucune pièce n'est demandée pour cet appel d'offres.
                          </div>
                        ) : (
                          <div className="sp-pieces">
                            {pieces.map((piece) => {
                              const cle = `piece-${piece.idPiece}`;

                              return (
                                <div className="sp-piece" key={piece.idPiece}>
                                  <div className="sp-piece-info">
                                    <FileText size={20} />

                                    <div>
                                      <strong>{piece.nomPiece}</strong>

                                      <span
                                        className={`sp-tag ${piece.obligatoire ? "required" : ""}`}
                                      >
                                        {piece.obligatoire
                                          ? "Obligatoire"
                                          : "Facultative"}
                                      </span>

                                      {piece.description && (
                                        <small>{piece.description}</small>
                                      )}
                                    </div>
                                  </div>

                                  <ChampFichier
                                    id={cle}
                                    fichier={fichiersPieces[piece.idPiece] || null}
                                    erreur={erreursFichiers[cle]}
                                    onChange={(f) => definirFichierPiece(piece, f)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </fieldset>

                      {type === "FOURNISSEUR" && (
                        <fieldset className="sp-section" disabled={sending}>
                          <legend>
                            <span className="sp-num">4</span>
                            Offres technique et financière
                          </legend>

                          <p className="sp-muted sp-small">
                            Ces deux documents sont facultatifs.
                          </p>

                          <div className="sp-grid">
                            <div className="sp-field">
                              <span className="sp-label">Offre technique</span>
                              <ChampFichier
                                id="offreTechnique"
                                fichier={offreTechnique}
                                erreur={erreursFichiers.offreTechnique}
                                onChange={(f) =>
                                  definirFichier(
                                    "offreTechnique",
                                    setOffreTechnique,
                                    f
                                  )
                                }
                              />
                            </div>

                            <div className="sp-field">
                              <span className="sp-label">Offre financière</span>
                              <ChampFichier
                                id="offreFinanciere"
                                fichier={offreFinanciere}
                                erreur={erreursFichiers.offreFinanciere}
                                onChange={(f) =>
                                  definirFichier(
                                    "offreFinanciere",
                                    setOffreFinanciere,
                                    f
                                  )
                                }
                              />
                            </div>
                          </div>
                        </fieldset>
                      )}
                    </>
                  )}
                </div>

                <footer className="sp-modal-footer">
                  <div className="sp-privacy">
                    <ShieldCheck size={18} />
                    <span>Vos documents sont transmis uniquement à la SPAT.</span>
                  </div>

                  <div className="sp-actions">
                    <button
                      type="button"
                      className="sp-btn sp-btn-light"
                      onClick={fermerModal}
                      disabled={sending}
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      className="sp-btn sp-btn-primary"
                      disabled={sending || ferme || !type || Boolean(erreurPieces)}
                    >
                      {sending ? (
                        <>
                          <LoaderCircle className="sp-spin" size={18} />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Déposer mon offre
                        </>
                      )}
                    </button>
                  </div>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ------------------------------------------------------------------
// Lecture de l'identifiant depuis l'URL (sans params)
// ------------------------------------------------------------------

function ContenuPage() {
  const pathname = usePathname();

  const segments = (pathname || "").split("/").filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id || !/^\d+$/.test(id)) {
    return (
      <main
        style={{
          padding: "40px 20px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <h2>Appel d'offres introuvable</h2>
        <p>Identifiant invalide.</p>
      </main>
    );
  }

  return <SoumissionnaireForm idAppelOffre={id} />;
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function Page() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            padding: "40px 20px",
            textAlign: "center",
            fontFamily: "Arial, sans-serif"
          }}
        >
          Chargement du formulaire...
        </main>
      }
    >
      <ContenuPage />
    </Suspense>
  );
}

