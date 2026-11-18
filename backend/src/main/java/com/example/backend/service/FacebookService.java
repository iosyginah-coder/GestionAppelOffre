
package com.example.backend.service;

import com.example.backend.entity.AppelOffre;
import com.example.backend.entity.PhotoAppelOffre;
import com.example.backend.entity.PieceRequise;
import com.example.backend.repository.PieceRequiseRepository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class FacebookService {

    private static final Logger logger =
            LoggerFactory.getLogger(FacebookService.class);

    private final RestClient restClient;
    private final PieceRequiseRepository pieceRepository;
    private final PhotoAppelOffreService photoService;
    private final ObjectMapper objectMapper;

    public record Resultat(boolean succes, String message, String idPost) {

        static Resultat ok(String idPost) {
            return new Resultat(
                    true,
                    "Publication Facebook effectuée avec succès.",
                    idPost
            );
        }

        static Resultat echec(String message) {
            return new Resultat(false, message, null);
        }
    }

    private static class EchecPublication extends RuntimeException {
        EchecPublication(String message) {
            super(message);
        }
    }

    @Value("${facebook.page-id:}")
    private String pageId;

    @Value("${facebook.page-access-token:}")
    private String pageAccessToken;

    @Value("${facebook.graph-api-version:v26.0}")
    private String graphApiVersion;

    @Value("${app.frontend.public-url:}")
    private String frontendPublicUrl;

    // =====================================================
    // CONSTRUCTEUR
    // =====================================================

    public FacebookService(
            RestClient.Builder restClientBuilder,
            PieceRequiseRepository pieceRepository,
            PhotoAppelOffreService photoService) {

        this.restClient = restClientBuilder.build();
        this.pieceRepository = pieceRepository;
        this.photoService = photoService;

        // Création directe de Jackson
        this.objectMapper = new ObjectMapper();
    }

    // =====================================================
    // PUBLICATION PRINCIPALE
    // =====================================================

    public Resultat publierAppelOffre(AppelOffre appel) {

        if (appel == null || appel.getIdAppelOffre() == null) {
            return Resultat.echec("Appel d'offres invalide.");
        }

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {
            return Resultat.echec(
                    "L'appel d'offres doit d'abord être publié dans SPAT."
            );
        }

        if (isBlank(pageId) || isBlank(pageAccessToken)) {
            logger.error("Configuration Facebook incomplète.");

            return Resultat.echec(
                    "Configuration Facebook incomplète : page ID ou token manquant."
            );
        }

        if (isBlank(frontendPublicUrl)
                || !frontendPublicUrl.trim().matches("^https?://\\S+$")) {

            logger.error("URL publique invalide.");

            return Resultat.echec(
                    "URL publique du site invalide."
            );
        }

        try {

            Long idAppel = appel.getIdAppelOffre();

            String baseUrl = frontendPublicUrl.trim()
                    .replaceAll("/+$", "");

            String lienDepot =
                    baseUrl + "/soumissionner/" + idAppel;

            // 1. Récupérer les pièces requises

            List<PieceRequise> pieces =
                    pieceRepository
                            .findByAppelOffre_IdAppelOffreOrderByIdPieceAsc(
                                    idAppel
                            );

            // 2. Récupérer les photos enregistrées

            List<PhotoAppelOffre> photos =
                    photoService.lister(idAppel, false);

            // 3. Construire le message Facebook

            String message =
                    construireMessage(appel, pieces, lienDepot);

            // 4. Envoyer les photos à Facebook

            List<String> idsPhotos = new ArrayList<>();

            if (photos != null) {

                for (PhotoAppelOffre photo : photos) {

                    String idPhotoFacebook =
                            televerserPhoto(photo);

                    idsPhotos.add(idPhotoFacebook);
                }
            }

            logger.info(
                    "{} photo(s) envoyée(s) à Facebook pour {}",
                    idsPhotos.size(),
                    appel.getReference()
            );

            // 5. Préparer la publication

            MultiValueMap<String, String> form =
                    new LinkedMultiValueMap<>();

            form.add("message", message);
            form.add("access_token", pageAccessToken);

            if (idsPhotos.isEmpty()) {

                form.add("link", lienDepot);

            } else {

                for (int i = 0; i < idsPhotos.size(); i++) {

                    String mediaJson =
                            "{\"media_fbid\":\""
                                    + idsPhotos.get(i)
                                    + "\"}";

                    form.add(
                            "attached_media[" + i + "]",
                            mediaJson
                    );
                }
            }

            // 6. Publier sur Facebook

            String reponse = restClient.post()
                    .uri(urlGraph("/feed"))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .exchange((request, response) -> {

                        String contenu =
                                StreamUtils.copyToString(
                                        response.getBody(),
                                        StandardCharsets.UTF_8
                                );

                        if (!response.getStatusCode().is2xxSuccessful()) {
                            throw new EchecPublication(
                                    "Erreur Facebook : " + contenu
                            );
                        }

                        return contenu;
                    });

            // 7. Analyser la réponse Facebook

            JsonNode resultat = analyserReponse(reponse);

            if (resultat.hasNonNull("id")) {

                String idPost = resultat.get("id").asText();

                logger.info(
                        "Publication Facebook réussie : référence={}, idPost={}, photos={}",
                        appel.getReference(),
                        idPost,
                        idsPhotos.size()
                );

                return Resultat.ok(idPost);
            }

            return Resultat.echec(
                    "Facebook n'a pas retourné l'identifiant de publication."
            );

        } catch (EchecPublication e) {

            logger.error(
                    "Échec de publication Facebook : {}",
                    e.getMessage()
            );

            return Resultat.echec(e.getMessage());

        } catch (RestClientResponseException e) {

            logger.error(
                    "Erreur Facebook API : statut={}, réponse={}",
                    e.getStatusCode(),
                    e.getResponseBodyAsString()
            );

            return Resultat.echec(
                    "Facebook a refusé la publication ("
                            + e.getStatusCode().value()
                            + "). Détail : "
                            + e.getResponseBodyAsString()
            );

        } catch (Exception e) {

            logger.error(
                    "Erreur pendant la publication Facebook",
                    e
            );

            return Resultat.echec(
                    "Impossible de publier sur Facebook : "
                            + e.getMessage()
            );
        }
    }

    // =====================================================
    // CONSTRUCTION DU MESSAGE
    // =====================================================

    private String construireMessage(
            AppelOffre appel,
            List<PieceRequise> pieces,
            String lienDepot) {

        String dateLimite = "Non précisée";

        if (appel.getDateLimiteDepot() != null) {

            dateLimite = appel.getDateLimiteDepot()
                    .format(
                            DateTimeFormatter.ofPattern(
                                    "dd/MM/yyyy 'à' HH:mm"
                            )
                    );
        }

        StringBuilder message = new StringBuilder();

        message.append("📢 APPEL D'OFFRES - SPAT\n\n");

        message.append("Référence : ")
                .append(appel.getReference())
                .append("\n\n");

        message.append("Objet : ")
                .append(appel.getObjet())
                .append("\n\n");

        if (!isBlank(appel.getDescription())) {

            message.append("Description : ")
                    .append(appel.getDescription())
                    .append("\n\n");
        }

        if (!isBlank(appel.getLieuExecution())) {

            message.append("Lieu d'exécution : ")
                    .append(appel.getLieuExecution())
                    .append("\n\n");
        }

        message.append("Date limite de dépôt : ")
                .append(dateLimite)
                .append("\n\n");

        if (pieces != null && !pieces.isEmpty()) {

            message.append("📎 PIÈCES REQUISES :\n");

            int numero = 1;

            for (PieceRequise piece : pieces) {

                boolean facultative =
                        Boolean.FALSE.equals(piece.getObligatoire());

                message.append(numero++)
                        .append(". ")
                        .append(piece.getNomPiece())
                        .append(
                                facultative
                                        ? " (facultatif)"
                                        : " (obligatoire)"
                        )
                        .append("\n");

                if (!isBlank(piece.getDescription())) {

                    message.append("   ")
                            .append(piece.getDescription().trim())
                            .append("\n");
                }
            }

            message.append("\n");
        }

        message.append(
                "Les candidats intéressés peuvent consulter les conditions "
        );

        message.append(
                "et déposer leur dossier en ligne.\n\n"
        );

        message.append("👉 Déposer votre offre : ")
                .append(lienDepot);

        return message.toString();
    }

    // =====================================================
    // ENVOI DES PHOTOS À FACEBOOK
    // =====================================================

    private String televerserPhoto(PhotoAppelOffre photo) {

        byte[] octets;

        try {

            octets = photoService.lireOctets(photo);

        } catch (RuntimeException e) {

            logger.error(
                    "Lecture de la photo {} impossible",
                    photo.getIdPhoto(),
                    e
            );

            throw new EchecPublication(
                    "La photo "
                            + photo.getNomFichier()
                            + " est introuvable sur le serveur."
            );
        }

        String type = photo.getTypeContenu();

        if (isBlank(type) || !type.startsWith("image/")) {

            throw new EchecPublication(
                    "Type de photo invalide : "
                            + photo.getNomFichier()
            );
        }

        String nomEnvoye =
                "photo-" + photo.getIdPhoto()
                        + "." + extension(type);

        ByteArrayResource fichier =
                new ByteArrayResource(octets) {

                    @Override
                    public String getFilename() {
                        return nomEnvoye;
                    }
                };

        HttpHeaders entetesPartie = new HttpHeaders();

        entetesPartie.setContentType(
                MediaType.parseMediaType(type)
        );

        MultiValueMap<String, Object> corps =
                new LinkedMultiValueMap<>();

        corps.add(
                "source",
                new HttpEntity<>(fichier, entetesPartie)
        );

        corps.add("published", "false");
        corps.add("access_token", pageAccessToken);

        try {

            // Envoi multipart de la photo

            String reponse = restClient.post()
                    .uri(urlGraph("/photos"))
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(corps)
                    .exchange((request, response) -> {

                        String contenu =
                                StreamUtils.copyToString(
                                        response.getBody(),
                                        StandardCharsets.UTF_8
                                );

                        if (!response.getStatusCode().is2xxSuccessful()) {
                            throw new EchecPublication(
                                    "Facebook a refusé la photo "
                                            + photo.getNomFichier()
                                            + " : "
                                            + contenu
                            );
                        }

                        return contenu;
                    });

            JsonNode resultat = analyserReponse(reponse);

            if (!resultat.hasNonNull("id")) {

                throw new EchecPublication(
                        "Facebook n'a pas retourné l'identifiant de la photo "
                                + photo.getNomFichier()
                );
            }

            String idFacebook =
                    resultat.get("id").asText();

            logger.info(
                    "Photo envoyée à Facebook : {}",
                    photo.getNomFichier()
            );

            return idFacebook;

        } catch (EchecPublication e) {

            throw e;

        } catch (RestClientResponseException e) {

            logger.error(
                    "Erreur Facebook photo : statut={}, réponse={}",
                    e.getStatusCode(),
                    e.getResponseBodyAsString()
            );

            throw new EchecPublication(
                    "Facebook a refusé la photo "
                            + photo.getNomFichier()
                            + " ("
                            + e.getStatusCode().value()
                            + ")."
            );
        }
    }

    // =====================================================
    // ANALYSE DE LA REPONSE FACEBOOK
    // =====================================================

    private JsonNode analyserReponse(String reponse) {

        try {

            JsonNode resultat =
                    objectMapper.readTree(reponse);

            if (resultat == null) {

                throw new EchecPublication(
                        "Réponse Facebook vide."
                );
            }

            if (resultat.has("error")) {

                JsonNode erreur = resultat.get("error");

                String message = erreur.hasNonNull("message")
                        ? erreur.get("message").asText()
                        : "Erreur inconnue de Facebook.";

                throw new EchecPublication(
                        "Erreur Facebook : " + message
                );
            }

            return resultat;

        } catch (EchecPublication e) {

            throw e;

        } catch (Exception e) {

            logger.error(
                    "Réponse Facebook impossible à analyser : {}",
                    reponse
            );

            throw new EchecPublication(
                    "Réponse Facebook invalide : impossible de lire le JSON."
            );
        }
    }

    // =====================================================
    // URL GRAPH API
    // =====================================================

    private String urlGraph(String chemin) {

        return "https://graph.facebook.com/"
                + graphApiVersion
                + "/"
                + pageId
                + chemin;
    }

    // =====================================================
    // OUTILS
    // =====================================================

    private static String extension(String type) {

        return switch (type) {
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }

    private static boolean isBlank(String valeur) {

        return valeur == null || valeur.isBlank();
    }
}
