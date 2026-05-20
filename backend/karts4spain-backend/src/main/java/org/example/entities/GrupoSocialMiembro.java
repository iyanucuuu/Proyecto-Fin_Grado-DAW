package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "grupos_sociales_miembros")
@Getter @Setter
public class GrupoSocialMiembro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_grupo")
    private Long idGrupo;

    @Column(name = "id_usuario")
    private Long idUsuario;
}
