package org.example.moteurdecision.domain;

import java.util.Objects;

public class Severite {

    private final int idGravite;
    private String nomGravite;
    private String valeurEchelle;
    private int nbVehiculesNecessaires;

    public Severite(int idGravite, String nomGravite, String valeurEchelle, int nbVehiculesNecessaires) {
        this.idGravite = idGravite;
        this.nomGravite = Objects.requireNonNull(nomGravite, "nomGravite");
        this.valeurEchelle = Objects.requireNonNull(valeurEchelle, "valeurEchelle");
        this.nbVehiculesNecessaires = nbVehiculesNecessaires;
    }

    public Integer getId() {
        return idGravite;
    }

    public String getNom() {
        return nomGravite;
    }

    public String getValeurEchelle() {
        return valeurEchelle;
    }

    public void setNomGravite(String nomGravite) {
        this.nomGravite = Objects.requireNonNull(nomGravite, "nomGravite");
    }

    public void setValeurEchelle(String valeurEchelle) {
        this.valeurEchelle = Objects.requireNonNull(valeurEchelle, "valeurEchelle");
    }

    public int getNbVehiculesNecessaires() {
        return nbVehiculesNecessaires;
    }
}
