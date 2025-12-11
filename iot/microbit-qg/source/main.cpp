
#include "MicroBit.h"
#include "nrf.h"  // Nécessaire pour les définitions NVIC
extern "C" {
    #include "aes.h"
}


MicroBit uBit;
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
        buffer[i] = ' ';
    }

    AES_ctx ctx;
    AES_init_ctx(&ctx, cleAES);
    AES_ECB_encrypt(&ctx, buffer);       // Bloc 1
    AES_ECB_encrypt(&ctx, buffer + 16);  // Bloc 2

    return ManagedString((const char*)buffer, 32);
}

// Déchiffre une chaîne hexadécimale AES-ECB 128
ManagedString dechiffrerAES32(ManagedString data) {
    const char* raw = data.toCharArray();
    uint8_t buffer[32] = {0};
    int len = data.length() > 32 ? 32 : data.length();
    memcpy(buffer, raw, len);

    AES_ctx ctx;
    AES_init_ctx(&ctx, cleAES);
    AES_ECB_decrypt(&ctx, buffer);
    AES_ECB_decrypt(&ctx, buffer + 16);

    // Supprime le padding (caractère '~' utilisé)
    int realLen = 32;
    while (realLen > 0 && buffer[realLen - 1] == ' ') {
        realLen--;
    }

    return ManagedString((const char*)buffer, realLen);
}


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
}

int main()
{
    // Initialise the micro:bit runtime.
    uBit.init();
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
        if (received.length() != 0)
        {
            Send_to_microbit(received);
        }
        //serialPrint("TEST");
    }
}

