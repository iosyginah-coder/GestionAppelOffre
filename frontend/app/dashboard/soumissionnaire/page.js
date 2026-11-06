
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  FileText,
  CalendarDays,
  MapPin,
  Building2,
  LogOut,
  Menu,
  X,
  Eye,
  Clock,
  Megaphone,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Tag,
  User,
  Bell,
} from "lucide-react";

import "../../css/soumissionnaire.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function obtenirListe(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.appelsOffres)) return data.appelsOffres;
  if (Array.isArray(data?.resultats)) return data.resultats;
  return [];
}

function formatDate(date) {
  if (!date) return "Non précisée";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) return "Non précisée";

  return valeur.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function valeurTexte(valeur, defaut = "Non renseigné") {
  if (valeur === null || valeur === undefined || valeur === "") {
    return defaut;
  }

  if (typeof valeur === "object") {
    return (
      valeur.libelle ||
      valeur.nom ||
      valeur.nomCategorie ||
      valeur.nomCategorieMarche ||
      valeur.type ||
      defaut
    );
  }

  return String(valeur);
}

export default function SoumissionnairePage() {
  const router = useRouter();

  const [appels, setAppels] = useState([]);
  const [utilisateur, setUtilisateur] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("TOUS");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [actualisation, setActualisation] = useState(false);
  const [appelSelectionne, setAppelSelectionne] = useState(null);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const chargerAppels = useCallback(async (silencieux = false) => {
    try {
      if (!silencieux) setChargement(true);

      setErreur("");

      const response = await fetch(
        `${API_URL}/api/appel-offres/publies`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Vous n'avez pas l'autorisation de consulter les appels d'offres."
        );
      }

      if (!response.ok) {
        throw new Error(
          `Impossible de charger les publications (${response.status}).`
        );
      }

      const data = await response.json();
      const liste = obtenirListe(data);

      const publications = liste.filter((appel) => {
        const statut = String(appel.statut || "")
          .trim()
          .toUpperCase();

        return statut === "PUBLIE";
      });

      publications.sort((a, b) => {
        const dateA = new Date(
          a.datePublication || a.dateCreation || 0
        ).getTime();

        const dateB = new Date(
          b.datePublication || b.dateCreation || 0
        ).getTime();

        return dateB - dateA;
      });

      setAppels(publications);
    } catch (error) {
      setErreur(
        error.message ||
          "Une erreur est survenue lors du chargement des publications."
      );
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  }, []);

  const chargerUtilisateur = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/session`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setUtilisateur(data.utilisateur || data.user || data);
      }
    } catch (error) {
      console.error("Erreur de session :", error);
    }
  }, []);

  useEffect(() => {
    chargerAppels();
    chargerUtilisateur();
  }, [chargerAppels, chargerUtilisateur]);

  const actualiser = async () => {
    setActualisation(true);
    await chargerAppels(true);
  };

  const deconnexion = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erreur de déconnexion :", error);
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  const categories = useMemo(() => {
    const valeurs = appels.map((appel) =>
      valeurTexte(
        appel.categorieMarche ||
          appel.categorie ||
          appel.typeMarche,
        ""
      )
    );

    return [...new Set(valeurs.filter(Boolean))];
  }, [appels]);

  const publicationsFiltrees = useMemo(() => {
    const terme = recherche.toLowerCase().trim();

    return appels.filter((appel) => {
      const objet = valeurTexte(appel.objet, "").toLowerCase();
      const reference = valeurTexte(
        appel.reference,
        ""
      ).toLowerCase();
      const description = valeurTexte(
        appel.description,
        ""
      ).toLowerCase();
      const categorie = valeurTexte(
        appel.categorieMarche || appel.categorie || appel.typeMarche,
        ""
      );

      const correspondRecherche =
        !terme ||
        objet.includes(terme) ||
        reference.includes(terme) ||
        description.includes(terme) ||
        categorie.toLowerCase().includes(terme);

      const correspondCategorie =
        filtreCategorie === "TOUS" ||
        categorie === filtreCategorie;

      return correspondRecherche && correspondCategorie;
    });
  }, [appels, recherche, filtreCategorie]);

  const nomUtilisateur =
    utilisateur?.nomComplet ||
    utilisateur?.nom ||
    utilisateur?.matricule ||
    "Soumissionnaire";

  const initiales = nomUtilisateur
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0])
    .join("")
    .toUpperCase();

  return (
    <main className="soumissionnaire-page">
      <aside className={`soumissionnaire-sidebar ${menuOuvert ? "sidebar-open" : ""}`}>
        <div className="soumissionnaire-logo">
          <div className="logo-image">
            <img src="/spat.png" alt="Logo SPAT" />
          </div>

          <div className="logo-description">
            <h2>SPAT</h2>
            <span>Gestion des marchés</span>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setMenuOuvert(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-separator" />

        <div className="sidebar-section-title">ESPACE PERSONNEL</div>

        <nav className="soumissionnaire-navigation">
          <button className="sidebar-link active">
            <Megaphone size={19} />
            <span>Appels d'offres</span>
          </button>

          <button className="sidebar-link" onClick={actualiser}>
            <RefreshCw size={19} />
            <span>Actualiser les publications</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon">
              <FileText size={21} />
            </div>
            <strong>Besoin d'aide ?</strong>
            <p>Consultez les appels d'offres publiés par la SPAT.</p>
          </div>

          <button className="sidebar-logout" onClick={deconnexion}>
            <LogOut size={19} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {menuOuvert && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOuvert(false)}
        />
      )}

      <section className="soumissionnaire-main">
        <header className="soumissionnaire-header">
          <div className="header-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMenuOuvert(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <span className="header-subtitle">ESPACE SOUMISSIONNAIRE</span>
              <h1>Appels d'offres</h1>
            </div>
          </div>

          <div className="header-user">
            <div className="header-notification">
              <Bell size={20} />
              {appels.length > 0 && <span />}
            </div>

            <div className="header-avatar">{initiales || "S"}</div>

            <div className="header-user-info">
              <strong>{nomUtilisateur}</strong>
              <span>Soumissionnaire</span>
            </div>

            <button
              className="header-logout"
              onClick={deconnexion}
              title="Déconnexion"
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <div className="soumissionnaire-content">
          <section className="publication-hero">
            <div className="hero-content">
              <span className="hero-label">
                <span className="hero-dot" />
                PLATEFORME OFFICIELLE SPAT
              </span>

              <h2>
                Découvrez les appels
                <br />
                d'offres publiés
              </h2>

              <p>
                Retrouvez ici les opportunités publiées par le Responsable
                des marchés de la Société du Port à Gestion Autonome de
                Toamasina.
              </p>

              <div className="hero-stat">
                <div className="hero-stat-icon">
                  <Megaphone size={20} />
                </div>
                <div>
                  <strong>{appels.length}</strong>
                  <span>Publication{appels.length > 1 ? "s" : ""} disponible{appels.length > 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>

            <div className="hero-decoration">
              <div className="hero-circle hero-circle-one" />
              <div className="hero-circle hero-circle-two" />
              <div className="hero-document">
                <FileText size={76} strokeWidth={1.2} />
                <span><CheckCircle2 size={25} /></span>
              </div>
            </div>
          </section>

          <section className="publication-toolbar">
            <div className="toolbar-heading">
              <div>
                <span className="section-eyebrow">FIL D'ACTUALITÉ</span>
                <h2>Dernières publications</h2>
                <p>Les appels d'offres officiellement publiés par la SPAT.</p>
              </div>

              <button
                className="refresh-button"
                onClick={actualiser}
                disabled={actualisation || chargement}
              >
                <RefreshCw
                  size={17}
                  className={actualisation ? "spinning" : ""}
                />
                Actualiser
              </button>
            </div>

            <div className="publication-filters">
              <div className="publication-search">
                <Search size={19} />
                <input
                  type="text"
                  placeholder="Rechercher un appel d'offres..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
                {recherche && (
                  <button onClick={() => setRecherche("")} aria-label="Effacer">
                    <X size={17} />
                  </button>
                )}
              </div>

              <div className="publication-category">
                <Tag size={17} />
                <select
                  value={filtreCategorie}
                  onChange={(e) => setFiltreCategorie(e.target.value)}
                >
                  <option value="TOUS">Toutes les catégories</option>
                  {categories.map((categorie) => (
                    <option key={categorie} value={categorie}>
                      {categorie}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {erreur && (
            <div className="publication-error">
              <AlertCircle size={21} />
              <div>
                <strong>Impossible de charger les publications</strong>
                <p>{erreur}</p>
                <button onClick={() => chargerAppels()}>
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {chargement ? (
            <div className="publication-loading">
              <div className="loading-spinner" />
              <strong>Chargement des publications...</strong>
              <span>Veuillez patienter quelques instants.</span>
            </div>
          ) : !erreur && publicationsFiltrees.length === 0 ? (
            <div className="publication-empty">
              <div className="empty-icon">
                <Megaphone size={35} />
              </div>

              <h3>
                {appels.length === 0
                  ? "Aucun appel d'offres publié"
                  : "Aucun résultat trouvé"}
              </h3>

              <p>
                {appels.length === 0
                  ? "Les appels d'offres apparaîtront ici dès que le Responsable des marchés les aura publiés."
                  : "Essayez de modifier votre recherche ou votre catégorie."}
              </p>

              {appels.length > 0 && (
                <button
                  className="empty-reset"
                  onClick={() => {
                    setRecherche("");
                    setFiltreCategorie("TOUS");
                  }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <section className="publication-feed">
              <div className="feed-count">
                <span>
                  {publicationsFiltrees.length} publication
                  {publicationsFiltrees.length > 1 ? "s" : ""}
                </span>
                <span className="feed-count-dot" />
                <span>Appels d'offres publiés</span>
              </div>

              {publicationsFiltrees.map((appel, index) => {
                const categorie = valeurTexte(
                  appel.categorieMarche ||
                    appel.categorie ||
                    appel.typeMarche,
                  "Appel d'offres"
                );

                const responsable = valeurTexte(
                  appel.responsable?.nomComplet ||
                    appel.utilisateur?.nomComplet ||
                    appel.createur?.nomComplet,
                  "Responsable des marchés"
                );

                return (
                  <article
                    className="publication-card"
                    key={appel.idAppelOffre || appel.id || index}
                  >
                    <div className="publication-card-header">
                      <div className="publisher-avatar">
                        <Building2 size={23} />
                      </div>

                      <div className="publisher-information">
                        <strong>SPAT – {responsable}</strong>
                        <div className="publisher-date">
                          <CalendarDays size={13} />
                          <span>
                            Publié le{" "}
                            {formatDate(
                              appel.datePublication ||
                                appel.dateCreation
                            )}
                          </span>
                          <span className="date-separator">·</span>
                          <span className="public-status">
                            <span />
                            Publié
                          </span>
                        </div>
                      </div>

                      <div className="publication-status">
                        <CheckCircle2 size={14} />
                        PUBLIE
                      </div>
                    </div>

                    <div className="publication-card-body">
                      <div className="publication-reference">
                        <FileText size={14} />
                        Référence : {valeurTexte(appel.reference, "Non attribuée")}
                      </div>

                      <h3>{valeurTexte(appel.objet, "Appel d'offres")}</h3>

                      <p className="publication-description">
                        {valeurTexte(
                          appel.description,
                          "Consultez les détails de cet appel d'offres pour connaître les conditions de participation."
                        )}
                      </p>

                      <div className="publication-category-label">
                        <Tag size={14} />
                        {categorie}
                      </div>

                      <div className="publication-information-grid">
                        <div className="publication-information-item">
                          <div className="information-icon">
                            <CalendarDays size={17} />
                          </div>
                          <div>
                            <span>Date de publication</span>
                            <strong>
                              {formatDate(appel.datePublication)}
                            </strong>
                          </div>
                        </div>

                        <div className="publication-information-item">
                          <div className="information-icon deadline-icon">
                            <Clock size={17} />
                          </div>
                          <div>
                            <span>Date limite de dépôt</span>
                            <strong>
                              {formatDate(appel.dateLimiteDepot)}
                            </strong>
                          </div>
                        </div>

                        <div className="publication-information-item">
                          <div className="information-icon">
                            <MapPin size={17} />
                          </div>
                          <div>
                            <span>Lieu d'exécution</span>
                            <strong>
                              {valeurTexte(appel.lieuExecution)}
                            </strong>
                          </div>
                        </div>

                        <div className="publication-information-item">
                          <div className="information-icon">
                            <Building2 size={17} />
                          </div>
                          <div>
                            <span>Type de marché</span>
                            <strong>
                              {valeurTexte(
                                appel.typeMarche ||
                                  appel.type ||
                                  appel.typeAppelOffre
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="publication-card-footer">
                      <div className="publication-footer-note">
                        <CheckCircle2 size={16} />
                        <span>Publication officielle SPAT</span>
                      </div>

                      <button
                        className="publication-detail-button"
                        onClick={() => setAppelSelectionne(appel)}
                      >
                        <Eye size={17} />
                        Voir les détails
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          <footer className="soumissionnaire-footer">
            <span>© {new Date().getFullYear()} SPAT – Tous droits réservés.</span>
            <span>Plateforme de gestion des appels d'offres et des marchés</span>
          </footer>
        </div>
      </section>

      {appelSelectionne && (
        <div
          className="detail-modal-overlay"
          onClick={() => setAppelSelectionne(null)}
        >
          <div
            className="detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail-modal-header">
              <div>
                <span className="section-eyebrow">PUBLICATION OFFICIELLE</span>
                <h2>Détails de l'appel d'offres</h2>
              </div>

              <button
                className="modal-close"
                onClick={() => setAppelSelectionne(null)}
                aria-label="Fermer"
              >
                <X size={21} />
              </button>
            </div>

            <div className="detail-modal-content">
              <div className="detail-reference">
                <FileText size={16} />
                Référence : {valeurTexte(appelSelectionne.reference)}
                <span className="detail-published-badge">
                  <CheckCircle2 size={13} />
                  PUBLIE
                </span>
              </div>

              <h3>{valeurTexte(appelSelectionne.objet)}</h3>

              <p className="detail-description">
                {valeurTexte(
                  appelSelectionne.description,
                  "Aucune description disponible."
                )}
              </p>

              <div className="detail-info-list">
                <div>
                  <CalendarDays size={18} />
                  <span>Date de publication</span>
                  <strong>
                    {formatDate(appelSelectionne.datePublication)}
                  </strong>
                </div>

                <div>
                  <Clock size={18} />
                  <span>Date limite de dépôt</span>
                  <strong>
                    {formatDate(appelSelectionne.dateLimiteDepot)}
                  </strong>
                </div>

                <div>
                  <MapPin size={18} />
                  <span>Lieu d'exécution</span>
                  <strong>
                    {valeurTexte(appelSelectionne.lieuExecution)}
                  </strong>
                </div>

                <div>
                  <Tag size={18} />
                  <span>Catégorie</span>
                  <strong>
                    {valeurTexte(
                      appelSelectionne.categorieMarche ||
                        appelSelectionne.categorie ||
                        appelSelectionne.typeMarche
                    )}
                  </strong>
                </div>

                <div>
                  <Building2 size={18} />
                  <span>Type de marché</span>
                  <strong>
                    {valeurTexte(
                      appelSelectionne.typeMarche ||
                        appelSelectionne.type ||
                        appelSelectionne.typeAppelOffre
                    )}
                  </strong>
                </div>

                {appelSelectionne.montantEstime !== null &&
                  appelSelectionne.montantEstime !== undefined && (
                    <div>
                      <FileText size={18} />
                      <span>Montant estimé</span>
                      <strong>
                        {Number(
                          appelSelectionne.montantEstime
                        ).toLocaleString("fr-FR")}{" "}
                        Ar
                      </strong>
                    </div>
                  )}
              </div>
            </div>

            <div className="detail-modal-footer">
              <button
                className="detail-close-button"
                onClick={() => setAppelSelectionne(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
