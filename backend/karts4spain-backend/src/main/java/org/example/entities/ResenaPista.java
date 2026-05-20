package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "resenas_pistas")
@Getter
@Setter
public class ResenaPista {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idResena;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "id_pista")
    private Pista pista;

    private String comentario;
    private Integer valoracion;
    private Integer estadoAsfalto;
    private String fotoUrl;
    private LocalDateTime fechaCreacion = LocalDateTime.now();
}