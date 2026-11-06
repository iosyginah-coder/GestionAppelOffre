"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  LoaderCircle,
  X,
  Send,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

async function lireReponse(response) {
  const texte = await response.text();

  if (!texte) return {};

  try {
    return JSON.parse(texte);
  } catch {
    return { message: texte };
  }
}

function obtenirMessage(data) {
  return String(
    data?.message ||
      data?.detail ||
      data?.error ||
      data?.title ||
      ""
  );
}

function estDemandeEnAttente(data, message, status) {
  const texte = message.toLowerCase();

  return (
    status === 409 ||
    data?.dejaEnAttente === true ||
    data?.demandeDejaEnAttente === true ||
    texte.includes("déjà en attente") ||
    texte.includes("deja en attente") ||
    texte.includes("existe déjà")
  );
}

export default function Home() {
  const [matricule, setMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const [popupOuvert, setPopupOuvert] = useState(false);
  const [matriculeOubli, setMatriculeOubli] = useState("");
  const [erreurOubli, setErreurOubli] = useState("");
  const [envoiOubli, setEnvoiOubli] = useState(false);
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);
  const [messageOubli, setMessageOubli] = useState("");

  const [notificationEmailEchouee, setNotificationEmailEchouee] =
    useState(false);

  const [demandeDejaEnAttente, setDemandeDejaEnAttente] =
    useState(false);

  const reinitialiserEtatOubli = () => {
    setErreurOubli("");
    setMessageOubli("");
    setDemandeEnvoyee(false);
    setNotificationEmailEchouee(false);
    setDemandeDejaEnAttente(false);
  };

  const ouvrirPopup = () => {
    setMatriculeOubli("");
    reinitialiserEtatOubli();
    setPopupOuvert(true);
  };

  const fermerPopup = () => {
    if (envoiOubli) return;

    setPopupOuvert(false);
    setMatriculeOubli("");
    reinitialiserEtatOubli();
  };

  // CONNEXION
  const handleConnexion = async (e) => {
    e.preventDefault();
    setErreur("");

    const matriculeVerifie = matricule.trim();

    if (!/^[0-9]{7}$/.test(matriculeVerifie)) {
      setErreur("Le matricule doit contenir exactement 7 chiffres.");
      return;
    }

    if (!motDePasse.trim()) {
      setErreur("Veuillez saisir votre mot de passe.");
      return;
    }

    setChargement(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          matricule: matriculeVerifie,
          motDePasse,
        }),
      });

      const data = await lireReponse(response);

      if (!response.ok) {
        throw new Error(
          obtenirMessage(data) ||
            (response.status === 401 || response.status === 403
              ? "Matricule ou mot de passe incorrect, ou accès non autorisé."
              : `Erreur du serveur (HTTP ${response.status}).`)
        );
      }

      const role = String(
        data?.role ||
          data?.utilisateur?.role ||
          data?.user?.role ||
          ""
      ).toUpperCase();

      const destinations = {
        ADMINISTRATEUR: "/dashboard/admin",
        RESPONSABLE_MARCHES: "/dashboard/responsable",
        EVALUATEUR: "/dashboard/evaluateur",
        SOUMISSIONNAIRE: "/dashboard/soumissionnaire",
      };

      if (!destinations[role]) {
        console.error("Réponse du backend :", data);

        throw new Error(
          "Le rôle est absent ou inconnu dans la réponse du backend."
        );
      }

      // La session utilise le cookie HTTP-only du backend.
      window.location.assign(destinations[role]);
    } catch (error) {
      console.error("Erreur de connexion :", error);

      if (error instanceof TypeError) {
        setErreur(
          "Impossible de joindre le backend. Vérifiez que Spring Boot fonctionne sur le port 8080 et que CORS autorise le frontend."
        );
      } else {
        setErreur(
          error.message ||
            "Une erreur est survenue pendant la connexion."
        );
      }
    } finally {
      setChargement(false);
    }
  };

  // DEMANDE DE MOT DE PASSE OUBLIÉ
  const handleDemandeOubli = async (e) => {
    e.preventDefault();

    setErreurOubli("");
    setMessageOubli("");

    const matriculeVerifie = matriculeOubli.trim();

    if (!/^[0-9]{7}$/.test(matriculeVerifie)) {
      setErreurOubli(
        "Le matricule doit contenir exactement 7 chiffres."
      );
      return;
    }

    setEnvoiOubli(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/password-reset-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            matricule: matriculeVerifie,
          }),
        }
      );

      const data = await lireReponse(response);
      const message = obtenirMessage(data);

      // DEMANDE DÉJÀ EN ATTENTE
      if (estDemandeEnAttente(data, message, response.status)) {
        setDemandeDejaEnAttente(true);
        setMessageOubli(
          message ||
            "Une demande existe déjà pour ce matricule. Veuillez attendre son traitement par l'administrateur."
        );
        setDemandeEnvoyee(true);
        setMatriculeOubli("");
        return;
      }

      // MATRICULE INEXISTANT OU INVALIDE
      if (response.status === 400 || response.status === 404) {
        setErreurOubli(
          message ||
            (response.status === 404
              ? "Ce matricule n'existe pas. Vérifiez votre saisie."
              : "Le matricule doit contenir exactement 7 chiffres.")
        );
        return;
      }

      // PROBLÈME D'AUTORISATION
      if (response.status === 401 || response.status === 403) {
        setErreurOubli(
          message ||
            "Le service de demande n'est pas accessible. Contactez l'administrateur."
        );
        return;
      }

      /*
       * Le backend doit renvoyer demandeEnregistree: true
       * lorsqu'il a bien enregistré la demande, même si
       * l'envoi de l'e-mail de notification a échoué.
       */
      if (
        data?.demandeEnregistree === true &&
        (data?.emailEnvoye === false || !response.ok)
      ) {
        setNotificationEmailEchouee(true);
        setMessageOubli(
          message ||
            "Votre demande a été enregistrée, mais l'e-mail de notification n'a pas pu être envoyé."
        );
        setDemandeEnvoyee(true);
        setMatriculeOubli("");
        return;
      }

      // AUTRE ERREUR SERVEUR
      if (!response.ok) {
        throw new Error(
          message ||
            `Impossible d'envoyer la demande (HTTP ${response.status}). La demande n'a pas pu être confirmée.`
        );
      }

      // RÉPONSE POSITIVE
      if (data?.emailEnvoye === false) {
        setNotificationEmailEchouee(true);
        setMessageOubli(
          message ||
            "Votre demande a été enregistrée, mais l'e-mail de notification n'a pas pu être envoyé."
        );
      } else {
        setMessageOubli(
          message ||
            "Votre demande a été enregistrée. L'administrateur a été notifié."
        );
      }

      setDemandeEnvoyee(true);
      setMatriculeOubli("");
    } catch (error) {
      console.error(
        "Erreur de demande de réinitialisation :",
        error
      );

      if (error instanceof TypeError) {
        setErreurOubli(
          "Impossible de joindre le backend. Vérifiez que Spring Boot fonctionne sur le port 8080 et que CORS autorise le frontend."
        );
      } else {
        setErreurOubli(
          error.message ||
            "Une erreur est survenue pendant l'envoi de la demande."
        );
      }
    } finally {
      setEnvoiOubli(false);
    }
  };

  const avertissement =
    notificationEmailEchouee || demandeDejaEnAttente;

  return (
    <main className="login-page">
      <section className="login-layout">
        {/* PANNEAU GAUCHE */}
        <div className="brand-panel">
          <div className="brand-content">
            <div className="brand-symbol">
              <ShieldCheck size={35} strokeWidth={1.8} />
            </div>

            <div className="brand-label">
              PLATEFORME PROFESSIONNELLE
            </div>

            <h1>
              Gestion Appel d’offre
              <br />
              et des marchés
            </h1>

            <div className="brand-divider" />

            <p className="company-name">
              Société du Port Autonome de Toamasina
            </p>
          </div>

          <div className="brand-footer">
            <span className="footer-dot" />
            Espace de gestion sécurisé
          </div>
        </div>

        {/* PANNEAU DE CONNEXION */}
        <div className="form-panel">
          <div className="login-card">
            <div className="logo-container">
              <img
                src="/spat.png"
                alt="Logo SPAT"
                className="spat-logo"
              />
            </div>

            <div className="form-heading">
              <h2>Bienvenue</h2>
              <p>
                Connectez-vous à votre espace de travail
              </p>
            </div>

            {erreur && (
              <div className="error-message" role="alert">
                <AlertCircle size={19} />
                <span>{erreur}</span>
              </div>
            )}

            <form onSubmit={handleConnexion}>
              {/* MATRICULE */}
              <div className="input-group">
                <label htmlFor="matricule">Matricule</label>

                <div className="input-wrapper">
                  <UserRound
                    className="input-icon"
                    size={20}
                  />

                  <input
                    id="matricule"
                    type="text"
                    inputMode="numeric"
                    autoComplete="username"
                    placeholder="Ex. : 1234567"
                    value={matricule}
                    onChange={(e) => {
                      setMatricule(
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 7)
                      );
                      setErreur("");
                    }}
                    maxLength={7}
                    required
                  />
                </div>
              </div>

              {/* MOT DE PASSE */}
              <div className="input-group password-group">
                <label htmlFor="motDePasse">
                  Mot de passe
                </label>

                <div className="input-wrapper">
                  <LockKeyhole
                    className="input-icon"
                    size={20}
                  />

                  <input
                    id="motDePasse"
                    type={
                      afficherMotDePasse ? "text" : "password"
                    }
                    autoComplete="current-password"
                    placeholder="Saisissez votre mot de passe"
                    value={motDePasse}
                    onChange={(e) => {
                      setMotDePasse(e.target.value);
                      setErreur("");
                    }}
                    required
                  />

                  <button
                    type="button"
                    className="eye-button"
                    onClick={() =>
                      setAfficherMotDePasse((visible) => !visible)
                    }
                    aria-label={
                      afficherMotDePasse
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    title={
                      afficherMotDePasse
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {afficherMotDePasse ? (
                      <EyeOff size={21} />
                    ) : (
                      <Eye size={21} />
                    )}
                  </button>
                </div>
              </div>

              {/* MOT DE PASSE OUBLIÉ */}
              <div className="forgot-row">
                <button
                  type="button"
                  className="forgot-button"
                  onClick={ouvrirPopup}
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* BOUTON CONNEXION */}
              <button
                type="submit"
                className="login-button"
                disabled={chargement}
              >
                {chargement ? (
                  <>
                    <LoaderCircle
                      className="loading-icon"
                      size={20}
                    />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="security-note">
              <LockKeyhole size={15} />
              <span>
                Connexion sécurisée et réservée aux utilisateurs autorisés
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* POPUP MOT DE PASSE OUBLIÉ */}
      {popupOuvert && (
        <div
          className="popup-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              fermerPopup();
            }
          }}
        >
          <section
            className="forgot-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
          >
            <button
              type="button"
              className="popup-close"
              onClick={fermerPopup}
              aria-label="Fermer la fenêtre"
              title="Fermer"
              disabled={envoiOubli}
            >
              <X size={21} />
            </button>

            {!demandeEnvoyee ? (
              <>
                <div className="popup-icon">
                  <KeyRound size={29} />
                </div>

                <h2 id="forgot-title">
                  Mot de passe oublié ?
                </h2>

                <p className="popup-description">
                  Entrez votre matricule professionnel (7 chiffres)
                  pour demander la réinitialisation de votre mot de
                  passe. La demande sera enregistrée et
                  l'administrateur sera notifié. Si elle est acceptée,
                  un mot de passe temporaire vous sera envoyé par
                  e-mail.
                </p>

                {erreurOubli && (
                  <div
                    className="error-message popup-error"
                    role="alert"
                  >
                    <AlertCircle size={18} />
                    <span>{erreurOubli}</span>
                  </div>
                )}

                <form onSubmit={handleDemandeOubli}>
                  <div className="input-group">
                    <label htmlFor="matriculeOubli">
                      Votre matricule
                    </label>

                    <div className="input-wrapper">
                      <UserRound
                        className="input-icon"
                        size={20}
                      />

                      <input
                        id="matriculeOubli"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Entrez vos 7 chiffres"
                        value={matriculeOubli}
                        onChange={(e) => {
                          setMatriculeOubli(
                            e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 7)
                          );
                          setErreurOubli("");
                          setMessageOubli("");
                        }}
                        maxLength={7}
                        autoFocus
                        required
                      />

                      <span className="input-counter">
                        {matriculeOubli.length}/7
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-button popup-submit"
                    disabled={envoiOubli}
                  >
                    {envoiOubli ? (
                      <>
                        <LoaderCircle
                          className="loading-icon"
                          size={19}
                        />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Envoyer la demande
                      </>
                    )}
                  </button>
                </form>

                <button
                  type="button"
                  className="popup-cancel"
                  onClick={fermerPopup}
                  disabled={envoiOubli}
                >
                  Retour à la connexion
                </button>
              </>
            ) : (
              /* RÉSULTAT DE LA DEMANDE */
              <div className="popup-success">
                <div
                  className="success-icon"
                  style={
                    avertissement
                      ? { color: "#b45309" }
                      : undefined
                  }
                >
                  {avertissement ? (
                    <AlertCircle size={35} />
                  ) : (
                    <CheckCircle2 size={35} />
                  )}
                </div>

                <h2 id="forgot-title">
                  {notificationEmailEchouee
                    ? "Demande enregistrée"
                    : demandeDejaEnAttente
                      ? "Demande déjà en attente"
                      : "Demande transmise"}
                </h2>

                <p
                  className="popup-description"
                  role="status"
                  style={
                    avertissement
                      ? { color: "#92400e" }
                      : undefined
                  }
                >
                  {messageOubli}
                </p>

                {notificationEmailEchouee && (
                  <p className="popup-description">
                    La demande est conservée dans le système et reste
                    visible dans le tableau de bord de l'administrateur,
                    mais il n'a pas reçu la notification par e-mail.
                    Contactez l'administrateur pour l'informer.
                  </p>
                )}

                {demandeDejaEnAttente && (
                  <p className="popup-description">
                    Une demande existe déjà pour ce matricule. Il
                    n'est pas nécessaire d'en créer une autre.
                    Contactez l'administrateur si elle n'est pas traitée.
                  </p>
                )}

                {!avertissement && (
                  <p className="popup-description">
                    Vous recevrez un mot de passe temporaire par
                    e-mail dès que l'administrateur aura accepté
                    la demande.
                  </p>
                )}

                <button
                  type="button"
                  className="login-button popup-submit"
                  onClick={fermerPopup}
                >
                  Retour à la connexion
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}