
package com.example.backend.repository;

import com.example.backend.entity.CategorieMarche;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategorieMarcheRepository
        extends JpaRepository<CategorieMarche, Long> {

    List<CategorieMarche> findAllByOrderByNomCategorieAsc();

    boolean existsByNomCategorieIgnoreCase(String nomCategorie);

    boolean existsByNomCategorieIgnoreCaseAndIdCategorieNot(
            String nomCategorie,
            Long idCategorie
    );
}
