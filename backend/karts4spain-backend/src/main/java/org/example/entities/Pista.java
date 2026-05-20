package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@Table(name = "pistas")
@Getter
@Setter
public class Pista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pista")
    private Integer idPista;

    private String nombre;
    private String direccion;
    private Double lat;
    private Double lng;
    private String tipoKart;
    private String ccaa;
    private String entorno;
    private String url;

    @Column(columnDefinition = "VARCHAR DEFAULT 'activa'")
    private String estadoPista = "activa"; // activa/cerrada

    @Column(precision = 6, scale = 2)
    private BigDecimal precioSesion;

    private String telefonoContacto;
    private String foto;
}