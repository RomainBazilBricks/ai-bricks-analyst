// =========================================================================
// SCRIPT D'EXTRACTION DES CREDENTIALS MANUS.AI
// =========================================================================
// 
// INSTRUCTIONS D'UTILISATION :
// 1. Connectez-vous sur https://www.manus.ai
// 2. Ouvrez la console développeur (F12 → onglet Console)
// 3. Copiez et collez ce script complet
// 4. Appuyez sur Entrée pour exécuter
// 5. Les données seront automatiquement copiées dans votre presse-papier
// 6. Utilisez ces données dans votre interface AI Credentials
//
// ⚠️  SÉCURITÉ : Ces données sont sensibles, ne les partagez jamais !
// =========================================================================

console.log("🔍 EXTRACTION DES CREDENTIALS MANUS.AI");
console.log("=".repeat(50));

// Fonction utilitaire pour formater JSON
function formatJSON(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return obj;
    }
}

// 1. Extraction des cookies
console.log("\n🍪 COOKIES:");
const cookies = {};
document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
        cookies[name] = value;
    }
});
console.log(formatJSON(cookies));

// 2. Extraction du localStorage
console.log("\n💾 LOCAL STORAGE:");
const localStorage_data = {};
Object.keys(localStorage).forEach(key => {
    localStorage_data[key] = localStorage.getItem(key);
});
console.log(formatJSON(localStorage_data));

// 3. Extraction du sessionStorage
console.log("\n🔄 SESSION STORAGE:");
const sessionStorage_data = {};
Object.keys(sessionStorage).forEach(key => {
    sessionStorage_data[key] = sessionStorage.getItem(key);
});
console.log(formatJSON(sessionStorage_data));

// 4. Informations utilisateur (si disponible)
console.log("\n👤 USER INFO:");
let userInfo = null;
try {
    if (localStorage_data['UserService.userInfo']) {
        userInfo = JSON.parse(localStorage_data['UserService.userInfo']);
        console.log("User ID:", userInfo.userId);
        console.log("Email:", userInfo.email);
        console.log("Display Name:", userInfo.displayname);
    }
} catch (e) {
    console.log("Impossible de parser UserService.userInfo");
}

// 5. Token de session principal
console.log("\n🔑 TOKENS PRINCIPAUX:");
console.log("Session ID:", cookies.session_id || "Non trouvé");

// 6. Headers actuels de la page
console.log("\n📋 HEADERS INFO:");
console.log("User Agent:", navigator.userAgent);
console.log("URL actuelle:", window.location.href);
console.log("Domaine:", window.location.hostname);

// 7. Format JSON complet pour l'API
console.log("\n🎯 FORMAT JSON POUR API:");
const credentialData = {
    platform: "manus",
    userIdentifier: userInfo?.email || "unknown",
    credentialName: "default",
    sessionData: {
        session_token: cookies.session_id,
        user_id: userInfo?.userId,
        cookies: cookies,
        local_storage: localStorage_data,
        session_storage: sessionStorage_data,
        user_info: userInfo,
        user_agent: navigator.userAgent,
        extracted_at: new Date().toISOString()
    },
    expiresAt: null, // À définir selon la durée de vie de la session
    notes: "Extracted from browser console on " + new Date().toLocaleDateString('fr-FR')
};

console.log(formatJSON(credentialData));

// 8. Instructions de copie
console.log("\n📋 INSTRUCTIONS:");
console.log("1. Copiez le JSON 'sessionData' ci-dessus");
console.log("2. Utilisez-le dans votre API de credentials");
console.log("3. La session devrait être valide ~30 jours");

// 9. Retourner les données pour manipulation programmatique
window.manusCredentials = credentialData;
console.log("\n✅ Données sauvegardées dans window.manusCredentials");
console.log("Vous pouvez y accéder avec: copy(window.manusCredentials.sessionData)");

// 10. Copier automatiquement dans le presse-papier (si supporté)
if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(credentialData.sessionData, null, 2))
        .then(() => {
            console.log("📋 SessionData copiées automatiquement dans le presse-papier!");
            console.log("🎉 SUCCÈS ! Vous pouvez maintenant coller les données dans votre interface.");
        })
        .catch(() => {
            console.log("❌ Impossible de copier automatiquement");
            console.log("📋 Copiez manuellement le JSON sessionData ci-dessus");
        });
} else {
    console.log("📋 Copiez manuellement le JSON sessionData ci-dessus");
}

// 11. Message de fin
console.log("\n" + "=".repeat(50));
console.log("✅ EXTRACTION TERMINÉE");
console.log("📋 Données prêtes à être utilisées dans votre API Credentials");
console.log("⏰ Session valide pendant ~30 jours");
console.log("🔒 Gardez ces informations confidentielles");
console.log("=".repeat(50)); 