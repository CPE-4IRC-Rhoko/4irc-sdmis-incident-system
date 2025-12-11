package org.example.moteurdecision.domain.interfaces;

/**
 * Describes an element that exposes GPS coordinates.
 */
public interface IGeolocated {
    double getLatitude();

    double getLongitude();
}
