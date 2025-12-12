CREATE TABLE IF NOT EXISTS type_evenement (
    id_type_evenement SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS statut_evenement (
    id_statut SERIAL PRIMARY KEY,
    nom_statut VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS severite (
    id_severite SERIAL PRIMARY KEY,
    nom_severite VARCHAR(50) NOT NULL,
    valeur_echelle INTEGER NOT NULL,
    nb_vehicules_necessaire INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS evenement (
    id_evenement SERIAL PRIMARY KEY,
    description VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    date_evenement TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    id_type_evenement INTEGER NOT NULL REFERENCES type_evenement(id_type_evenement),
    id_statut INTEGER NOT NULL REFERENCES statut_evenement(id_statut),
    id_severite INTEGER NOT NULL REFERENCES severite(id_severite)
);
