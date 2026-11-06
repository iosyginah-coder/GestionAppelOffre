import "./globals.css";

export const metadata = {
  title: "SPAT | Gestion des Appels d'Offres",
  description:
    "Plateforme de gestion des appels d'offres et des marchés de la SPAT.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}