package org.example.moteurdecision.domain;

import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class Equipement {

    private final int idEquipement;
    private String nomEquipement;
    private final Set<Vehicule> vehicules = new HashSet<>();
    private int idTypeEvenement;

    public Equipement(int idEquipement, String nomEquipement) {
        this.idEquipement = idEquipement;
        this.nomEquipement = Objects.requireNonNull(nomEquipement, "nomEquipement");
        this.idTypeEvenement = idEquipement;
    }

    public Integer getId() {
        return idEquipement;
    }

    public String getNom() {
        return nomEquipement;
    }

    public void setNomEquipement(String nomEquipement) {
        this.nomEquipement = Objects.requireNonNull(nomEquipement, "nomEquipement");
    }

    public Set<Vehicule> getVehicules() {
        return Collections.unmodifiableSet(vehicules);
    }

    void associerVehicule(Vehicule vehicule) {
        if (vehicule != null) {
            vehicules.add(vehicule);
        }
    }

    void retirerVehicule(Vehicule vehicule) {
        vehicules.remove(vehicule);
    }

    public int getIdTypeEvenement() {
        return idTypeEvenement;
    }
}
