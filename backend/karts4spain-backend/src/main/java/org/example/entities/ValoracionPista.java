package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "valoraciones_pista")
@Getter @Setter
public class ValoracionPista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_pista")
    private Integer idPista;

    @Column(name = "id_usuario")
    private Long idUsuario;

    private Integer nota;
}
