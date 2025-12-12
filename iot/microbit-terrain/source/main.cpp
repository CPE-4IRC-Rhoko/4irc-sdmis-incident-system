#include "MicroBit.h"
#include <string.h> // Nécessaire pour les manipulations de texte
extern "C" {
#include "aes.h"
}

MicroBit uBit;

// --- CONFIGURATION ---
int MY_ID = 2; 
uint8_t cleAES[16] = { 'V','i','n','c','e','n','t','L','e','P','l','u','B','o','1','2' };

bool ackReceived = false;
int currentSequence = 0;

ManagedString chiffrerAES64(ManagedString message) {
    uint8_t buffer[64] = {0};
    int len = message.length();
    if (len > 64) len = 64;
    memcpy(buffer, message.toCharArray(), len);
    for (int i = len; i < 64; i++) buffer[i] = ' '; 

    AES_ctx ctx;
    AES_init_ctx(&ctx, cleAES);
    for (int i = 0; i < 4; i++) AES_ECB_encrypt(&ctx, buffer + (i * 16));
    return ManagedString((const char*)buffer, 64);
}

ManagedString dechiffrerAES64(ManagedString data) {
    if (data.length() < 64) return ManagedString("");
    const char* raw = data.toCharArray();
    uint8_t buffer[64];
    memcpy(buffer, raw, 64);

    AES_ctx ctx;
    AES_init_ctx(&ctx, cleAES);
    for (int i = 0; i < 4; i++) AES_ECB_decrypt(&ctx, buffer + (i * 16));

    int realLen = 64;
    while (realLen > 0 && buffer[realLen - 1] == ' ') realLen--;
    return ManagedString((const char*)buffer, realLen);
}

// --- RECEPTION ACK ---
void onData(MicroBitEvent) {
    ManagedString raw = uBit.radio.datagram.recv();
    ManagedString msg = dechiffrerAES64(raw);
    
    // On vérifie manuellement si ça commence par ACK:
    if (msg.substring(0, 4) == "ACK:") {
        
        // CORRECTION : Recherche manuelle du point virgule ';'
        int pVirgule = -1;
        for(int i = 0; i < msg.length(); i++) {
            if(msg.charAt(i) == ';') {
                pVirgule = i;
                break;
            }
        }
        
        if (pVirgule > 4) { 
            // Extraction ID
            ManagedString idStr = msg.substring(4, pVirgule - 4);
            int idRecu = atoi(idStr.toCharArray());
            
            // Extraction Sequence
            ManagedString seqStr = msg.substring(pVirgule + 1, msg.length() - pVirgule - 1);
            int seqRecu = atoi(seqStr.toCharArray());
            
            if (idRecu == MY_ID && seqRecu == currentSequence) {
                ackReceived = true;
            }
        }
    }
}

ManagedString getGeolocation() {
    return "+45.76440,+170.83557";
}

int main() {
    uBit.init();
    // CORRECTION : Pas de uBit.seed(), le random est déjà initialisé
    
    uBit.radio.enable();
    uBit.radio.setGroup(16);
    uBit.radio.setTransmitPower(7);
    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, onData);

    uBit.io.P0.setPull(PullDown); 

    while (true) {
        ManagedString geo = getGeolocation();
        int valEau = uBit.io.P1.getAnalogValue();
        int pctEau = (valEau * 100) / 1023;
        int btnState = uBit.io.P0.getDigitalValue();

        ManagedString payload = "ID:" + ManagedString(MY_ID) +
                                ";Geo:" + geo + 
                                ";Eau:" + ManagedString(pctEau) + 
                                ";Btn:" + ManagedString(btnState) + 
                                ";Seq:" + ManagedString(currentSequence);

        ackReceived = false;
        
        // Boucle d'envoi jusqu'à réception de l'ACK
        while (!ackReceived) {
            uBit.radio.datagram.send(chiffrerAES64(payload));
            uBit.display.print("T"); 
            
            // Attente aléatoire (Backoff)
            int attente = 300 + uBit.random(500);
            uBit.sleep(attente); 
            
            if (ackReceived) {
                uBit.display.print(MY_ID); 
                uBit.sleep(200);
            } else {
                uBit.display.print("R"); 
            }
        }

        currentSequence++;
        if (currentSequence > 999) currentSequence = 0; 
        
        // --- C'EST ICI QU'ON CHANGE LA VITESSE ---
        // Pause de 15 secondes (15000 ms) avant la prochaine mesure
        uBit.sleep(15000); 
    }
}