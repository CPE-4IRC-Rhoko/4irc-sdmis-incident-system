#include "MicroBit.h"
#include <string.h> 
extern "C" {
#include "aes.h"
}

MicroBit uBit;

// Configuration des clés HMAC pour chaque camion
uint8_t cleAES[16] = { 'V','E','8','c','e','n','t','L','e','P','0','u','B','o','1','2' }; //CLE AES (Doit être identique à celle dans la micro:bit QG)
const uint8_t keysHMAC[25][16] = {
    { 'K','e','y','1','0','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA100AA (Index 0)
    { 'K','e','y','1','1','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA101AA (Index 1)
    { 'K','e','y','1','2','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA102AA (Index 2)
    { 'K','e','y','1','3','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA103AA (Index 3)
    { 'K','e','y','1','4','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA104AA (Index 4)
    { 'K','e','y','1','5','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA105AA (Index 5)
    { 'K','e','y','1','6','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA106AA (Index 6)
    { 'K','e','y','1','7','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA107AA (Index 7)
    { 'K','e','y','1','8','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA108AA (Index 8)
    { 'K','e','y','1','9','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA109AA (Index 9)
    { 'K','e','y','2','0','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA110AA (Index 10)
    { 'K','e','y','2','1','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA111AA (Index 11)
    { 'K','e','y','2','2','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA112AA (Index 12)
    { 'K','e','y','2','3','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA113AA (Index 13)
    { 'K','e','y','2','4','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA114AA (Index 14)
    { 'K','e','y','2','5','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA115AA (Index 15)
    { 'K','e','y','2','6','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA116AA (Index 16)
    { 'K','e','y','2','7','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA117AA (Index 17)
    { 'K','e','y','2','8','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA118AA (Index 18)
    { 'K','e','y','2','9','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA119AA (Index 19)
    { 'K','e','y','3','0','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA120AA (Index 20)
    { 'K','e','y','3','1','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA121AA (Index 21)
    { 'K','e','y','3','2','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA122AA (Index 22)
    { 'K','e','y','3','3','_','S','e','c','r','e','t','!','!','!','!' }, // Pour AA123AA (Index 23)
    { 'K','e','y','3','4','_','S','e','c','r','e','t','!','!','!','!' } // Pour AA124AA (Index 24)
};

// Structure de données d'un camion
struct EtatCamion {
    bool actif;         
    char id[10];    // Ex: "AA100AA"
    char geo[20];   // Ex: "45.12,4.89"
    char res[20];   // Ex: "Eau=100"
    char time[10];  // Ex: "12:00:00"
    int sequence;       
    bool btnAppuye;     
};

// Notre flotte en mémoire (25 slots = 25 camions)
EtatCamion flotte[25];

PacketBuffer bufferAckRecu(0); // Buffers de transmission radio
bool unAckEstArrive = false;
bool ackReceived = false;

// Simulation interruptions boutons pour camion 1 et 2
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


ManagedString extractValue(ManagedString source, const char* tag) {
    const char* s = source.toCharArray();
    char* ptrStart = strstr((char*)s, tag);
    if (!ptrStart) return "";
    ptrStart += strlen(tag);
    char* ptrEnd = strstr(ptrStart, ";");
    if (!ptrEnd) return "";
    return source.substring((ptrStart - s), ptrEnd - ptrStart);
}

// Conversion ID Texte -> Index Tableau (Mapping des clés des camions)
int getIndexFromID(ManagedString id) {
    if (id == "AA100AA") return 0;
    if (id == "AA101AA") return 1;
    if (id == "AA102AA") return 2;
    if (id == "AA103AA") return 3;
    if (id == "AA104AA") return 4;
    if (id == "AA105AA") return 5;
    if (id == "AA106AA") return 6;
    if (id == "AA107AA") return 7;
    if (id == "AA108AA") return 8;
    if (id == "AA109AA") return 9;
    if (id == "AA110AA") return 10;
    if (id == "AA111AA") return 11;
    if (id == "AA112AA") return 12;
    if (id == "AA113AA") return 13;
    if (id == "AA114AA") return 14;
    if (id == "AA115AA") return 15;
    if (id == "AA116AA") return 16;
    if (id == "AA117AA") return 17;
    if (id == "AA118AA") return 18;
    if (id == "AA119AA") return 19;
    if (id == "AA120AA") return 20;
    if (id == "AA121AA") return 21;
    if (id == "AA122AA") return 22;
    if (id == "AA123AA") return 23;
    if (id == "AA124AA") return 24;
    return -1;
}

uint32_t calculerAuth(const char* data, int len, const uint8_t* cle) {
    uint32_t hash = 0x12345678;
    for (int i = 0; i < 16; i++) { hash ^= cle[i]; hash = (hash << 5) | (hash >> 27); }
    for (int i = 0; i < len; i++) { hash ^= (uint8_t)data[i]; hash *= 0x5bd1e995; hash ^= (hash >> 15); }
    return hash;
}

PacketBuffer chiffrerSecurise(ManagedString message, int keyIdx) {
    // 96 OCTETS = 4 (auth) + 92 (message)
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
    // On peut recevoir des ACK chiffrés en 64 octets
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

// Mise à jour de la mémoire depuis le simulateur java
void mettreAJourEtat(ManagedString ligneJava) {
    ManagedString sId = extractValue(ligneJava, "ID:");

    int idx = getIndexFromID(sId);
    
    if (idx != -1) {
        strncpy(flotte[idx].id, sId.toCharArray(), 9); flotte[idx].id[9] = '\0';
        
        ManagedString sGeo = extractValue(ligneJava, "Geo:");
        strncpy(flotte[idx].geo, sGeo.toCharArray(), 19); flotte[idx].geo[19] = '\0';

        ManagedString sRes = extractValue(ligneJava, "Res:");
        strncpy(flotte[idx].res, sRes.toCharArray(), 19); flotte[idx].res[19] = '\0';
        
        ManagedString sTime = extractValue(ligneJava, "Time:");
        strncpy(flotte[idx].time, sTime.toCharArray(), 9); flotte[idx].time[9] = '\0';
        // ---------------------------------
        
        flotte[idx].actif = true; 
        
        // Feedback visuel court
        uBit.display.image.setPixelValue(2, 2, 255);
        uBit.sleep(10);
        uBit.display.image.setPixelValue(2, 2, 0);
    }
}


bool envoyerCamionRadio(int index) {
    if (!flotte[index].actif) return false;

    // On reconstruit l'objet String juste pour l'envoi
    ManagedString idString(flotte[index].id);
    ManagedString geoString(flotte[index].geo);
    ManagedString resString(flotte[index].res);
    ManagedString timeString(flotte[index].time);
    
    ManagedString payload = "ID:" + idString + 
                            ";Geo:" + geoString + 
                            ";Res:" + resString + 
                            ";Btn:" + ManagedString(flotte[index].btnAppuye ? 1 : 0) + 
                            ";Seq:" + ManagedString(flotte[index].sequence) +
                            ";Time:" + timeString + ";";

    // Logs Série
    uBit.serial.send("\r\n--------------------------------\r\n");
    uBit.serial.send("Envoi Radio ID:" + idString + " Time:" + timeString + "\r\n");
    uBit.serial.send("Contenu: " + payload + "\r\n");

    ackReceived = false;
    int tentatives = 0;
    PacketBuffer paquet = chiffrerSecurise(payload, index); 


    while (!ackReceived && tentatives < 3) {
        tentatives++;
        unAckEstArrive = false;
        
        uBit.radio.datagram.send(paquet);
        
        uint32_t start = uBit.systemTime();
        while(uBit.systemTime() - start < 300) {
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
                    
                    if (strstr(msg.toCharArray(), idString.toCharArray()) && 
                        strstr(msg.toCharArray(), (";" + seqCheck).toCharArray())) {
                        ackReceived = true;
                        break;
                    }
                }
                unAckEstArrive = false;
            }
            uBit.sleep(5);
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

    return true;
}

int main() {
    uBit.init();

    uBit.serial.setRxBufferSize(100); 
    uBit.serial.setTxBufferSize(100);
    
    uBit.serial.baud(115200);
    
    uBit.radio.enable(); uBit.radio.setGroup(16); uBit.radio.setTransmitPower(7);
    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, onData);
    uBit.messageBus.listen(MICROBIT_ID_BUTTON_A, MICROBIT_BUTTON_EVT_CLICK, onButtonA);
    uBit.messageBus.listen(MICROBIT_ID_BUTTON_B, MICROBIT_BUTTON_EVT_CLICK, onButtonB);

    // Initialisation
    for(int i=0; i<25; i++) {
        flotte[i].actif = false; 
        flotte[i].sequence = 0;
        flotte[i].btnAppuye = false;
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

        // 2. Envoyer (Renvoie VRAI si actif, FAUX si inactif)
        bool messageEnvoye = envoyerCamionRadio(camionEnCours);

        // 3. Gestion intelligente du temps
        if (messageEnvoye) {
            // Si on a émis, on attend un peu pour laisser la radio respirer
            uBit.sleep(100); 
        } else {
            // Si le camion est inactif on passe tout de suite au suivant (2ms)
            uBit.sleep(2); 
        }

        // Vérification globale d'activité pour mode veille profonde
        bool auMoinsUnActif = false;
        for(int i=0; i<25; i++) {
            if(flotte[i].actif) { auMoinsUnActif = true; break; }
        }

        if (!auMoinsUnActif) {
            uBit.sleep(200); // Si tout le monde dort, on ralentit
        }

        // 3. Suivant
        camionEnCours++;
        if (camionEnCours > 24) camionEnCours = 0;
    }
}