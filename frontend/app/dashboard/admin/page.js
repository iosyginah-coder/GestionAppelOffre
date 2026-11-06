
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FolderKanban, ClipboardList, Bell,
  Search, Plus, Pencil, Trash2, LogOut, Menu, X, RefreshCw,
  ShieldCheck, CheckCircle2, AlertCircle, Save, Sun, Moon,
  Settings, Check, KeyRound, BriefcaseBusiness
} from "lucide-react";

import "../../css/admin.css";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const API = {
  utilisateurs: `${BASE_URL}/api/utilisateurs`,
  categories: `${BASE_URL}/api/categories-marches`,
  criteres: `${BASE_URL}/api/criteres-evaluation`,
  session: `${BASE_URL}/api/auth/session`,
  logout: `${BASE_URL}/api/auth/logout`,
  demandes: `${BASE_URL}/api/auth/password-reset-requests`,
};

const MENUS = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "utilisateurs", label: "Utilisateurs", icon: Users },
  { id: "categories", label: "Catégories de marchés", icon: FolderKanban },
  { id: "criteres", label: "Grilles d'évaluation", icon: ClipboardList },
];

const ROLES = [
  "ADMINISTRATEUR",
  "RESPONSABLE_MARCHES",
  "EVALUATEUR",
  "SOUMISSIONNAIRE",
];

const UTILISATEUR_VIDE = {
  matricule: "",
  nomComplet: "",
  email: "",
  role: "EVALUATEUR",
  departement: "",
  statut: "ACTIF",
};

const CATEGORIE_VIDE = {
  nomCategorie: "",
  description: "",
  statut: "ACTIF",
};

const CRITERE_VIDE = {
  nomCritere: "",
  description: "",
  ponderation: "",
};

async function apiRequest(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
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
      "Impossible de contacter le backend. Vérifie que Spring Boot fonctionne sur le port 8080."
    );
  }

  const raw = response.status === 204 ? "" : await response.text();
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expirée. Reconnecte-toi.");
    }
    if (response.status === 403) {
      throw new Error("Accès refusé. Vérifie ton rôle administrateur.");
    }

    throw new Error(
      data.message || data.detail || data.error ||
      `Erreur HTTP ${response.status}`
    );
  }

  return data;
}

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getId(item, type) {
  if (type === "utilisateur") {
    return item.idUtilisateur ?? item.idutilisateur ?? item.id;
  }
  if (type === "categorie") {
    return item.idCategorie ?? item.idCategorieMarche ?? item.id;
  }
  if (type === "critere") {
    return item.idCritere ?? item.id;
  }
  return item.id ?? item.idDemande ?? item.idDemandeReinitialisation;
}

function formatDate(value) {
  if (!value) return "—";

  let date;
  if (Array.isArray(value)) {
    const [y, m = 1, d = 1, h = 0, min = 0, s = 0] = value;
    date = new Date(y, m - 1, d, h, min, s);
  } else {
    date = new Date(value);
  }

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR");
}

function formatRole(role) {
  return String(role || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Badge({ value }) {
  const status = String(value || "INCONNU").toUpperCase();
  let color = "neutral";

  if (["ACTIF", "TRAITEE"].includes(status)) color = "success";
  if (["SUSPENDU", "REJETEE"].includes(status)) color = "danger";
  if (["INACTIF", "EN_ATTENTE"].includes(status)) color = "warning";

  return (
    <span className={`spat-badge spat-badge-${color}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="spat-stat-card">
      <div className="spat-stat-icon"><Icon size={22} /></div>
      <span className="spat-stat-label">{label}</span>
      <strong className="spat-stat-value">{value}</strong>
      <small className="spat-stat-detail">{detail}</small>
    </article>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [utilisateurs, setUtilisateurs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [criteres, setCriteres] = useState([]);
  const [demandes, setDemandes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [deconnexion, setDeconnexion] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalType, setModalType] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [utilisateurForm, setUtilisateurForm] = useState(UTILISATEUR_VIDE);
  const [categorieForm, setCategorieForm] = useState(CATEGORIE_VIDE);
  const [critereForm, setCritereForm] = useState(CRITERE_VIDE);
  const [statutInitial, setStatutInitial] = useState("ACTIF");

  const currentMenu = MENUS.find((menu) => menu.id === activeMenu);

  const notifySuccess = (message) => {
    setSuccess(message);
    setError("");
  };

  const verifierSession = useCallback(async () => {
    try {
      const data = await apiRequest(API.session);
      const role = String(data.role || "").toUpperCase();

      if (role !== "ADMINISTRATEUR") {
        router.replace("/");
        return;
      }

      setAdmin({
        nomComplet: data.nomComplet || "Administrateur",
        matricule: data.matricule || "",
        role,
      });
    } catch {
      router.replace("/");
    } finally {
      setSessionLoading(false);
    }
  }, [router]);

  const chargerUtilisateurs = useCallback(async () => {
    const data = await apiRequest(API.utilisateurs);
    setUtilisateurs(getList(data));
  }, []);

  const chargerCategories = useCallback(async () => {
    const data = await apiRequest(API.categories);
    setCategories(getList(data));
  }, []);

  const chargerCriteres = useCallback(async () => {
    const data = await apiRequest(API.criteres);
    setCriteres(getList(data));
  }, []);

  const chargerDemandes = useCallback(async () => {
    try {
      const data = await apiRequest(API.demandes);
      setDemandes(
        getList(data).filter(
          (item) => String(item.statut || "").toUpperCase() === "EN_ATTENTE"
        )
      );
    } catch (err) {
      console.error("Chargement des notifications :", err);
    }
  }, []);

  const actualiser = useCallback(async () => {
    setLoading(true);
    setError("");

    const operations = await Promise.allSettled([
      chargerUtilisateurs(),
      chargerCategories(),
      chargerCriteres(),
      chargerDemandes(),
    ]);

    const labels = [
      "utilisateurs",
      "catégories de marchés",
      "critères d'évaluation",
      "notifications",
    ];

    const failed = operations
      .map((result, index) => result.status === "rejected" ? labels[index] : null)
      .filter(Boolean);

    if (failed.length) {
      setError(
        `Certaines données n'ont pas pu être chargées : ${failed.join(", ")}. Vérifie les routes backend.`
      );
    }

    setLoading(false);
  }, [chargerUtilisateurs, chargerCategories, chargerCriteres, chargerDemandes]);

  useEffect(() => {
    verifierSession();
  }, [verifierSession]);

  useEffect(() => {
    if (admin) actualiser();
  }, [admin, actualiser]);

  useEffect(() => {
    try {
      setDarkMode(localStorage.getItem("spat-admin-theme") === "dark");
    } catch {
      setDarkMode(false);
    }
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    try {
      localStorage.setItem("spat-admin-theme", darkMode ? "dark" : "light");
    } catch {
      // Le thème fonctionne aussi sans stockage local.
    }
  }, [darkMode, themeReady]);

  useEffect(() => {
    if (!admin) return;
    const timer = window.setInterval(chargerDemandes, 30000);
    return () => window.clearInterval(timer);
  }, [admin, chargerDemandes]);

  const ouvrirCreation = (type) => {
    setEditingId(null);
    setError("");
    setSuccess("");

    if (type === "utilisateur") setUtilisateurForm({ ...UTILISATEUR_VIDE });
    if (type === "categorie") setCategorieForm({ ...CATEGORIE_VIDE });
    if (type === "critere") setCritereForm({ ...CRITERE_VIDE });

    setStatutInitial("ACTIF");
    setModalType(type);
  };

  const ouvrirModification = (type, item) => {
    const id = getId(item, type);

    if (id == null) {
      setError("Identifiant introuvable dans les données du backend.");
      return;
    }

    setEditingId(id);
    setError("");
    setSuccess("");

    if (type === "utilisateur") {
      setStatutInitial(item.statut || "ACTIF");
      setUtilisateurForm({
        matricule: item.matricule || "",
        nomComplet: item.nomComplet || "",
        email: item.email || "",
        role: item.role || "EVALUATEUR",
        departement: item.departement || "",
        statut: item.statut || "ACTIF",
      });
    }

    if (type === "categorie") {
      setCategorieForm({
        nomCategorie: item.nomCategorie || "",
        description: item.description || "",
        statut: item.statut || "ACTIF",
      });
    }

    if (type === "critere") {
      setCritereForm({
        nomCritere: item.nomCritere || "",
        description: item.description || "",
        ponderation: String(item.ponderation ?? ""),
      });
    }

    setModalType(type);
  };

  const fermerModal = () => {
    if (saving) return;
    setModalType(null);
    setEditingId(null);
    setError("");
  };

  const enregistrerUtilisateur = async (event) => {
    event.preventDefault();
    const form = utilisateurForm;
    const matricule = form.matricule.trim();
    const nomComplet = form.nomComplet.trim();
    const email = form.email.trim();
    const departement = form.departement.trim();

    if (editingId == null && !/^\d{7}$/.test(matricule)) {
      setError("Le matricule doit contenir exactement 7 chiffres.");
      return;
    }
    if (!nomComplet) {
      setError("Le nom complet est obligatoire.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("L'adresse e-mail est invalide.");
      return;
    }
    if (form.role !== "SOUMISSIONNAIRE" && !departement) {
      setError("Le département est obligatoire pour ce rôle.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId != null) {
        await apiRequest(`${API.utilisateurs}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            nomComplet,
            email,
            role: form.role,
            departement: form.role === "SOUMISSIONNAIRE" ? null : departement,
          }),
        });

        if (form.statut !== statutInitial) {
          await apiRequest(`${API.utilisateurs}/${editingId}/statut`, {
            method: "PATCH",
            body: JSON.stringify({ statut: form.statut }),
          });
        }

        notifySuccess("Utilisateur modifié avec succès.");
      } else {
        await apiRequest(API.utilisateurs, {
          method: "POST",
          body: JSON.stringify({
            matricule,
            nomComplet,
            email,
            role: form.role,
            departement: form.role === "SOUMISSIONNAIRE" ? null : departement,
            motDePasseInitial: null,
          }),
        });
        notifySuccess("Utilisateur créé. Vérifie l'envoi du mot de passe temporaire par le backend.");
      }

      await chargerUtilisateurs();
      setModalType(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const enregistrerCategorie = async (event) => {
    event.preventDefault();

    const nomCategorie = categorieForm.nomCategorie.trim();
    if (!nomCategorie) {
      setError("Le nom de la catégorie est obligatoire.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        nomCategorie,
        description: categorieForm.description.trim(),
        statut: categorieForm.statut || "ACTIF",
      };

      await apiRequest(
        editingId != null ? `${API.categories}/${editingId}` : API.categories,
        {
          method: editingId != null ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      await chargerCategories();
      setModalType(null);
      notifySuccess(editingId != null ? "Catégorie modifiée." : "Catégorie ajoutée.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const enregistrerCritere = async (event) => {
    event.preventDefault();

    const nomCritere = critereForm.nomCritere.trim();
    const ponderation = Number(critereForm.ponderation);

    if (!nomCritere) {
      setError("Le nom du critère est obligatoire.");
      return;
    }
    if (!Number.isFinite(ponderation) || ponderation < 0 || ponderation > 100) {
      setError("La pondération doit être comprise entre 0 et 100.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        nomCritere,
        description: critereForm.description.trim(),
        ponderation,
      };

      await apiRequest(
        editingId != null ? `${API.criteres}/${editingId}` : API.criteres,
        {
          method: editingId != null ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      await chargerCriteres();
      setModalType(null);
      notifySuccess(editingId != null ? "Critère modifié." : "Critère ajouté.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const supprimerElement = async (type, item) => {
    const id = getId(item, type);
    if (id == null) {
      setError("Identifiant introuvable.");
      return;
    }

    const nom =
      item.nomComplet || item.nomCategorie || item.nomCritere || "cet élément";

    if (!window.confirm(`Voulez-vous vraiment supprimer ${nom} ?`)) return;

    setProcessingId(id);
    setError("");

    const url = type === "utilisateur"
      ? API.utilisateurs
      : type === "categorie"
        ? API.categories
        : API.criteres;

    try {
      await apiRequest(`${url}/${id}`, { method: "DELETE" });

      if (type === "utilisateur") await chargerUtilisateurs();
      if (type === "categorie") await chargerCategories();
      if (type === "critere") await chargerCriteres();

      notifySuccess("Suppression effectuée avec succès.");
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const traiterDemande = async (demande, statut) => {
    const id = getId(demande, "demande");

    if (id == null) {
      setError("Identifiant de la demande absent dans la réponse du backend.");
      return;
    }

    setProcessingId(id);
    setError("");

    try {
      const data = await apiRequest(`${API.demandes}/${id}/statut`, {
        method: "PATCH",
        body: JSON.stringify({ statut }),
      });

      await chargerDemandes();
      notifySuccess(
        data.message ||
        (statut === "TRAITEE"
          ? "Demande acceptée."
          : "Demande refusée.")
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const deconnecter = async () => {
    if (deconnexion) return;
    setDeconnexion(true);

    try {
      await apiRequest(API.logout, { method: "POST" });
    } catch (err) {
      console.error("Déconnexion :", err);
    } finally {
      router.replace("/");
      router.refresh();
      setDeconnexion(false);
    }
  };

  const utilisateursFiltres = useMemo(() => {
    const q = search.toLowerCase();
    return utilisateurs.filter((item) =>
      [
        item.matricule, item.nomComplet, item.email,
        item.role, item.departement, item.statut,
      ].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [utilisateurs, search]);

  const categoriesFiltrees = useMemo(() => {
    const q = search.toLowerCase();
    return categories.filter((item) =>
      `${item.nomCategorie || ""} ${item.description || ""}`
        .toLowerCase().includes(q)
    );
  }, [categories, search]);

  const criteresFiltres = useMemo(() => {
    const q = search.toLowerCase();
    return criteres.filter((item) =>
      `${item.nomCritere || ""} ${item.description || ""}`
        .toLowerCase().includes(q)
    );
  }, [criteres, search]);

  const actifs = utilisateurs.filter((u) => u.statut === "ACTIF").length;
  const totalPonderation = criteres.reduce(
    (total, item) => total + Number(item.ponderation || 0), 0
  );

  if (sessionLoading) {
    return (
      <div className="spat-loading">
        <RefreshCw size={24} className="spat-spin" />
        Vérification de votre session...
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div
      className={`spat-admin ${darkMode ? "spat-dark-mode" : ""}`}
      onClick={(event) => {
        if (!event.target.closest(".spat-settings-wrapper")) setSettingsOpen(false);
        if (!event.target.closest(".spat-notification-wrapper")) setNotificationsOpen(false);
      }}
    >
      {sidebarOpen && (
        <button
          type="button"
          className="spat-sidebar-overlay"
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`spat-sidebar ${sidebarOpen ? "spat-sidebar-open" : ""}`}>
        <div className="spat-brand">
          <div className="spat-brand-logo">SPAT</div>
          <div className="spat-brand-text">
            <strong>SPAT</strong>
            <span>Gestion des marchés</span>
          </div>
          <button
            type="button"
            className="spat-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer"
          >
            <X size={21} />
          </button>
        </div>

        <div className="spat-sidebar-caption">MENU PRINCIPAL</div>

        <nav className="spat-nav">
          {MENUS.map((menu) => {
            const Icon = menu.icon;
            return (
              <button
                type="button"
                key={menu.id}
                className={`spat-nav-item ${activeMenu === menu.id ? "spat-nav-active" : ""}`}
                onClick={() => {
                  setActiveMenu(menu.id);
                  setSearch("");
                  setError("");
                  setSuccess("");
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{menu.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="spat-sidebar-bottom">
          <div className="spat-sidebar-help">
            <ShieldCheck size={22} />
            <div>
              <strong>Espace sécurisé</strong>
              <span>Administration SPAT</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="spat-main">
        <header className="spat-navbar">
          <div className="spat-navbar-left">
            <button
              type="button"
              className="spat-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <div className="spat-breadcrumb">SPAT / Administration</div>
              <h1>{currentMenu?.label || "Tableau de bord"}</h1>
            </div>
          </div>

          <div className="spat-navbar-right">
            <div className="spat-notification-wrapper">
              <button
                type="button"
                className="spat-notification-button"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  setSettingsOpen(false);
                  if (!notificationsOpen) chargerDemandes();
                }}
              >
                <Bell size={20} />
                {demandes.length > 0 && <span className="spat-notification-dot" />}
              </button>

              {notificationsOpen && (
                <div className="spat-notification-panel">
                  <div className="spat-notification-heading">
                    <strong>Demandes en attente ({demandes.length})</strong>
                    <button type="button" onClick={chargerDemandes}>
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  {demandes.length === 0 ? (
                    <div className="spat-notification-empty">
                      <CheckCircle2 size={21} />
                      <p>Aucune demande en attente.</p>
                    </div>
                  ) : (
                    demandes.map((demande, index) => {
                      const id = getId(demande, "demande");
                      return (
                        <div className="spat-notification-item" key={id ?? index}>
                          <div className="spat-notification-icon">
                            <KeyRound size={18} />
                          </div>
                          <div className="spat-notification-body">
                            <strong>Réinitialisation du mot de passe</strong>
                            <p>Matricule : {demande.matricule || "—"}</p>
                            <small>{formatDate(demande.dateDemande)}</small>
                            <div className="spat-notification-actions">
                              <button
                                type="button"
                                className="spat-mini-accept"
                                disabled={processingId === id}
                                onClick={() => traiterDemande(demande, "TRAITEE")}
                              >
                                <Check size={14} /> Accepter
                              </button>
                              <button
                                type="button"
                                className="spat-mini-reject"
                                disabled={processingId === id}
                                onClick={() => traiterDemande(demande, "REJETEE")}
                              >
                                <X size={14} /> Refuser
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="spat-settings-wrapper">
              <button
                type="button"
                className="spat-settings-button"
                aria-label="Paramètres"
                onClick={() => {
                  setSettingsOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
              >
                <Settings size={20} />
              </button>

              {settingsOpen && (
                <div className="spat-settings-menu">
                  <div className="spat-settings-title">
                    <div className="spat-avatar">
                      {(admin.nomComplet || "A").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{admin.nomComplet}</strong>
                      <span>Administrateur</span>
                    </div>
                  </div>

                  <div className="spat-settings-divider" />

                  <button
                    type="button"
                    className="spat-settings-item"
                    onClick={() => setDarkMode(false)}
                  >
                    <Sun size={18} /><span>Mode clair</span>
                    {!darkMode && <Check size={16} />}
                  </button>

                  <button
                    type="button"
                    className="spat-settings-item"
                    onClick={() => setDarkMode(true)}
                  >
                    <Moon size={18} /><span>Mode sombre</span>
                    {darkMode && <Check size={16} />}
                  </button>

                  <div className="spat-settings-divider" />

                  <button
                    type="button"
                    className="spat-settings-item spat-settings-logout"
                    onClick={deconnecter}
                    disabled={deconnexion}
                  >
                    {deconnexion
                      ? <RefreshCw size={18} className="spat-spin" />
                      : <LogOut size={18} />}
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>

            <div className="spat-profile">
              <div className="spat-avatar">
                {(admin.nomComplet || "A").charAt(0).toUpperCase()}
              </div>
              <div className="spat-profile-info">
                <strong>{admin.nomComplet}</strong>
                <span>Administrateur</span>
              </div>
            </div>
          </div>
        </header>

        <section className="spat-content">
          {error && (
            <div className="spat-alert spat-alert-error" role="alert">
              <AlertCircle size={19} />
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}><X size={17} /></button>
            </div>
          )}

          {success && (
            <div className="spat-alert spat-alert-success" role="status">
              <CheckCircle2 size={19} />
              <span>{success}</span>
              <button type="button" onClick={() => setSuccess("")}><X size={17} /></button>
            </div>
          )}

          <div className="spat-page-toolbar">
            <div>
              <h2>{currentMenu?.label || "Tableau de bord"}</h2>
              <p>Administration de la plateforme de gestion des appels d'offres et des marchés.</p>
            </div>
            <button type="button" className="spat-button spat-button-secondary" onClick={actualiser} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spat-spin" : ""} />
              Actualiser
            </button>
          </div>

          {loading && (
            <div className="spat-loading-inline">
              <RefreshCw size={18} className="spat-spin" /> Chargement des données...
            </div>
          )}

          {!loading && activeMenu === "dashboard" && (
            <>
              <div className="spat-welcome">
                <div>
                  <span className="spat-welcome-label">ESPACE ADMINISTRATEUR</span>
                  <h2>Bonjour, {admin.nomComplet}</h2>
                  <p>Bienvenue sur votre espace de gestion de la plateforme SPAT.</p>
                </div>
                <div className="spat-welcome-icon"><BriefcaseBusiness size={42} /></div>
              </div>

              <div className="spat-stats-grid">
                <StatCard icon={Users} label="Utilisateurs" value={utilisateurs.length} detail="Comptes enregistrés" />
                <StatCard icon={CheckCircle2} label="Utilisateurs actifs" value={actifs} detail="Comptes actifs" />
                <StatCard icon={FolderKanban} label="Catégories" value={categories.length} detail="Catégories configurées" />
                <StatCard icon={ClipboardList} label="Critères" value={criteres.length} detail="Critères d'évaluation" />
              </div>

              <div className="spat-dashboard-bottom">
                <section className="spat-panel">
                  <div className="spat-panel-heading">
                    <div>
                      <h3>Accès rapides</h3>
                      <p>Accéder directement aux fonctions d'administration.</p>
                    </div>
                  </div>
                  <div className="spat-quick-actions">
                    <button type="button" onClick={() => ouvrirCreation("utilisateur")}>
                      <Users size={22} /><span>Créer un utilisateur</span>
                    </button>
                    <button type="button" onClick={() => { setActiveMenu("categories"); ouvrirCreation("categorie"); }}>
                      <FolderKanban size={22} /><span>Ajouter une catégorie</span>
                    </button>
                    <button type="button" onClick={() => { setActiveMenu("criteres"); ouvrirCreation("critere"); }}>
                      <ClipboardList size={22} /><span>Ajouter un critère</span>
                    </button>
                  </div>
                </section>

                <section className="spat-panel">
                  <div className="spat-panel-heading">
                    <div>
                      <h3>Vue d'ensemble</h3>
                      <p>État des configurations.</p>
                    </div>
                  </div>
                  <div className="spat-overview-row">
                    <span>Demandes de réinitialisation en attente</span>
                    <strong>{demandes.length}</strong>
                  </div>
                  <div className="spat-overview-row">
                    <span>Critères configurés</span>
                    <strong>{criteres.length}</strong>
                  </div>
                  <div className="spat-overview-row">
                    <span>Total des pondérations des critères</span>
                    <strong>{totalPonderation.toFixed(2)} %</strong>
                  </div>
                </section>
              </div>
            </>
          )}

          {!loading && activeMenu === "utilisateurs" && (
            <section className="spat-panel">
              <div className="spat-panel-heading spat-panel-heading-wrap">
                <div>
                  <h3>Gestion des utilisateurs</h3>
                  <p>Créer, modifier et supprimer les comptes utilisateurs.</p>
                </div>
                <button type="button" className="spat-button spat-button-primary" onClick={() => ouvrirCreation("utilisateur")}>
                  <Plus size={18} /> Nouvel utilisateur
                </button>
              </div>

              <div className="spat-table-tools">
                <div className="spat-search">
                  <Search size={18} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..." />
                </div>
                <span className="spat-result-count">{utilisateursFiltres.length} utilisateur(s)</span>
              </div>

              <div className="spat-table-wrapper">
                <table className="spat-table">
                  <thead>
                    <tr>
                      <th>Matricule</th><th>Nom complet</th><th>E-mail</th>
                      <th>Rôle</th><th>Département</th><th>Statut</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilisateursFiltres.map((user, index) => {
                      const id = getId(user, "utilisateur");
                      return (
                        <tr key={id ?? index}>
                          <td>{user.matricule || "—"}</td>
                          <td className="spat-name-cell">{user.nomComplet || "—"}</td>
                          <td>{user.email || "—"}</td>
                          <td>{formatRole(user.role)}</td>
                          <td>{user.departement || "—"}</td>
                          <td><Badge value={user.statut} /></td>
                          <td>
                            <div className="spat-row-actions">
                              <button type="button" className="spat-icon-button spat-edit-button" title="Modifier" onClick={() => ouvrirModification("utilisateur", user)}>
                                <Pencil size={16} />
                              </button>
                              <button type="button" className="spat-icon-button spat-delete-button" title="Supprimer" disabled={processingId === id} onClick={() => supprimerElement("utilisateur", user)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {utilisateursFiltres.length === 0 && (
                      <tr><td colSpan="7"><div className="spat-empty"><Users size={30} /><strong>Aucun utilisateur trouvé</strong><p>Ajoute un utilisateur ou modifie ta recherche.</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!loading && activeMenu === "categories" && (
            <section className="spat-panel">
              <div className="spat-panel-heading spat-panel-heading-wrap">
                <div>
                  <h3>Catégories de marchés</h3>
                  <p>Configurer les catégories disponibles pour les appels d'offres.</p>
                </div>
                <button type="button" className="spat-button spat-button-primary" onClick={() => ouvrirCreation("categorie")}>
                  <Plus size={18} /> Ajouter une catégorie
                </button>
              </div>

              <div className="spat-table-tools">
                <div className="spat-search">
                  <Search size={18} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une catégorie..." />
                </div>
                <span className="spat-result-count">{categoriesFiltrees.length} catégorie(s)</span>
              </div>

              <div className="spat-table-wrapper">
                <table className="spat-table">
                  <thead>
                    <tr><th>Nom de la catégorie</th><th>Description</th><th>Statut</th><th>Date de création</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {categoriesFiltrees.map((item, index) => {
                      const id = getId(item, "categorie");
                      return (
                        <tr key={id ?? index}>
                          <td className="spat-name-cell">{item.nomCategorie || "—"}</td>
                          <td className="spat-description-cell">{item.description || "—"}</td>
                          <td><Badge value={item.statut} /></td>
                          <td>{formatDate(item.dateCreation)}</td>
                          <td>
                            <div className="spat-row-actions">
                              <button type="button" className="spat-icon-button spat-edit-button" title="Modifier" onClick={() => ouvrirModification("categorie", item)}><Pencil size={16} /></button>
                              <button type="button" className="spat-icon-button spat-delete-button" title="Supprimer" disabled={processingId === id} onClick={() => supprimerElement("categorie", item)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {categoriesFiltrees.length === 0 && (
                      <tr><td colSpan="5"><div className="spat-empty"><FolderKanban size={30} /><strong>Aucune catégorie disponible</strong><p>Utilise le bouton Ajouter une catégorie pour commencer.</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!loading && activeMenu === "criteres" && (
            <section className="spat-panel">
              <div className="spat-panel-heading spat-panel-heading-wrap">
                <div>
                  <h3>Grilles d'évaluation</h3>
                  <p>Configurer les critères et leurs pondérations.</p>
                </div>
                <button type="button" className="spat-button spat-button-primary" onClick={() => ouvrirCreation("critere")}>
                  <Plus size={18} /> Ajouter un critère
                </button>
              </div>

              <div className="spat-info-note">
                <ClipboardList size={20} />
                <div>
                  <strong>Configuration des pondérations</strong>
                  <p>Chaque critère possède une pondération en pourcentage. Le total affiché ci-dessous est la somme des critères enregistrés.</p>
                </div>
              </div>

              <div className="spat-weight-summary">
                <span>Total des pondérations enregistrées</span>
                <strong>{totalPonderation.toFixed(2)} %</strong>
              </div>

              <div className="spat-table-tools">
                <div className="spat-search">
                  <Search size={18} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un critère..." />
                </div>
                <span className="spat-result-count">{criteresFiltres.length} critère(s)</span>
              </div>

              <div className="spat-table-wrapper">
                <table className="spat-table">
                  <thead>
                    <tr><th>Critère</th><th>Description</th><th>Pondération</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {criteresFiltres.map((item, index) => {
                      const id = getId(item, "critere");
                      const weight = Number(item.ponderation || 0);
                      return (
                        <tr key={id ?? index}>
                          <td className="spat-name-cell">{item.nomCritere || "—"}</td>
                          <td className="spat-description-cell">{item.description || "—"}</td>
                          <td>
                            <div className="spat-weight-cell">
                              <strong>{weight.toFixed(2)} %</strong>
                              <div className="spat-weight-track">
                                <div className="spat-weight-progress" style={{ width: `${Math.min(100, Math.max(0, weight))}%` }} />
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="spat-row-actions">
                              <button type="button" className="spat-icon-button spat-edit-button" title="Modifier" onClick={() => ouvrirModification("critere", item)}><Pencil size={16} /></button>
                              <button type="button" className="spat-icon-button spat-delete-button" title="Supprimer" disabled={processingId === id} onClick={() => supprimerElement("critere", item)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {criteresFiltres.length === 0 && (
                      <tr><td colSpan="4"><div className="spat-empty"><ClipboardList size={30} /><strong>Aucun critère configuré</strong><p>Ajoute les critères utilisés pour évaluer les offres.</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </section>
      </main>

      {modalType && (
        <div className="spat-modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) fermerModal();
        }}>
          <section className="spat-modal" role="dialog" aria-modal="true">
            <div className="spat-modal-heading">
              <div>
                <span className="spat-modal-kicker">ADMINISTRATION SPAT</span>
                <h2>
                  {editingId != null ? "Modifier " : "Ajouter "}
                  {modalType === "utilisateur" ? "un utilisateur" : modalType === "categorie" ? "une catégorie" : "un critère"}
                </h2>
              </div>
              <button type="button" className="spat-icon-button" onClick={fermerModal} disabled={saving}><X size={19} /></button>
            </div>

            {modalType === "utilisateur" && (
              <form className="spat-form" onSubmit={enregistrerUtilisateur}>
                <div className="spat-form-grid">
                  <label>
                    Matricule
                    <input value={utilisateurForm.matricule} maxLength={7} disabled={editingId != null} onChange={(e) => setUtilisateurForm({ ...utilisateurForm, matricule: e.target.value.replace(/\D/g, "") })} placeholder="Ex. 1234567" required />
                  </label>
                  <label>
                    Nom complet
                    <input value={utilisateurForm.nomComplet} onChange={(e) => setUtilisateurForm({ ...utilisateurForm, nomComplet: e.target.value })} required />
                  </label>
                  <label>
                    Adresse e-mail
                    <input type="email" value={utilisateurForm.email} onChange={(e) => setUtilisateurForm({ ...utilisateurForm, email: e.target.value })} required />
                  </label>
                  <label>
                    Rôle
                    <select value={utilisateurForm.role} onChange={(e) => setUtilisateurForm({ ...utilisateurForm, role: e.target.value })}>
                      {ROLES.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}
                    </select>
                  </label>
                  {utilisateurForm.role !== "SOUMISSIONNAIRE" && (
                    <label>
                      Département
                      <input value={utilisateurForm.departement} onChange={(e) => setUtilisateurForm({ ...utilisateurForm, departement: e.target.value })} required />
                    </label>
                  )}
                  {editingId != null && (
                    <label>
                      Statut
                      <select value={utilisateurForm.statut} onChange={(e) => setUtilisateurForm({ ...utilisateurForm, statut: e.target.value })}>
                        <option value="ACTIF">ACTIF</option>
                        <option value="SUSPENDU">SUSPENDU</option>
                      </select>
                    </label>
                  )}
                </div>
                <p className="spat-form-help">Le mot de passe initial doit être généré et envoyé par le backend lors de la création du compte.</p>
                <div className="spat-modal-footer">
                  <button type="button" className="spat-button spat-button-secondary" onClick={fermerModal} disabled={saving}>Annuler</button>
                  <button type="submit" className="spat-button spat-button-primary" disabled={saving}>
                    {saving ? <RefreshCw size={16} className="spat-spin" /> : <Save size={16} />}
                    Enregistrer
                  </button>
                </div>
              </form>
            )}

            {modalType === "categorie" && (
              <form className="spat-form" onSubmit={enregistrerCategorie}>
                <label>
                  Nom de la catégorie
                  <input value={categorieForm.nomCategorie} onChange={(e) => setCategorieForm({ ...categorieForm, nomCategorie: e.target.value })} placeholder="Ex. FOURNITURE" required maxLength={100} />
                </label>
                <label>
                  Description
                  <textarea rows={4} value={categorieForm.description} onChange={(e) => setCategorieForm({ ...categorieForm, description: e.target.value })} placeholder="Description de la catégorie..." />
                </label>
                <label>
                  Statut
                  <select value={categorieForm.statut} onChange={(e) => setCategorieForm({ ...categorieForm, statut: e.target.value })}>
                    <option value="ACTIF">ACTIF</option>
                    <option value="INACTIF">INACTIF</option>
                  </select>
                </label>
                <div className="spat-modal-footer">
                  <button type="button" className="spat-button spat-button-secondary" onClick={fermerModal} disabled={saving}>Annuler</button>
                  <button type="submit" className="spat-button spat-button-primary" disabled={saving}>
                    {saving ? <RefreshCw size={16} className="spat-spin" /> : <Save size={16} />}
                    Enregistrer
                  </button>
                </div>
              </form>
            )}

            {modalType === "critere" && (
              <form className="spat-form" onSubmit={enregistrerCritere}>
                <label>
                  Nom du critère
                  <input value={critereForm.nomCritere} onChange={(e) => setCritereForm({ ...critereForm, nomCritere: e.target.value })} placeholder="Ex. Prix financier" required />
                </label>
                <label>
                  Description
                  <textarea rows={3} value={critereForm.description} onChange={(e) => setCritereForm({ ...critereForm, description: e.target.value })} placeholder="Description du critère..." />
                </label>
                <label>
                  Pondération (%)
                  <input type="number" min="0" max="100" step="0.01" value={critereForm.ponderation} onChange={(e) => setCritereForm({ ...critereForm, ponderation: e.target.value })} placeholder="Ex. 40" required />
                  <small>Valeur comprise entre 0 et 100.</small>
                </label>
                <div className="spat-modal-footer">
                  <button type="button" className="spat-button spat-button-secondary" onClick={fermerModal} disabled={saving}>Annuler</button>
                  <button type="submit" className="spat-button spat-button-primary" disabled={saving}>
                    {saving ? <RefreshCw size={16} className="spat-spin" /> : <Save size={16} />}
                    Enregistrer
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
