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
  note?: string;
  valide?: boolean;
  profil?: string;
  matriculesalarie?: string;
};

const headers: { key: keyof Evaluation; label: string }[] = [
  { key: "matricule_employe", label: "Matricule" },
  { key: "nom", label: "Nom" },
  { key: "prenom", label: "Prénom" },
];

const LesEvaluations = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filters, setFilters] = useState<
    Partial<Record<keyof Evaluation, string>>
  >({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [role, setRole] = useState<"RH" | "CHEF" | null>(null);
  const [matricule, setMatricule] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setRole(parsed.role?.toUpperCase() === "RH" ? "RH" : "CHEF");
        setMatricule(parsed.matricule?.trim() || null);
      } catch (err) {
        console.error("Erreur parsing user from localStorage:", err);
      }
    }
  }, []);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!role || !matricule) return;

      try {
        const res = await axios.get(
          "http://localhost:8080/api/evaluations/terminer",
          {
            params: {
              role,
              matriculeChef: role === "CHEF" ? matricule : undefined,
            },
          }
        );
        setEvaluations(res.data);
      } catch (err) {
        console.error("Erreur lors du chargement des évaluations:", err);
      }
    };

    fetchEvaluations();
  }, [role, matricule]);

  const handleFilterChange = (key: keyof Evaluation, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filtered = evaluations.filter((e) =>
    headers.every(({ key }) =>
      String(e[key] ?? "")
        .toLowerCase()
        .includes((filters[key] ?? "").toLowerCase())
    )
  );

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Liste des Évaluations Terminées</h2>

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
              <th>Note</th>
              <th>Validé</th>
              <th>
                Action <br />{" "}
                <select
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
                </select>
              </th>
            </tr>
           
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((e) => (
                <tr key={e.id}>
                  <td>{e.matricule_employe}</td>
                  <td>{e.nom}</td>
                  <td>{e.prenom}</td>
                  <td>{e.note ?? "—"}</td>
                  <td>{e.valide ? "Oui" : "Non"}</td>
                  <td>
                    <Link
                      href={`/components/maindash/modifier/${
                        e.matriculesalarie ?? e.matricule_employe
                      }`}
                    >
                      <button
                        className={styles.butt}
                        style={{
                          width: "50px",
                          padding: "5px",
                          cursor: "pointer",
                        }}
                      >
                        Voir
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + 3} className={styles.noResults}>
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
                className={styles.butt}
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

export default LesEvaluations;
