"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import styles from "../../../styles/Home.module.css";
import { Funnel } from "lucide-react";

type Employe = {
  matricule: string;
  matriculesalarie: string;
  prenom: string;
  nom: string;
};

const headers: { key: keyof Employe; label: string }[] = [
  { key: "matriculesalarie", label: "Matricule" },
  { key: "nom", label: "Nom" },
  { key: "prenom", label: "Prénom" },
];

const EvaluerEmployer = () => {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [filters, setFilters] = useState<
    Partial<Record<keyof Employe, string>>
  >({});
  const [compagnieActive, setCompagnieActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const router = useRouter();

  const checkCompagnie = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/compagnie/active");
      setCompagnieActive(res.data.active === true);
    } catch (error) {
      console.error("Erreur de vérification de la compagnie :", error);
    }
  };

  const fetchEmployes = async (matriculeChef: string) => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("Token non trouvé.");
      return;
    }

    try {
      const res = await axios.get(
        `http://localhost:8080/api/employes/chef/${matriculeChef}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setEmployes(res.data);
    } catch (error) {
      console.error("Erreur de chargement des employés :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCompagnie();
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      const matriculeChef = user.matricule;
      fetchEmployes(matriculeChef);
    } else {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = (key: keyof Employe, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredEmployes = employes.filter((emp) =>
    headers.every(({ key }) =>
      (emp[key]?.toLowerCase() ?? "").includes(
        filters[key]?.toLowerCase() ?? ""
      )
    )
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedEmployes = filteredEmployes.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredEmployes.length / itemsPerPage);

  if (!compagnieActive) {
    return (
      <div style={{ color: "red", fontWeight: "bold", padding: "20px" }}>
        Aucune compagnie active. Veuillez patienter.
      </div>
    );
  }

  if (loading) return <div>Chargement des employés...</div>;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Liste des employés à évaluer</h2>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {headers.map(({key, label }) => (
                <th key={label}>{label} <br /><Funnel size={14} />
                  <input
                    type="text"
                    placeholder={`Filtrer ${label.toLowerCase()}`}
                    value={filters[key] ?? ""}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className={styles.inputField}
                  /> </th>
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
            {paginatedEmployes.length > 0 ? (
              paginatedEmployes.map((emp) => (
                <tr key={emp.matriculesalarie}>
                  <td>{emp.matriculesalarie}</td>
                  <td>{emp.nom}</td>
                  <td>{emp.prenom}</td>
                  <td>
                    <button
                      onClick={() =>
                        router.push(
                          `/components/maindash/evaluer/${emp.matriculesalarie}`
                        )
                      }
                      className={styles.butt}
                      style={{
                       
                        border: "none",
                      }}
                    >
                      Évaluer
                    </button>
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  margin: "0 5px",
                  padding: "5px 10px",
                  backgroundColor: page === currentPage ? "#0070f3" : "#eaeaea",
                  color: page === currentPage ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluerEmployer;
