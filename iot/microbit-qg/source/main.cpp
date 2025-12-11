
#include "MicroBit.h"
<<<<<<< Updated upstream
#include "nrf.h"  // Nécessaire pour les définitions NVIC
=======
#include "nrf.h" 
>>>>>>> Stashed changes
extern "C" {
    #include "aes.h"
}


MicroBit uBit;
<<<<<<< Updated upstream
ManagedString clePartagee = "VincentLePluBo";  // Clé partagée
uint8_t cleAES[16] = { 'V','i','n','c','e','n','t','L','e','P','l','u','B','o','1','2' };

void serialPrint(ManagedString data)
{
    //uBit.display.print("SP");
    //uBit.serial.send(data);
    uBit.serial.send(ManagedString(data+"\n"));
    //uBit.serial.send("BONJOUR\n");

}

// Fonction de chiffrement XOR
ManagedString chiffrer(ManagedString texte, ManagedString cle) {
    int len = texte.length();
    int klen = cle.length();
    char result[len + 1];

    for (int i = 0; i < len; i++) {
        result[i] = texte.charAt(i) ^ cle.charAt(i % klen);
    }
    result[len] = '\0';
    return ManagedString(result);
}


// Chiffre un message clair de 32 octets
ManagedString chiffrerAES32(ManagedString message) {
    uint8_t buffer[32] = {0};
    int len = message.length();
    if (len > 32) len = 32; // Tronque à 32 si dépasse

    memcpy(buffer, message.toCharArray(), len);

    // Padding (ex: avec `~`) si message < 32
    for (int i = len; i < 32; i++) {
=======
uint8_t cleAES[16] = { 'V','i','n','c','e','n','t','L','e','P','l','u','B','o','1','2' };

// Watchdog : Compteur qui s'incrémente à chaque bonne réception
uint32_t watchdogValidFrames = 0;

void serialPrint(ManagedString data)
{
    // Envoi propre avec saut de ligne pour ton API
    uBit.serial.send(data + "\n");
}

// --- NOUVELLES FONCTIONS AES (64 Octets) ---

// Chiffre un message (max 64 octets)
ManagedString chiffrerAES64(ManagedString message) {
    uint8_t buffer[64] = {0}; 
    int len = message.length();
    
    // Sécurité : on coupe si c'est trop long
    if (len > 64) len = 64; 

    memcpy(buffer, message.toCharArray(), len);

    // Padding avec espaces
    for (int i = len; i < 64; i++) {
>>>>>>> Stashed changes
        buffer[i] = ' ';
    }

    AES_ctx ctx;
    AES_init_ctx(&ctx, cleAES);

    // On chiffre 4 blocs de 16 octets
    for (int i = 0; i < 4; i++) {
        AES_ECB_encrypt(&ctx, buffer + (i * 16));
    }

    return ManagedString((const char*)buffer, 64);
}

// Déchiffre un message de 64 octets
ManagedString dechiffrerAES64(ManagedString data) {
    if (data.length() < 64) return ManagedString("");

    const char* raw = data.toCharArray();
    uint8_t buffer[64];
    memcpy(buffer, raw, 64);

    AES_ctx ctx;
    AES_init_ctx(&ctx, cleAES);

<<<<<<< Updated upstream
    // Supprime le padding (caractère '~' utilisé)
    int realLen = 32;
=======
    // On déchiffre les 4 blocs
    for (int i = 0; i < 4; i++) {
        AES_ECB_decrypt(&ctx, buffer + (i * 16));
    }

    // On supprime le padding
    int realLen = 64;
>>>>>>> Stashed changes
    while (realLen > 0 && buffer[realLen - 1] == ' ') {
        realLen--;
    }

    return ManagedString((const char*)buffer, realLen);
}

<<<<<<< Updated upstream

void receive_from_microbit(MicroBitEvent)
{
    //serialPrint("RX");
    ManagedString s = dechiffrerAES32(uBit.radio.datagram.recv());
    serialPrint(s);
}

void Send_to_microbit(ManagedString data_to_send)
{
    serialPrint("TX");
    uBit.radio.datagram.send(chiffrerAES32(data_to_send));   

    //serialPrint(data_to_send); 
}

void receive_from_serial(MicroBitEvent)
{
    ManagedString received = uBit.serial.readUntil('\n'); // ou '\r' ou autre
    Send_to_microbit(received);
=======
// --- GESTION RADIO & ACK ---

void Send_to_microbit(ManagedString data_to_send)
{
    // Cette fonction sert si le PC veut envoyer un ordre au camion
    // On garde ton "serialPrint TX" pour debug
    // serialPrint("TX"); 
    uBit.radio.datagram.send(chiffrerAES64(data_to_send));   
>>>>>>> Stashed changes
}

void receive_from_microbit(MicroBitEvent)
{
    // 1. Réception et Déchiffrement
    ManagedString raw = uBit.radio.datagram.recv();
    ManagedString messageClair = dechiffrerAES64(raw);
    
    // 2. Vérification de la validité (On cherche "Seq:")
    int seqIndex = messageClair.indexOf("Seq:");
    
    if (seqIndex >= 0) {
        // C'est une trame valide du camion !
        watchdogValidFrames++;
        
        // 3. Extraction du numéro de séquence pour l'ACK
        // On suppose le format ...;Seq:12
        // On prend les caractères après "Seq:"
        ManagedString seqNumStr = messageClair.substring(seqIndex + 4, messageClair.length() - (seqIndex + 4));

        // 4. Renvoi de l'ACK au camion (immédiatement)
        ManagedString ackMsg = "ACK:" + seqNumStr;
        uBit.radio.datagram.send(chiffrerAES64(ackMsg));

        // 5. Envoi vers le PC (API)
        // On ajoute le compteur Watchdog à la fin pour le monitoring
        serialPrint(messageClair + ";WD:" + ManagedString((int)watchdogValidFrames));
        
        // Feedback visuel sur la matrice
        uBit.display.print("V"); 
    } 
    else {
        // Message reçu mais format incorrect (pas de Seq) ou mauvaise clé
        // uBit.display.print("X");
    }
}


int main()
{
    // Initialise the micro:bit runtime.
    uBit.init();
<<<<<<< Updated upstream
    //serialPrint("READY");
    uBit.display.print("MB-SERVER");

    

    
    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, receive_from_microbit);
    uBit.radio.enable();
    uBit.radio.setGroup(16);


    uBit.serial.setTxBufferSize(64);
    uBit.serial.setRxBufferSize(64);
    uBit.serial.baud(115200);
    uBit.serial.eventOn(MicroBitSerialMode::ASYNC);
    //uBit.messageBus.listen(MICROBIT_ID_SERIAL, MICROBIT_SERIAL_EVT_DELIM_MATCH, receive_from_serial);

    while(1) 
    {
        uBit.display.print("W");
        ManagedString received = uBit.serial.readUntil('\n'); // ou '\r' ou autre
=======
    uBit.display.print("QG");

    // Configuration Radio
    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, receive_from_microbit);
    uBit.radio.enable();
    uBit.radio.setGroup(16);
    uBit.radio.setTransmitPower(7); // Puissance max pour meilleure portée

    // Configuration Série
    uBit.serial.setTxBufferSize(128); // Augmenté car les trames sont plus longues
    uBit.serial.setRxBufferSize(128);
    uBit.serial.baud(115200);
    // uBit.serial.eventOn(MicroBitSerialMode::ASYNC); // Pas strictement nécessaire si on fait du polling dans le while

    while(1) 
    {
        // Ton code original de lecture série (Polling)
        // Si le PC envoie quelque chose, on le transmet au camion
        ManagedString received = uBit.serial.readUntil('\n'); 
        
>>>>>>> Stashed changes
        if (received.length() != 0)
        {
            Send_to_microbit(received);
        }
<<<<<<< Updated upstream
        //serialPrint("TEST");
    }
}

=======
        
        // Petit délai pour ne pas saturer le CPU si aucune donnée
        uBit.sleep(100);
    }
}
>>>>>>> Stashed changes
