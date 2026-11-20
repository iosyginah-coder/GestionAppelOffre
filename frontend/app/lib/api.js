
// Utiliser le même domaine que le frontend.
// Next.js transmet les requêtes /api vers Spring Boot.
const API_URL = "";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type");

  const data = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message || data.error || "Erreur du serveur"
        : data || "Erreur du serveur";

    throw new Error(`${message} (HTTP ${response.status})`);
  }

  return data;
}

export async function connecter(matricule, motDePasse) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      matricule,
      motDePasse,
    }),
  });
}

export async function deconnecter() {
  return apiRequest("/api/auth/logout", {
    method: "POST",
  });
}

export async function verifierSession() {
  return apiRequest("/api/auth/session", {
    method: "GET",
  });
}
