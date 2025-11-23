"use client";

import React, { useEffect, useState } from "react";
import styles from "../../../styles/Home.module.css";
import { Funnel, Pencil, Save, X } from "lucide-react";

type Chef = {
  matricule: number;
  name: string;
  role: string;
  email: string;
};

const headers: { key: keyof Chef; label: string }[] = [
  { key: "matricule", label: "matricule" },
  { key: "name", label: "Nom" },
  { key: "role", label: "Rôle" },
  { key: "email", label: "Email" },
];

const ChefTable = () => {
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [filters, setFilters] = useState<Partial<Record<keyof Chef, string>>>(
    {}
  );
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedChef, setEditedChef] = useState<Chef | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/chef");
        const data = await response.json();
        setChefs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur lors du fetch :", err);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (key: keyof Chef, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredChefs = chefs.filter((chef) =>
    headers.every(({ key }) =>
      (chef[key]?.toString().toLowerCase() ?? "").includes(
        filters[key]?.toLowerCase() ?? ""
      )
    )
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedChefs = filteredChefs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredChefs.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleEditClick = (index: number) => {
    setEditIndex(index);
    setEditedChef({ ...paginatedChefs[index] });
  };

  const handleInputChange = (key: keyof Chef, value: string) => {
    if (editedChef) {
      setEditedChef({ ...editedChef, [key]: value });
    }
  };

  const handleSave = async () => {
    if (editedChef) {
      try {
        const response = await fetch(
          `http://localhost:8080/api/chef/${editedChef.matricule}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editedChef),
          }
        );

        if (response.ok) {
          const updatedChefs = chefs.map((c) =>
            c.matricule === editedChef.matricule ? editedChef : c
          );
          setChefs(updatedChefs);
          setEditIndex(null);
          setEditedChef(null);
        } else {
          console.error("Erreur lors de la mise à jour");
        }
      } catch (err) {
        console.error("Erreur lors de l'envoi au serveur :", err);
      }
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Liste des Chefs</h2>

      <div className={styles.tableWrapper}>
        <table style={{ width: "1100px" }} className={styles.table}>
          <thead>
            <tr>
              {headers.map(({ key, label }) => (
                <th key={label}>
                  {label} <br />
                  <Funnel size={14} />
                  <input
                    type="text"
                    placeholder={`Filtrer ${label.toLowerCase()}`}
                    value={filters[key] ?? ""}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className={styles.inputField}
                  />
                </th>
              ))}
              <th>
                Actions{" "}
                <select
                  className={styles.inputField}
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedChefs.length > 0 ? (
              paginatedChefs.map((chef, index) => (
                <tr key={chef.matricule}>
                  {headers.map(({ key }) => (
                    <td key={key}>
                      {editIndex === index ? (
                        <input
                          type="text"
                          value={editedChef?.[key] ?? ""}
                          onChange={(e) =>
                            handleInputChange(key, e.target.value)
                          }
                          className={styles.inputField}
                        />
                      ) : (
                        chef[key]
                      )}
                    </td>
                  ))}
                  <td style={{ width: "80px" }}>
                    {editIndex === index ? (
                      <>
                        <button onClick={handleSave} title="Enregistrer">
                          <Save size={12} width={30} />
                        </button>
                        <button
                          onClick={() => setEditIndex(null)}
                          title="Annuler"
                        >
                          <X size={12} width={30} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          style={{
                            borderColor: "#b8b8b8ff",
                            backgroundColor: "#ffffffff",
                            color: "black",
                          }}
                          onClick={() => handleEditClick(index)}
                          title="Modifier"
                        >
                          <Pencil size={12} width={65} />
                        </button>
                      </>
                    )}
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
                onClick={() => handlePageChange(page)}
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

export default ChefTable;
