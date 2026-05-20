package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "mensajes_directos")
@Getter @Setter
public class MensajeDirecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_remitente")
    private Long idRemitente;

    @Column(name = "id_destinatario")
    private Long idDestinatario;

    private String mensaje;
    private Boolean leido = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
