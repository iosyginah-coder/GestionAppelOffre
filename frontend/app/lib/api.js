
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
