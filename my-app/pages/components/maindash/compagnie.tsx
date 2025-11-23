"use client";
import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { Funnel } from "lucide-react";
import styles from "../../../styles/Home.module.css"; // تأكد من المسار الصحيح

type CompagnieType = {
  id: number;
  date_debut: string;
  date_fin?: string;
  est_active: boolean;
  created_at: string;
};

const Compagnie = () => {
  const [dateDebut, setDateDebut] = useState("");
  const [compagnieActive, setCompagnieActive] = useState<CompagnieType | null>(
    null
  );
  const [allCompagnies, setAllCompagnies] = useState<CompagnieType[]>([]);
  const [filters, setFilters] = useState({
    id: "",
    date_debut: "",
    est_active: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchActiveCompagnie = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8080/api/compagnies/active"
      );
      setCompagnieActive(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement de la compagnie active:", err);
    }
  };

  const fetchAllCompagnies = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/compagnies");
      setAllCompagnies(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement de toutes les compagnies:", err);
    }
  };

  useEffect(() => {
    fetchActiveCompagnie();
    fetchAllCompagnies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateDebut) {
      alert("Veuillez entrer la date de début.");
      return;
    }

    try {
      await axios.post("http://localhost:8080/api/compagnie", {
        date_debut: dateDebut,
      });
      alert("Date enregistrée avec succès !");
      setDateDebut("");
      fetchActiveCompagnie();
      fetchAllCompagnies();
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status === 409) {
        alert(
          "Une compagnie active existe déjà. Veuillez la désactiver d'abord."
        );
      } else {
        console.error("Erreur:", error);
        alert("Erreur lors de l'enregistrement.");
      }
    }
  };

  const handleDisableCompagnie = async () => {
    try {
      await axios.put("http://localhost:8080/api/compagnie/disable");
      alert("Compagnie désactivée avec succès.");
      fetchActiveCompagnie();
      fetchAllCompagnies();
    } catch (err) {
      const error = err as AxiosError;
      console.error("Erreur:", error);
      alert("Erreur lors de la désactivation.");
    }
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1);
  };

  // Filtrer les données
  const filteredCompagnies = allCompagnies.filter((compagnie) => {
    return (
      (filters.id === "" || compagnie.id.toString().includes(filters.id)) &&
      (filters.date_debut === "" ||
        compagnie.date_debut.includes(filters.date_debut)) &&
      (filters.est_active === "" ||
        (filters.est_active === "active" && compagnie.est_active) ||
        (filters.est_active === "inactive" && !compagnie.est_active))
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedCompagnies = filteredCompagnies.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredCompagnies.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className={styles.container} style={{ padding: "2rem" }}>
      <h2 className={styles.title}>Lancer une Compagnie</h2>

      {compagnieActive ? (
        <div className={styles.activeCompagnie}>
          <h3>Compagnie Active</h3>
          <p>
            <strong>Date de début:</strong>{" "}
            {compagnieActive.date_debut
              ? new Date(compagnieActive.date_debut).toLocaleDateString("fr-FR")
              : ""}
          </p>
          <p>
            <strong>Statut:</strong> Active
          </p>
        </div>
      ) : (
        <p>Aucune compagnie active pour le moment.</p>
      )}

      <hr style={{ margin: "20px 0" }} />

      <form className={styles.formajout} onSubmit={handleSubmit}>
        <div>
          <label className={styles.blockLabel}>Date de début :</label>
          <input
            style={{
              width: "200px",
              border: "1px solid",
              height: "20px",
              padding: "5px",
              marginLeft: "5px",
            }}
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className={styles.inputField}
          />
        </div>
        <button className={styles.butt} type="submit">
          <strong> Enregistrer </strong>
        </button>
      </form>

      <hr style={{ margin: "1rem 0" }} />

      <button
        className={`${styles.butt} ${styles.disableButton}`}
        onClick={handleDisableCompagnie}
        disabled={!compagnieActive}
        style={{ backgroundColor: "#c00d00ff" }}
      >
        <strong> Désactiver la compagnie active</strong>
      </button>

      <div style={{ marginTop: "2rem" }}>
        <h3 className={styles.title}>Historique des Compagnies</h3>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  ID <br />
                  <Funnel size={14} />
                  <input
                    type="text"
                    placeholder="Filtrer id"
                    value={filters.id}
                    onChange={(e) => handleFilterChange("id", e.target.value)}
                    className={styles.inputField}
                  />
                </th>
                <th>
                  Date Début <br />
                  <Funnel size={14} />
                  <input
                    type="date"
                    value={filters.date_debut}
                    onChange={(e) =>
                      handleFilterChange("date_debut", e.target.value)
                    }
                    className={styles.inputField}
                  />
                </th>
                <th>
                  Statut <br />
                  <Funnel size={14} />
                  <select
                    className={styles.inputField}
                    value={filters.est_active}
                    onChange={(e) =>
                      handleFilterChange("est_active", e.target.value)
                    }
                  >
                    <option value="">Tous</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </th>
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
              {paginatedCompagnies.length > 0 ? (
                paginatedCompagnies.map((compagnie) => (
                  <tr key={compagnie.id}>
                    <td>{compagnie.id}</td>
                    <td>
                      {new Date(compagnie.date_debut).toLocaleDateString(
                        "fr-FR"
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          compagnie.est_active
                            ? styles.statusActive
                            : styles.statusInactive
                        }
                      >
                        {compagnie.est_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ width: "80px" }}></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={styles.noResults}>
                    Aucune compagnie trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={
                      page === currentPage
                        ? styles.activePageButton
                        : styles.pageButton
                    }
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Compagnie;
