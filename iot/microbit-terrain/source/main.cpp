#include "MicroBit.h"
#include "bme280.h"
#include "ssd1306.h"
#include "tsl256x.h"
extern "C" {
    #include "aes.h"
}

MicroBit uBit;
MicroBitI2C i2c(I2C_SDA0,I2C_SCL0);
MicroBitPin P0(MICROBIT_ID_IO_P0, MICROBIT_PIN_P0, PIN_CAPABILITY_DIGITAL_OUT);
ManagedString ordreAffichage = "THPL";
int id = 2; // ID de l’émetteur
uint8_t cleAES[16] = { 'V','i','n','c','e','n','t','L','e','P','l','u','B','o','1','2' };

// Chiffre un message clair de 32 octets en AES-ECB 128
ManagedString chiffrerAES32(ManagedString message) {
    uint8_t buffer[32] = {0};
    int len = message.length();
    if (len > 32) len = 32; // Bloque à 32 si dépasse

    memcpy(buffer, message.toCharArray(), len);

    // Complête avec " " si message < 32
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

    // Supprime le(s) caractère ' ' utilisé(s) pour completer
    int realLen = 32;
    while (realLen > 0 && buffer[realLen - 1] == ' ') {
        realLen--;
    }

    return ManagedString((const char*)buffer, realLen);
}

void onData(MicroBitEvent)
{
    ManagedString s = dechiffrerAES32(uBit.radio.datagram.recv());

    if (s.length() == 4)
        ordreAffichage = s;  // Met à jour l’ordre d'affichage de l'écren OLED
    else
        ordreAffichage = "THPL"; // Ordre d'affichage par défaut
}

int main()
{
    // Initialise micro:bit.
    uBit.init();

    // Initialise le module radio de la micro:bit
    uBit.radio.enable();
    uBit.radio.setGroup(16);
    uBit.messageBus.listen(MICROBIT_ID_RADIO, MICROBIT_RADIO_EVT_DATAGRAM, onData);

    // Déclaration des capteurs et des valeurs associées par défaut
    bme280 bme(&uBit,&i2c);
    ssd1306 screen(&uBit, &i2c, &P0);
    tsl256x tsl(&uBit,&i2c);
    uint32_t pressure = 0;
    int32_t temp = 0;
    uint16_t humidite = 0;
    uint16_t comb=0, ir=0;
    uint32_t lux = 0;

    while (true)
    {
        // Lecture brute des données
        bme.sensor_read(&pressure, &temp, &humidite);
        tsl.sensor_read(&comb, &ir, &lux);

        // Compensation des valeurs
        int tmp = bme.compensate_temperature(temp); // En centièmes de degré
        int pres = bme.compensate_pressure(pressure) / 100; // En hPa
        int hum = bme.compensate_humidity(humidite); // En centièmes de %

        // Conversion en chaînes de caractères à afficher
        ManagedString lineT = ManagedString(tmp / 100) + "." + ManagedString(tmp > 0 ? tmp % 100 : (-tmp) % 100);
        ManagedString lineH = ManagedString(hum / 100) + "." + ManagedString(hum % 100);
        ManagedString lineP = ManagedString(pres);
        ManagedString lineL = ManagedString((int)lux);

        screen.update_screen();
        screen.clear(); // Réinitialise l'écran avant d'écrire dessus

        // Affiche selon ordre reçu sur l'écran OLED
        for (int i = 0; i < 4; i++)
        {
            char capteur = ordreAffichage.charAt(i);
            switch (capteur)
            {
                case 'T':
                    screen.display_line(i, 0, (ManagedString("Temp: ") + lineT + " C").toCharArray());
                    break;
                case 'H':
                    screen.display_line(i, 0, (ManagedString("Hum: ") + lineH + " %").toCharArray());
                    break;
                case 'P':
                    screen.display_line(i, 0, (ManagedString("Pres: ") + lineP + " hPa").toCharArray());
                    break;
                case 'L':
                    screen.display_line(i, 0, (ManagedString("Lumi: ") + lineL + " lux").toCharArray());
                    break;
                default:
                    screen.display_line(i, 0, "Invalide");
                    break;
            }
        }

        // Envoie les valeurs par radio avec chiffrement
        ManagedString message = "T:"+ lineT + ";" + "H:"+ lineH + ";" + "P:"+ lineP + ";" + "L:" + lineL + ";ID:" + id;
        uBit.radio.datagram.send(chiffrerAES32(message));

        uBit.sleep(1000);
    }

    release_fiber();
}