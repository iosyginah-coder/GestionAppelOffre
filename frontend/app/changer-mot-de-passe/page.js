
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ArrowRight,
} from "lucide-react";

import "../css/MDP.css";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

function ChampMotDePasse({
  label,
  valeur,
  setValeur,
  visible,
  setVisible,
  placeholder,
  disabled,
}) {
  return (
    <div className="mdp-champ-groupe">
      <label>{label}</label>

      <div className="mdp-input-wrapper">
        <LockKeyhole className="mdp-input-icon" size={19} />

        <input
          type={visible ? "text" : "password"}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          required
          disabled={disabled}
        />

        <button
          type="button"
          className="mdp-bouton-oeil"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Masquer" : "Afficher"}
          disabled={disabled}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </div>
  );
}

function FormulaireChangementMotDePasse() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";

  const [ancienMotDePasse, setAncienMotDePasse] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [voirAncien, setVoirAncien] = useState(false);
  const [voirNouveau, setVoirNouveau] = useState(false);
  const [voirConfirmation, setVoirConfirmation] = useState(false);

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const changerMotDePasse = async (e) => {
    e.preventDefault();

    if (chargement) return;

    setErreur("");
    setSucces("");

    if (!token) {
      setErreur("Le lien de changement de mot de passe est invalide.");
      return;
    }

    if (!ancienMotDePasse || !nouveauMotDePasse || !confirmation) {
      setErreur("Veuillez remplir tous les champs.");
      return;
    }

    if (nouveauMotDePasse.length < 8) {
      setErreur("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (
      !/[A-Z]/.test(nouveauMotDePasse) ||
      !/[a-z]/.test(nouveauMotDePasse) ||
      !/[0-9]/.test(nouveauMotDePasse)
    ) {
      setErreur(
        "Ajoutez au moins une majuscule, une minuscule et un chiffre."
      );
      return;
    }

    if (nouveauMotDePasse !== confirmation) {
      setErreur("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    if (ancienMotDePasse === nouveauMotDePasse) {
      setErreur("Le nouveau mot de passe doit être différent de l'ancien.");
      return;
    }

    try {
      setChargement(true);

      const response = await fetch(
        `${API_URL}/api/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            token,
            ancienMotDePasse,
            nouveauMotDePasse,
          }),
        }
      );

      const texte = await response.text();

      let data = {};

      try {
        data = texte ? JSON.parse(texte) : {};
      } catch {
        data = { message: texte };
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.detail ||
          data.error ||
          data.title ||
          `Erreur du serveur : ${response.status}`
        );
      }

      setSucces(
        data.message ||
        "Votre mot de passe a été modifié avec succès."
      );

      setAncienMotDePasse("");
      setNouveauMotDePasse("");
      setConfirmation("");

    } catch (error) {
      console.error("Erreur changement mot de passe :", error);

      if (error instanceof TypeError) {
        setErreur(
          "Impossible de contacter le serveur. Vérifiez que le backend fonctionne."
        );
      } else {
        setErreur(error.message || "Une erreur est survenue.");
      }
    } finally {
      setChargement(false);
    }
  };

  return (
    <main className="mdp-page">
      <div className="mdp-decoration mdp-decoration-un" />
      <div className="mdp-decoration mdp-decoration-deux" />
      <div className="mdp-decoration mdp-decoration-trois" />

      <section className="mdp-carte">

        <div className="mdp-logo">
          <ShieldCheck size={36} />
        </div>

        <div className="mdp-entete">
          <span className="mdp-sous-titre">
            SPAT MADAGASCAR
          </span>

          <h1>Changer le mot de passe</h1>

          <p>
            Remplacez votre mot de passe temporaire par
            un nouveau mot de passe personnel.
          </p>
        </div>

        {!token ? (
          <div className="mdp-message mdp-message-erreur">
            <AlertCircle size={21} />
            <span>
              Le lien est invalide. Utilisez le lien reçu par e-mail.
            </span>
          </div>
        ) : succes ? (
          <div className="mdp-confirmation">

            <div className="mdp-icone-succes">
              <CheckCircle2 size={44} />
            </div>

            <h2>Mot de passe modifié !</h2>

            <p>{succes}</p>

            <button
              type="button"
              className="mdp-bouton-principal"
              onClick={() => router.push("/")}
            >
              Retour à la connexion
              <ArrowRight size={19} />
            </button>

          </div>
        ) : (
          <form
            onSubmit={changerMotDePasse}
            className="mdp-formulaire"
            noValidate
          >

            {erreur && (
              <div className="mdp-message mdp-message-erreur">
                <AlertCircle size={21} />
                <span>{erreur}</span>
              </div>
            )}

            <ChampMotDePasse
              label="Mot de passe temporaire"
              valeur={ancienMotDePasse}
              setValeur={setAncienMotDePasse}
              visible={voirAncien}
              setVisible={setVoirAncien}
              placeholder="Mot de passe reçu par e-mail"
              disabled={chargement}
            />

            <ChampMotDePasse
              label="Nouveau mot de passe"
              valeur={nouveauMotDePasse}
              setValeur={setNouveauMotDePasse}
              visible={voirNouveau}
              setVisible={setVoirNouveau}
              placeholder="Saisissez votre nouveau mot de passe"
              disabled={chargement}
            />

            <div className="mdp-indications">
              <ShieldCheck size={18} />
              <span>
                8 caractères minimum, une majuscule,
                une minuscule et un chiffre.
              </span>
            </div>

            <ChampMotDePasse
              label="Confirmer le nouveau mot de passe"
              valeur={confirmation}
              setValeur={setConfirmation}
              visible={voirConfirmation}
              setVisible={setVoirConfirmation}
              placeholder="Confirmez votre nouveau mot de passe"
              disabled={chargement}
            />

            <button
              type="submit"
              className="mdp-bouton-principal"
              disabled={chargement}
            >
              {chargement ? (
                <>
                  <LoaderCircle
                    className="mdp-animation-rotation"
                    size={21}
                  />
                  Modification en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Modifier mon mot de passe
                </>
              )}
            </button>

          </form>
        )}

        <div className="mdp-pied">
          <ShieldCheck size={17} />
          <span>
            Connexion sécurisée • SPAT Madagascar
          </span>
        </div>

      </section>
    </main>
  );
}

export default function ChangerMotDePassePage() {
  return (
    <Suspense
      fallback={
        <main className="mdp-page">
          <div className="mdp-chargement-page">
            <LoaderCircle
              size={36}
              className="mdp-animation-rotation"
            />
            <p>Chargement de la page sécurisée...</p>
          </div>
        </main>
      }
    >
      <FormulaireChangementMotDePasse />
    </Suspense>
  );
}
