#include "MicroBit.h"
#include <string.h> 
extern "C" {
#include "aes.h"
}

MicroBit uBit;
uint8_t cleAES[16] = { 'V','i','n','c','e','n','t','L','e','P','l','u','B','o','1','2' };
uint32_t watchdogValidFrames = 0;

void serialPrint(ManagedString data) {
    uBit.serial.send(data + "\n");
}

// Fonction utilitaire (OK)
int findSubStr(ManagedString source, const char* target) {
    const char* s = source.toCharArray();
    const char* found = strstr(s, target);
    if (found != NULL) {
        return (int)(found - s);
    }
    return -1;
}

// Version sécurisée pour Yotta avec memset
ManagedString chiffrerAES64(ManagedString message) {
    uint8_t buffer[64];
    memset(buffer, ' ', 64); // On remplit de vide proprement

    int len = message.length();
    if (len > 64) len = 64;
    memcpy(buffer, message.toCharArray(), len);

    AES_ctx ctx;
    AES_init_ctx(&ctx, cleAES);
    for (int i = 0; i < 4; i++) AES_ECB_encrypt(&ctx, buffer + (i * 16));
    return ManagedString((const char*)buffer, 64);
}

ManagedString dechiffrerAES64(ManagedString data) {
    // Si on n'a pas 64 octets, on ne touche pas à la mémoire !
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

void receive_from_microbit(MicroBitEvent)
{
    ManagedString raw = uBit.radio.datagram.recv();
    
    // --- DIAGNOSTIC VISUEL ---
    // Allume un pixel au centre pour dire "J'ai reçu quelque chose !"
    uBit.display.image.setPixelValue(2, 2, 255); 

    // --- DIAGNOSTIC TAILLE ---
    // C'EST ICI QUE TOUT SE JOUE
    if (raw.length() < 64) {
        // Si tu vois ce message dans le terminal, c'est que le config.json n'a pas marché
        // La radio coupe les paquets à 32 octets.
        serialPrint("ERREUR: Paquet recu trop petit (<64). Verifier config.json !");
        uBit.sleep(200);
        uBit.display.image.setPixelValue(2, 2, 0); // Eteint le pixel
        return; 
    }

    ManagedString msg = dechiffrerAES64(raw); 
    
    int idIndex = findSubStr(msg, "ID:");
    int seqIndex = findSubStr(msg, "Seq:");
    
    if (idIndex >= 0 && seqIndex >= 0) {
        watchdogValidFrames++;

        int firstSemiColon = -1;
        // Recherche manuelle du ;
        const char* sMsg = msg.toCharArray();
        char* ptrID = strstr((char*)sMsg, "ID:");
        char* ptrVirgule = strstr(ptrID, ";");
        
        if (ptrVirgule != NULL) {
            firstSemiColon = ptrVirgule - sMsg;
            
            ManagedString idStr = msg.substring(idIndex + 3, firstSemiColon - (idIndex + 3));
            ManagedString seqStr = msg.substring(seqIndex + 4, msg.length() - (seqIndex + 4));

            ManagedString ackMsg = "ACK:" + idStr + ";" + seqStr;
            uBit.sleep(100);
            uBit.radio.datagram.send(chiffrerAES64(ackMsg));

            serialPrint(msg + ";WD:" + ManagedString((int)watchdogValidFrames));
            uBit.display.print("V"); 
        }
    } 
    
    uBit.sleep(100);
    uBit.display.image.setPixelValue(2, 2, 0); // Eteint le pixel
}

void Send_to_microbit(ManagedString data) {
    uBit.radio.datagram.send(chiffrerAES64(data));   
}

int main() {
    uBit.init();
    uBit.display.print("QG");

    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, receive_from_microbit);
    uBit.radio.enable();
    uBit.radio.setGroup(16);
    uBit.radio.setTransmitPower(7);

    uBit.serial.setTxBufferSize(128);
    uBit.serial.setRxBufferSize(128);
    uBit.serial.baud(115200);

    while(1) {
        ManagedString received = uBit.serial.readUntil('\n'); 
        if (received.length() != 0) Send_to_microbit(received);
        
        // Petit clignotement en coin pour montrer que le QG est vivant
        uBit.display.image.setPixelValue(0, 0, 255);
        uBit.sleep(500);
        uBit.display.image.setPixelValue(0, 0, 0);
        uBit.sleep(500);
    }
}