#include "MicroBit.h"
#include <string.h> 
extern "C" {
#include "aes.h"
}

MicroBit uBit;
uint8_t cleAES[16] = { 'V','i','n','c','e','n','t','L','e','P','l','u','B','o','1','2' };

// Base de clés
uint8_t keysHMAC[3][16] = {
    { 'K','e','y','1','0','_','S','e','c','r','e','t','!','!','!','!' }, 
    { 'K','e','y','2','0','_','S','e','c','r','e','t','@','@','@','@' }, 
    { 'K','e','y','3','0','_','S','e','c','r','e','t','#','#','#','#' }  
};

PacketBuffer bufferRadioRecu(0);
bool dataReady = false; 

// --- OUTILS (MODIFIÉ POUR STRING) ---
uint8_t* getClePourID(ManagedString id) {
    // Comparaison de chaînes de caractères
    if (id == "AA100AA") return keysHMAC[0];
    if (id == "BB200BB") return keysHMAC[1];
    if (id == "CC300CC") return keysHMAC[2];
    return NULL;
}

uint32_t calculerAuth(const char* data, int len, uint8_t* cle) {
    uint32_t hash = 0x12345678;
    for (int i = 0; i < 16; i++) { hash ^= cle[i]; hash = (hash << 5) | (hash >> 27); }
    for (int i = 0; i < len; i++) { hash ^= (uint8_t)data[i]; hash *= 0x5bd1e995; hash ^= (hash >> 15); }
    return hash;
}

PacketBuffer chiffrerReponse(ManagedString message, uint8_t* cleSpecifique) {
    uint8_t buffer[64]; memset(buffer, 0, 64);
    int len = message.length(); if (len > 56) len = 56;
    memcpy(buffer + 4, message.toCharArray(), len);
    uint32_t auth = calculerAuth((const char*)(buffer + 4), 56, cleSpecifique);
    memcpy(buffer, &auth, 4);
    AES_ctx ctx; AES_init_ctx(&ctx, cleAES);
    for (int i = 0; i < 4; i++) AES_ECB_encrypt(&ctx, buffer + (i * 16));
    return PacketBuffer(buffer, 64);
}

// Fonction utilitaire pour extraire une valeur proprement
ManagedString extractValue(ManagedString source, const char* tag) {
    const char* s = source.toCharArray();
    char* ptrStart = strstr((char*)s, tag);
    if (!ptrStart) return "0";
    ptrStart += strlen(tag);
    char* ptrEnd = strstr(ptrStart, ";");
    if (!ptrEnd) return "0";
    return source.substring((ptrStart - s), ptrEnd - ptrStart);
}

// --- DECHIFFREMENT (MODIFIÉ) ---
// Note : idDetecte devient un ManagedString* pour renvoyer du texte
ManagedString dechiffrerIntelligent(PacketBuffer data, bool* authValide, ManagedString* idDetecte) {
    *authValide = false;
    
    if (data.length() < 80) return ManagedString("");
    
    uint8_t buffer[80]; memcpy(buffer, data.getBytes(), 80);
    
    AES_ctx ctx; AES_init_ctx(&ctx, cleAES);
    for (int i = 0; i < 5; i++) AES_ECB_decrypt(&ctx, buffer + (i * 16));

    char* texteDebut = (char*)(buffer + 4);
    
    // --- Extraction ID (VERSION TEXTE) ---
    char* ptrID = strstr(texteDebut, "ID:");
    if (!ptrID) return ManagedString("");
    
    char* ptrFinID = strstr(ptrID, ";");
    if (!ptrFinID) return ManagedString("");
    
    ptrID += 3; // On saute "ID:"
    
    // On calcule la longueur de l'ID (ex: "AA100AA" = 7 caractères)
    int lenID = ptrFinID - ptrID;
    
    // On crée une ManagedString à partir de ces pointeurs
    *idDetecte = ManagedString(ptrID, lenID);

    // On récupère la clé grâce à la chaîne de caractères
    uint8_t* cleSpecifique = getClePourID(*idDetecte);
    
    if (!cleSpecifique) return ManagedString("ERR_UNKNOWN_ID");

    // --- Vérification Auth ---
    uint32_t authRecu; memcpy(&authRecu, buffer, 4);
    uint32_t authCalc = calculerAuth(texteDebut, 76, cleSpecifique);

    if (authRecu != authCalc) return ManagedString("ERR_BAD_SIGNATURE");

    *authValide = true;
    int realLen = 76; while (realLen > 0 && buffer[4 + realLen - 1] == 0) realLen--;
    return ManagedString(texteDebut, realLen);
}

void traiterDonnees() {
    PacketBuffer raw = bufferRadioRecu;
    dataReady = false;
    
    bool authValide = false;
    ManagedString idRecu = ""; // C'est maintenant une String
    
    ManagedString msg = dechiffrerIntelligent(raw, &authValide, &idRecu);
    
    if (authValide) {
        uBit.display.image.setPixelValue(2, 2, 255); 
        
        ManagedString sGeo = extractValue(msg, "Geo:");
        ManagedString sEau = extractValue(msg, "Eau:");
        ManagedString sBtn = extractValue(msg, "Btn:");
        ManagedString sSeq = extractValue(msg, "Seq:");
        ManagedString sTime = extractValue(msg, "Time:");
        
        int virguleIndex = -1;
        const char* sGeoChar = sGeo.toCharArray();
        for(int i=0; i<sGeo.length(); i++) { if(sGeoChar[i] == ',') virguleIndex = i; }
        
        ManagedString sLat = "0";
        ManagedString sLon = "0";
        if (virguleIndex > 0) {
            sLat = sGeo.substring(0, virguleIndex);
            sLon = sGeo.substring(virguleIndex + 1, sGeo.length() - virguleIndex - 1);
        }

        // --- SORTIE USB (idRecu est déjà une string, on enlève le ManagedString(...) inutile) ---
        // Attention aux guillemets pour l'ID dans le JSON si c'est une string !
        uBit.serial.send("EXP:{\"plaqueImmat\":\"" + idRecu + "\"" + 
                         ",\"lat\":" + sLat + 
                         ",\"lon\":" + sLon +
                         ",\"timestamp\":" + sTime + 
                         ",\"ressources\":{\"eau\":" + sEau + "}" +
                         ",\"btn\":" + sBtn + "}\r\n");
        
        // ACK
        ManagedString ack = "ACK:" + idRecu + ";" + sSeq;
        uBit.sleep(20);
        uBit.radio.datagram.send(chiffrerReponse(ack, getClePourID(idRecu)));
        
    } else {
        uBit.display.image.setPixelValue(0, 0, 255); 
        uBit.serial.send("LOG: Rejet securite\r\n");
    }
    
    uBit.sleep(50);
    uBit.display.image.clear();
}

void receive_from_microbit(MicroBitEvent) {
    PacketBuffer temp = uBit.radio.datagram.recv();
    if (temp.length() > 0) { bufferRadioRecu = temp; dataReady = true; }
}

int main() {
    uBit.init();
    uBit.display.print("Q");
    uBit.serial.baud(115200);
    uBit.radio.enable(); uBit.radio.setGroup(16);
    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, receive_from_microbit);
    
    while(1) {
        if (dataReady) traiterDonnees();
        uBit.sleep(10);
    }
}