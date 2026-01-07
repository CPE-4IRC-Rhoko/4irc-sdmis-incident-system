package org.example;

import org.w3c.dom.Text;

public class TypeEvenement {
    private String nomSeverite;
    private String nomTypeEvenement;
    private String description;

    public TypeEvenement(String nomSeverite, String nomTypeEvenement, String description) {
        this.nomSeverite = nomSeverite;
        this.nomTypeEvenement = nomTypeEvenement;
        this.description = description;
    }

    public String getNomSeverite() {
        return nomSeverite;
    }

    public String getNomTypeEvenement() {
        return nomTypeEvenement;
    }

    public String getDescription() {
        return description;
    }

    @Override
    public String toString() {
        return "Severite: " + nomSeverite +  " - Nom: " + nomTypeEvenement + " - Description: " + description;
    }
}