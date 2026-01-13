#include "MicroBit.h"
#include <string.h> 
#include <vector> 
extern "C" {
#include "aes.h"
}

MicroBit uBit;

// 1. CLE AES (Doit être identique à celle dans la micro:bit Terrain)
uint8_t cleAES[16] = { 'V','E','8','c','e','n','t','L','e','P','0','u','B','o','1','2' };

// 2. Gestion dynamique des cles HMAC
// Structure pour stocker une paire ID <-> Clé
struct KeyEntry {
    ManagedString id;
    uint8_t key[16];
    bool valid;
};

// Stockage RAM (50 camions)
KeyEntry keyStore[50]; 

// Initialisation du stockage
void initKeyStore() {
    for(int i=0; i<50; i++) keyStore[i].valid = false;
}

// Ajouter ou mettre à jour une clé
void updateKey(ManagedString id, ManagedString keyStr) {
    // 1. Chercher si l'ID existe déjà pour le mettre à jour
    for(int i=0; i<50; i++) {
        if (keyStore[i].valid && keyStore[i].id == id) {
            memset(keyStore[i].key, 0, 16);
            int len = keyStr.length(); if (len > 16) len = 16;
            memcpy(keyStore[i].key, keyStr.toCharArray(), len);
            uBit.serial.send("LOG: Key Updated for " + id + "\r\n");
            return;
        }
    }
    
    // 2. Sinon, trouver un slot vide
    for(int i=0; i<50; i++) {
        if (!keyStore[i].valid) {
            keyStore[i].id = id;
            memset(keyStore[i].key, 0, 16);
            int len = keyStr.length(); if (len > 16) len = 16;
            memcpy(keyStore[i].key, keyStr.toCharArray(), len);
            keyStore[i].valid = true;
            uBit.serial.send("LOG: New Key Added for " + id + "\r\n");
            return;
        }
    }
    uBit.serial.send("LOG: KeyStore Full!\r\n");
}

// Récupérer la clé pour un ID donné
uint8_t* getClePourID(ManagedString id) {
    for(int i=0; i<50; i++) {
        if (keyStore[i].valid && keyStore[i].id == id) {
            return keyStore[i].key;
        }
    }
    return NULL; // Si Clé introuvable
}

PacketBuffer bufferRadioRecu(0); // Buffers de transmission radio
bool dataReady = false; 

uint32_t calculerAuth(const char* data, int len, uint8_t* cle) {
    uint32_t hash = 0x12345678;
    for (int i = 0; i < 16; i++) { hash ^= cle[i]; hash = (hash << 5) | (hash >> 27); }
    for (int i = 0; i < len; i++) { hash ^= (uint8_t)data[i]; hash *= 0x5bd1e995; hash ^= (hash >> 15); }
    return hash;
}

ManagedString extractValue(ManagedString source, const char* tag) {
    const char* s = source.toCharArray();
    char* ptrStart = strstr((char*)s, tag);
    if (!ptrStart) return "";
    ptrStart += strlen(tag);
    char* ptrEnd = strstr(ptrStart, ":"); // Le séparateur dans CFG est ':'
    if (!ptrEnd) ptrEnd = strstr(ptrStart, ";"); // Fallback
    if (!ptrEnd) return source.substring(ptrStart - s, source.length());
    return source.substring((ptrStart - s), ptrEnd - ptrStart);
}

// Crypto (Adapté pour chercher la clé dynamique)
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

ManagedString dechiffrerIntelligent(PacketBuffer data, bool* authValide, ManagedString* idDetecte) {
    *authValide = false;
    if (data.length() < 96) return ManagedString("");
    
    uint8_t buffer[96]; memcpy(buffer, data.getBytes(), 96);
    AES_ctx ctx; AES_init_ctx(&ctx, cleAES);
    for (int i = 0; i < 6; i++) AES_ECB_decrypt(&ctx, buffer + (i * 16));

    char* texteDebut = (char*)(buffer + 4);
    
    // Extraction ID
    char* ptrID = strstr(texteDebut, "ID:");
    if (!ptrID) return ManagedString("");
    char* ptrFinID = strstr(ptrID, ";");
    if (!ptrFinID) return ManagedString("");
    ptrID += 3;
    int lenID = ptrFinID - ptrID;
    *idDetecte = ManagedString(ptrID, lenID);

    // Recherche dynamique de la clé
    uint8_t* cleSpecifique = getClePourID(*idDetecte);
    
    if (!cleSpecifique) return ManagedString("ERR_UNKNOWN_ID");

    uint32_t authRecu; memcpy(&authRecu, buffer, 4);
    uint32_t authCalc = calculerAuth(texteDebut, 92, cleSpecifique);

    if (authRecu != authCalc) return ManagedString("ERR_BAD_SIGNATURE");

    *authValide = true;
    int realLen = 92; while (realLen > 0 && buffer[4 + realLen - 1] == 0) realLen--;
    return ManagedString(texteDebut, realLen);
}

ManagedString extractJSONValue(ManagedString source, const char* tag) {
     // Extraire depuis le message déchiffré (séparateur ;)
    const char* s = source.toCharArray();
    char* ptrStart = strstr((char*)s, tag);
    if (!ptrStart) return "0";
    ptrStart += strlen(tag);
    char* ptrEnd = strstr(ptrStart, ";");
    if (!ptrEnd) return "0";
    return source.substring((ptrStart - s), ptrEnd - ptrStart);
}

void traiterDonnees() {
    PacketBuffer raw = bufferRadioRecu;
    dataReady = false;
    bool authValide = false;
    ManagedString idRecu = "";
    
    ManagedString msg = dechiffrerIntelligent(raw, &authValide, &idRecu);
    
    if (authValide) {
        uBit.display.image.setPixelValue(2, 2, 255); 
        
        ManagedString sGeo = extractJSONValue(msg, "Geo:");
        ManagedString sRes = extractJSONValue(msg, "Res:");
        ManagedString sBtn = extractJSONValue(msg, "Btn:");
        ManagedString sSeq = extractJSONValue(msg, "Seq:");
        ManagedString sTime = extractJSONValue(msg, "Time:");
        
        // Séparation Lat/Lon
        int virguleIndex = -1;
        const char* sGeoChar = sGeo.toCharArray();
        for(int i=0; i<sGeo.length(); i++) { if(sGeoChar[i] == ',') virguleIndex = i; }
        ManagedString sLat = "0"; ManagedString sLon = "0";
        if (virguleIndex > 0) {
            sLat = sGeo.substring(0, virguleIndex);
            sLon = sGeo.substring(virguleIndex + 1, sGeo.length() - virguleIndex - 1);
        }

        uBit.serial.send("EXP:{\"plaqueImmat\":\"" + idRecu + "\"" + 
                         ",\"lat\":" + sLat + ",\"lon\":" + sLon +
                         ",\"timestamp\":" + sTime + 
                         ",\"raw_res\":\"" + sRes + "\"" +
                         ",\"btn\":" + sBtn + "}\r\n");
        
        // ACK transmission radio avec micro:bit Terrain
        ManagedString ack = "ACK:" + idRecu + ";" + sSeq;
        uBit.sleep(20);
        uint8_t* key = getClePourID(idRecu);
        if(key) uBit.radio.datagram.send(chiffrerReponse(ack, key));
        
    } else {
        uBit.display.image.setPixelValue(0, 0, 255); 
    }
    uBit.sleep(50);
    uBit.display.image.clear();
}

void receive_from_microbit(MicroBitEvent) {
    PacketBuffer temp = uBit.radio.datagram.recv();
    if (temp.length() > 0) { bufferRadioRecu = temp; dataReady = true; }
}

// Gestion commandes serie (CFG)
void gererCommandesSerie() {
    ManagedString s = uBit.serial.readUntil('\n');
    
    // Format attendu : CFG:AA100AA:KeySecret1234567
    if (s.length() > 5 && s.substring(0, 4) == "CFG:") {
        // Parsing manuel car ManagedString est limité
        const char* str = s.toCharArray();
        
        // Trouver le premier :
        char* ptrFirst = strstr((char*)str, ":");
        if(!ptrFirst) return;
        
        // Trouver le deuxième : (Entre ID et Key)
        char* ptrSecond = strstr(ptrFirst + 1, ":");
        if(!ptrSecond) return;
        
        // Extraire ID
        int lenID = ptrSecond - (ptrFirst + 1);
        ManagedString newID(ptrFirst + 1, lenID);
        
        // Extraire Key (Jusqu'à la fin ou \r)
        ManagedString newKey(ptrSecond + 1);
        
        updateKey(newID, newKey);
    }
}

int main() {
    uBit.init();
    uBit.display.print("Q");
    uBit.serial.baud(115200);
    uBit.serial.setRxBufferSize(254); // Augmenter le buffer de réception série
    
    initKeyStore(); // Vide la mémoire au démarrage
    
    uBit.radio.enable(); uBit.radio.setGroup(16);
    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, receive_from_microbit);
    
    while(1) {
        // 1. Priorité aux données radio
        if (dataReady) traiterDonnees();
        
        // 2. Écoute de la configuration (USB)
        if (uBit.serial.isReadable()) {
            gererCommandesSerie();
        }
        
        uBit.sleep(10);
    }
}