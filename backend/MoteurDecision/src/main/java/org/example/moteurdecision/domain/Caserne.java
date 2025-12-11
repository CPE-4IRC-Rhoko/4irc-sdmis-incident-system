package org.example.moteurdecision.domain;

import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class Caserne {

    private final int idCaserne;
    private String nomCaserne;
    private String nomRue;
    private String ville;
    private int numRue;
    private final Set<Vehicule> vehicules = new HashSet<>();
    private final Set<Agent> agents = new HashSet<>();

    public Caserne(int idCaserne, String nomCaserne, String nomRue, String ville, int numRue) {
        this.idCaserne = idCaserne;
        this.nomCaserne = Objects.requireNonNull(nomCaserne, "nomCaserne");
        this.numRue = numRue;
        this.ville = Objects.requireNonNull(ville, "ville");
        this.nomRue = Objects.requireNonNull(nomRue, "nomRue");
    }

    public Integer getId() {
        return idCaserne;
    }

    public String getNom() {
        return nomCaserne;
    }

    public Set<Vehicule> getVehicules() {
        return Collections.unmodifiableSet(vehicules);
    }

    public Set<Agent> getAgents() {
        return Collections.unmodifiableSet(agents);
    }

    public String getAdresse() {
        return ville;
    }

    public void ajouterVehicule(Vehicule vehicule) {
        Objects.requireNonNull(vehicule, "vehicule");
        vehicule.affecterCaserne(this);
    }

    public void retirerVehicule(Vehicule vehicule) {
        if (vehicule != null) {
            vehicule.affecterCaserne(null);
        }
    }

    public void ajouterAgent(Agent agent) {
        Objects.requireNonNull(agent, "agent");
        agent.affecterCaserne(this);
    }

    public void retirerAgent(Agent agent) {
        if (agent != null) {
            agent.affecterCaserne(null);
        }
    }

    void rattacherVehicule(Vehicule vehicule) {
        vehicules.add(vehicule);
    }

    void detacherVehicule(Vehicule vehicule) {
        vehicules.remove(vehicule);
    }

    void rattacherAgent(Agent agent) {
        agents.add(agent);
    }

    void detacherAgent(Agent agent) {
        agents.remove(agent);
    }
}
