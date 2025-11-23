"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Funnel } from "lucide-react";
import styles from "../../../styles/Home.module.css";

type Evaluation = {
  id: number;
  matricule_employe: string;
  nom: string;
  prenom: string;
  profil?: string;
  matriculesalarie?: string;
};

const headers: { key: keyof Evaluation; label: string }[] = [
  { key: "matricule_employe", label: "Matricule" },
  { key: "nom", label: "Nom" },
  { key: "prenom", label: "Prénom" },
];

const ValiderEvaluation = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filters, setFilters] = useState<
    Partial<Record<keyof Evaluation, string>>
  >({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8080/api/evaluations/validated"
        );
        setEvaluations(res.data);
      } catch (err) {
        console.error("Erreur lors du chargement des évaluations:", err);
      }
    };

    fetchEvaluations();
  }, []);

  const handleFilterChange = (key: keyof Evaluation, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filtered = evaluations.filter((e) =>
    headers.every(({ key }) =>
      String(e[key] ?? "")
        .toLowerCase()
        .includes((filters[key] ?? "").toString().toLowerCase())
    )
  );

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Validation des Évaluations</h2>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {headers.map(({ key, label }) => (
                <th key={label}>
                  {label} <br /> <Funnel size={14} />
                  <input
                    type="text"
                    placeholder={`Filtrer ${label.toLowerCase()}`}
                    value={filters[key] ?? ""}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className={styles.inputField}
                  />
                </th>
              ))}
              <th>Action <br /><select
                  className={styles.inputField}
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select></th>
            </tr>
           
                
            
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((e) => (
                <tr key={e.id}>
                  <td>{e.matricule_employe}</td>
                  <td>{e.nom}</td>
                  <td>{e.prenom}</td>
                  <td>
                    <Link
                      href={`/components/maindash/valider/${
                        e.matriculesalarie ?? e.matricule_employe
                      }`}
                    >
                      <button
                        className={styles.butt}
                        style={{
                          padding: "5px",
                          cursor: "pointer",
                        }}
                      >
                        Valider
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + 1} className={styles.noResults}>
                  Aucun résultat trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                style={{
                  margin: "0 5px",
                  padding: "5px 10px",
                  backgroundColor:
                    currentPage === i + 1 ? "#10b981" : "#e5e7eb",
                  color: currentPage === i + 1 ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ValiderEvaluation;
