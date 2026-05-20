package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_pista")
@Getter @Setter
public class MensajeChatPista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_pista")
    private Integer idPista;

    @Column(name = "id_usuario")
    private Long idUsuario;

    private String username;
    private String mensaje;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
