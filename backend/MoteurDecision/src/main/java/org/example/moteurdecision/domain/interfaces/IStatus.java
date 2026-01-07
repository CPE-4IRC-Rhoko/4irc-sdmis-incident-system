package org.example.moteurdecision.domain.interfaces;

import java.util.UUID;

/**
 * Marker interface to represent any status entity in the system.
 */
public interface IStatus {
    UUID getIdStatut();
    String getNomStatut();
}
