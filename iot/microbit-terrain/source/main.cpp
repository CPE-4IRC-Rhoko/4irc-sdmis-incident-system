#include "MicroBit.h"
#include <string.h> 
extern "C" {
#include "aes.h"
}

MicroBit uBit;

// --- CONFIGURATION DES CLES ---
uint8_t cleAES[16] = { 'V','E','8','c','e','n','t','L','e','P','0','u','B','o','1','2' };
uint8_t keysHMAC[7][16] = {
    { 'K','e','y','1','0','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA100AA (Index 0)
    { 'K','e','y','1','1','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA101AA (Index 1)
    { 'K','e','y','1','2','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA102AA (Index 2)
    { 'K','e','y','1','3','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA103AA (Index 3)
    { 'K','e','y','1','4','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA104AA (Index 4)
    { 'K','e','y','1','5','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA105AA (Index 5)
    { 'K','e','y','1','5','_','S','e','c','r','e','t','!','!','!','!' }  // Pour AA106AA (Index 6)
};

// --- STRUCTURE DE DONNÉES ---
struct EtatCamion {
    bool actif;         
    ManagedString id;   // <--- STOCKAGE DE L'ID EN TEXTE (ex: "AA100AA")
    ManagedString geo;  
    ManagedString res;  
    ManagedString time;  
    int sequence;       
    bool btnAppuye;     
};

// Notre flotte en mémoire (7 slots)
EtatCamion flotte[7];

// Buffers Radio
PacketBuffer bufferAckRecu(0);
bool unAckEstArrive = false;
bool ackReceived = false;

// --- INTERRUPTIONS BOUTONS ---
void onButtonA(MicroBitEvent) { 
    if (flotte[0].actif) {
        flotte[0].btnAppuye = true; 
        uBit.display.image.setPixelValue(0, 0, 255);
    }
}
void onButtonB(MicroBitEvent) { 
    if (flotte[1].actif) {
        flotte[1].btnAppuye = true; 
        uBit.display.image.setPixelValue(4, 0, 255);
    }
}

// --- OUTILS PARSING & CRYPTO ---
ManagedString extractValue(ManagedString source, const char* tag) {
    const char* s = source.toCharArray();
    char* ptrStart = strstr((char*)s, tag);
    if (!ptrStart) return "";
    ptrStart += strlen(tag);
    char* ptrEnd = strstr(ptrStart, ";");
    if (!ptrEnd) return "";
    return source.substring((ptrStart - s), ptrEnd - ptrStart);
}

// Conversion ID Texte -> Index Tableau (Mapping des clés)
int getIndexFromID(ManagedString id) {
    if (id == "AA100AA") return 0;
    if (id == "AA101AA") return 1;
    if (id == "AA102AA") return 2;
    if (id == "AA103AA") return 3;
    if (id == "AA104AA") return 4;
    if (id == "AA105AA") return 5;
    if (id == "AA106AA") return 6;
    return -1;
}

uint32_t calculerAuth(const char* data, int len, uint8_t* cle) {
    uint32_t hash = 0x12345678;
    for (int i = 0; i < 16; i++) { hash ^= cle[i]; hash = (hash << 5) | (hash >> 27); }
    for (int i = 0; i < len; i++) { hash ^= (uint8_t)data[i]; hash *= 0x5bd1e995; hash ^= (hash >> 15); }
    return hash;
}

PacketBuffer chiffrerSecurise(ManagedString message, int keyIdx) {
    // 96 OCTETS
    uint8_t buffer[96]; memset(buffer, 0, 96);
    int len = message.length(); 
    if (len > 92) len = 92; 
    memcpy(buffer + 4, message.toCharArray(), len);
    
    uint32_t auth = calculerAuth((const char*)(buffer + 4), 92, keysHMAC[keyIdx]);
    memcpy(buffer, &auth, 4);
    
    AES_ctx ctx; AES_init_ctx(&ctx, cleAES);
    for (int i = 0; i < 6; i++) AES_ECB_encrypt(&ctx, buffer + (i * 16));
    return PacketBuffer(buffer, 96);
}

ManagedString dechiffrerSecurise(PacketBuffer data, int keyIdx, bool* valide) {
    *valide = false;
    // On peut recevoir des ACK chiffrés en 64 octets (suffisant pour un ACK court)
    if (data.length() < 64) return ManagedString("");
    
    uint8_t buffer[64]; memcpy(buffer, data.getBytes(), 64);
    AES_ctx ctx; AES_init_ctx(&ctx, cleAES);
    for (int i = 0; i < 4; i++) AES_ECB_decrypt(&ctx, buffer + (i * 16));
    
    uint32_t authRecu; memcpy(&authRecu, buffer, 4);
    uint32_t authCalc = calculerAuth((const char*)(buffer + 4), 56, keysHMAC[keyIdx]);
    
    if (authRecu != authCalc) return ManagedString("");
    *valide = true;
    int realLen = 56; while (realLen > 0 && buffer[4 + realLen - 1] == 0) realLen--;
    return ManagedString((const char*)(buffer + 4), realLen);
}

void onData(MicroBitEvent) {
    PacketBuffer tmp = uBit.radio.datagram.recv();
    if (tmp.length() > 0) { bufferAckRecu = tmp; unAckEstArrive = true; }
}

// --- MISE A JOUR DE LA MÉMOIRE (Depuis le Java) ---
void mettreAJourEtat(ManagedString ligneJava) {
    ManagedString sId = extractValue(ligneJava, "ID:");

    int idx = getIndexFromID(sId);
    
    if (idx != -1) {
        flotte[idx].id = sId; // On stocke l'ID texte
        flotte[idx].geo = extractValue(ligneJava, "Geo:");
        flotte[idx].res = extractValue(ligneJava, "Res:");
        flotte[idx].time = extractValue(ligneJava, "Time:");
        flotte[idx].actif = true; 
        
        // Feedback visuel court
        uBit.display.image.setPixelValue(2, 2, 255);
        uBit.sleep(10);
        uBit.display.image.setPixelValue(2, 2, 0);
    }
}

// --- ENVOI RADIO (Depuis la mémoire) ---
void envoyerCamionRadio(int index) {
    if (!flotte[index].actif) return; 

    // On utilise l'ID stocké en mémoire (ex: "AA100AA")
    ManagedString idString = flotte[index].id;
    
    ManagedString payload = "ID:" + idString + 
                            ";Geo:" + flotte[index].geo + 
                            ";Res:" + flotte[index].res + 
                            ";Btn:" + ManagedString(flotte[index].btnAppuye ? 1 : 0) + 
                            ";Seq:" + ManagedString(flotte[index].sequence) +
                            ";Time:" + flotte[index].time + ";";

    // Logs Série
    uBit.serial.send("\r\n--------------------------------\r\n");
    uBit.serial.send("Envoi Radio ID:" + idString + " Time:" + flotte[index].time + "\r\n");
    uBit.serial.send("Contenu: " + payload + "\r\n");

    ackReceived = false;
    int tentatives = 0;
    PacketBuffer paquet = chiffrerSecurise(payload, index); 

    uBit.display.print(index + 1); 

    while (!ackReceived && tentatives < 3) {
        tentatives++;
        unAckEstArrive = false;
        
        uBit.radio.datagram.send(paquet);
        uBit.serial.send("."); 
        
        uBit.sleep(100 + uBit.random(50));
        
        uint32_t start = uBit.systemTime();
        while(uBit.systemTime() - start < 400) {
            // Lecture Série continue
            if (uBit.serial.isReadable()) {
                ManagedString s = uBit.serial.readUntil('\n');
                if (s.length() > 5) mettreAJourEtat(s);
            }

            // Vérification ACK
            if (unAckEstArrive) {
                bool authValide = false;
                ManagedString msg = dechiffrerSecurise(bufferAckRecu, index, &authValide);
                
                if (authValide && msg.substring(0, 4) == "ACK:") {
                    ManagedString idCheck = idString; // On compare avec l'ID texte
                    ManagedString seqCheck = ManagedString(flotte[index].sequence);
                    
                    if (strstr(msg.toCharArray(), idCheck.toCharArray()) && 
                        strstr(msg.toCharArray(), (";" + seqCheck).toCharArray())) {
                        ackReceived = true;
                        break;
                    }
                }
                unAckEstArrive = false;
            }
            uBit.sleep(10);
        }
    }
    
    if (ackReceived) {
        uBit.serial.send(" -> ACK OK\r\n");
        flotte[index].sequence++;
        if (flotte[index].sequence > 999) flotte[index].sequence = 0;
        
        if (flotte[index].btnAppuye) {
            flotte[index].btnAppuye = false;
            if (index == 0) uBit.display.image.setPixelValue(0, 0, 0);
            if (index == 1) uBit.display.image.setPixelValue(4, 0, 0);
        }
        uBit.display.image.setPixelValue(4, 4, 255); uBit.sleep(50); uBit.display.image.setPixelValue(4, 4, 0);
    } else {
        uBit.serial.send(" -> TIMEOUT\r\n");
        uBit.display.image.setPixelValue(0, 4, 255); uBit.sleep(50); uBit.display.image.setPixelValue(0, 4, 0);
    }
    uBit.display.clear();
}

int main() {
    uBit.init();
    uBit.serial.baud(115200);
    uBit.serial.setRxBufferSize(254);
    
    uBit.radio.enable(); uBit.radio.setGroup(16); uBit.radio.setTransmitPower(7);
    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, onData);
    uBit.messageBus.listen(MICROBIT_ID_BUTTON_A, MICROBIT_BUTTON_EVT_CLICK, onButtonA);
    uBit.messageBus.listen(MICROBIT_ID_BUTTON_B, MICROBIT_BUTTON_EVT_CLICK, onButtonB);

    // Initialisation
    for(int i=0; i<7; i++) {
        flotte[i].actif = false; 
        flotte[i].sequence = 0;
        flotte[i].btnAppuye = false;
        flotte[i].id = ""; // Init vide
    }
    
    uBit.display.print("R"); 
    uBit.serial.send("MODEM PRET (Support String IDs)\r\n");

    int camionEnCours = 0;

    while (true) {
        // 1. Lire le Java
        while (uBit.serial.isReadable()) {
            ManagedString s = uBit.serial.readUntil('\n');
            if (s.length() > 5) mettreAJourEtat(s);
        }

        // 2. Envoyer
        envoyerCamionRadio(camionEnCours);

        // 3. Suivant
        camionEnCours++;
        if (camionEnCours > 6) camionEnCours = 0;

        // 4. Pause eco
        if (!flotte[0].actif && !flotte[1].actif && !flotte[2].actif && !flotte[3].actif && !flotte[4].actif && !flotte[5].actif && !flotte[6].actif) {
            uBit.sleep(100);
        } else {
            uBit.sleep(200); 
        }
    }
}