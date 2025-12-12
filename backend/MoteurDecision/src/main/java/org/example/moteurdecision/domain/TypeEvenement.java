package org.example.moteurdecision.domain;

import java.util.Objects;

public class TypeEvenement {

    private final int idTypeEvenement;
    private String nom;

    public TypeEvenement(int idTypeEvenement, String nom) {
        this.idTypeEvenement = idTypeEvenement;
        this.nom = Objects.requireNonNull(nom, "nom");
    }

    public Integer getId() {
        return idTypeEvenement;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = Objects.requireNonNull(nom, "nom");
    }
}
