package com.example.backend.service;

import com.example.backend.entity.AppelOffre;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class FacebookService {

    private static final Logger logger =
            LoggerFactory.getLogger(FacebookService.class);

    /** Résultat d'une tentative de publication (jamais d'exception vers l'appelant). */
    public record Resultat(boolean succes, String message, String idPost) {
        static Resultat ok(String idPost) {
            return new Resultat(true, "Publication Facebook effectuée avec succès.", idPost);
        }
        static Resultat echec(String message) {
            return new Resultat(false, message, null);
        }
    }

    private final RestClient restClient;

    @Value("${facebook.page-id:}")
    private String pageId;

    @Value("${facebook.page-access-token:}")
    private String pageAccessToken;

    @Value("${facebook.graph-api-version:v26.0}")
    private String graphApiVersion;

    @Value("${app.frontend.public-url:}")
    private String frontendPublicUrl;

    public FacebookService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    public Resultat publierAppelOffre(AppelOffre appel) {

        if (appel == null || appel.getIdAppelOffre() == null) {
            return Resultat.echec("Appel d'offres invalide.");
        }

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {
            return Resultat.echec("L'appel d'offres doit d'abord être publié dans SPAT.");
        }

        if (isBlank(pageId) || isBlank(pageAccessToken)) {
            logger.error("Configuration Facebook incomplète : page-id ou token manquant.");
            return Resultat.echec(
                    "Configuration Facebook incomplète (identifiant de page ou token manquant).");
        }

        if (isBlank(frontendPublicUrl)
                || !frontendPublicUrl.trim().matches("^https?://\\S+$")) {
            logger.error("app.frontend.public-url invalide : '{}'", frontendPublicUrl);
            return Resultat.echec(
                    "URL publique du site invalide (app.frontend.public-url).");
        }

        try {
            String baseUrl = frontendPublicUrl.trim().replaceAll("/+$", "");
            String lienDepot = baseUrl + "/soumissionner/" + appel.getIdAppelOffre();

            String dateLimite = "Non précisée";
            if (appel.getDateLimiteDepot() != null) {
                dateLimite = appel.getDateLimiteDepot()
                        .format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm"));
            }

            StringBuilder message = new StringBuilder();
            message.append("📢 APPEL D'OFFRES - SPAT\n\n");
            message.append("Référence : ").append(appel.getReference()).append("\n\n");
            message.append("Objet : ").append(appel.getObjet()).append("\n\n");

            if (!isBlank(appel.getDescription())) {
                message.append("Description : ").append(appel.getDescription()).append("\n\n");
            }

            if (!isBlank(appel.getLieuExecution())) {
                message.append("Lieu d'exécution : ").append(appel.getLieuExecution()).append("\n\n");
            }

            message.append("Date limite de dépôt : ").append(dateLimite).append("\n\n");
            message.append("Les candidats intéressés peuvent consulter les conditions ")
                    .append("et déposer leur dossier en ligne.\n\n");
            message.append("👉 Déposer votre offre : ").append(lienDepot);

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("message", message.toString());
            form.add("link", lienDepot);
            form.add("access_token", pageAccessToken);

            String url = "https://graph.facebook.com/" + graphApiVersion
                    + "/" + pageId + "/feed";

            Map<?, ?> resultat = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

            if (resultat != null && resultat.containsKey("id")) {
                String id = String.valueOf(resultat.get("id"));
                logger.info("Publication Facebook réussie pour {} (id={})",
                        appel.getReference(), id);
                return Resultat.ok(id);
            }

            return Resultat.echec("Facebook n'a pas retourné l'identifiant de la publication.");

        } catch (RestClientResponseException e) {
            // Le corps contient le détail Facebook (token expiré, permission manquante...)
            logger.error("Erreur Facebook API : statut {}, réponse : {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            return Resultat.echec(
                    "Facebook a refusé la publication (" + e.getStatusCode().value()
                            + "). Vérifiez le token et la permission pages_manage_posts.");

        } catch (Exception e) {
            logger.error("Erreur pendant la publication Facebook", e);
            return Resultat.echec("Impossible de joindre Facebook : " + e.getMessage());
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
