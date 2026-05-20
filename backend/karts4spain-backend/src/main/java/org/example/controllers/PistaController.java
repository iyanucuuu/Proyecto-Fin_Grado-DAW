package org.example.controllers;

import org.example.entities.Pista;
import org.example.repositories.PistaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pistas")
@CrossOrigin(origins = "http://localhost:4200")
public class PistaController {

    @Autowired
    private PistaRepository pistaRepository;

    // ── GET todas (con filtros opcionales) ────────────────────────────────────────
    @GetMapping
    public List<Pista> obtenerPistas(
            @RequestParam(required = false) String ccaa,
            @RequestParam(required = false) String tipo_kart,
            @RequestParam(required = false) String entorno) {

        boolean hasCcaa    = ccaa      != null && !ccaa.isBlank();
        boolean hasTipo    = tipo_kart != null && !tipo_kart.isBlank();
        boolean hasEntorno = entorno   != null && !entorno.isBlank();

        if (hasCcaa && hasTipo && hasEntorno) return pistaRepository.findByCcaaAndTipoKartAndEntorno(ccaa, tipo_kart, entorno);
        if (hasCcaa && hasTipo)              return pistaRepository.findByCcaaAndTipoKart(ccaa, tipo_kart);
        if (hasCcaa && hasEntorno)           return pistaRepository.findByCcaaAndEntorno(ccaa, entorno);
        if (hasTipo && hasEntorno)           return pistaRepository.findByTipoKartAndEntorno(tipo_kart, entorno);
        if (hasCcaa)                         return pistaRepository.findByCcaa(ccaa);
        if (hasTipo)                         return pistaRepository.findByTipoKart(tipo_kart);
        if (hasEntorno)                      return pistaRepository.findByEntorno(entorno);

        return pistaRepository.findAll();
    }

    // ── GET por ID ────────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Pista> obtenerPorId(@PathVariable Integer id) {
        return pistaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
