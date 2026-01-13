// package org.example;

// import java.net.URI;
// import java.net.http.HttpClient;
// import java.net.http.HttpRequest;
// import java.net.http.HttpResponse;
// import java.util.HashMap;
// import java.util.Map;
// import com.fasterxml.jackson.databind.ObjectMapper;

// public class Test {

//     private static final String API_URL = "http://localhost:8082/api/interventions/cloture";

//     // Cette méthode main te permet de lancer le test d'un simple clic droit -> Run
//     public static void main(String[] args) {
//         Test instanceDeTest = new Test();
//         AuthService auth = new AuthService();
        
//         System.out.println("🚀 Démarrage du test de clôture...");
        
//         // 1. Récupération automatique du token
//         String token = auth.getAccessToken();
        
//         if (token != null) {
//             // 2. Appel de la méthode de clôture (on passe null pour v car on utilise des ID fixes)
//             instanceDeTest.cloturerIntervention(null, token);
//         } else {
//             System.err.println("❌ Impossible de tester : Échec de l'authentification Keycloak.");
//         }
//     }

//     /**
//      * Méthode pour clôturer l'intervention avec des valeurs fixes
//      */
//     public void cloturerIntervention(CalllAPIVehicule.VehiculeData v, String token) {
//         try {
//             // --- VALEURS EN DUR À TESTER ---
//             String idVehiculeFixe = "592d7ede-6ed0-4e00-98c5-4dd1a87f510b";
//             String idEvenementFixe = "e882ada6-4400-42ea-b61f-ba5801247fb2";
//             // -------------------------------------

//             ObjectMapper mapper = new ObjectMapper();
            
//             // 1. Préparer le JSON
//             Map<String, String> data = new HashMap<>();
//             data.put("idVehicule", idVehiculeFixe);
//             data.put("idEvenement", idEvenementFixe);

//             String jsonBody = mapper.writeValueAsString(data);

//             // 2. Préparer la requête
//             HttpClient client = HttpClient.newHttpClient();
//             HttpRequest request = HttpRequest.newBuilder()
//                     .uri(URI.create(API_URL))
//                     .header("Content-Type", "application/json")
//                     .header("Authorization", "Bearer " + token)
//                     .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
//                     .build();

//             System.out.println("📡 Envoi POST vers : " + API_URL);
//             System.out.println("📦 Body : " + jsonBody);
            
//             // 3. Envoyer
//             HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

//             // 4. Analyser la réponse
//             if (response.statusCode() == 200 || response.statusCode() == 204) {
//                 System.out.println("✅ SUCCÈS : L'intervention a été clôturée sur le serveur.");
                
//                 // Note : On ne peut pas appeler caserneService.afficherCaserneVehicule(v) 
//                 // ici si v est null (ce qui est le cas dans ce test main).
//                 if (v != null) {
//                     CallAPICaserne caserneService = new CallAPICaserne();
//                     caserneService.afficherCaserneVehicule(v, token);
//                 } else {
//                     System.out.println("ℹ️ Test terminé (Appel Caserne sauté car lancé sans objet véhicule).");
//                 }

//             } else {
//                 System.err.println("❌ ÉCHEC : Code " + response.statusCode());
//                 System.err.println("💬 Réponse du serveur : " + response.body());
//             }

//         } catch (Exception e) {
//             System.err.println("❌ Erreur critique : " + e.getMessage());
//             e.printStackTrace();
//         }
//     }
// }