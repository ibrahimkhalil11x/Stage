"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import styles from "../../../../styles/Home.module.css";
import { Funnel } from "lucide-react";

type Question = {
  id: number;
  texte: string;
  rubrique?: string;
  niveaurequis?: string;
  reponse_chef: string;
};

type Niveau = {
  id: number;
  niveau: string;
};

type Employe = {
  codeFiche: number;
  id: number;
  matriculesalarie: string;
  prenom: string;
  nom: string;
  direction: string;
  service: string;
  paye: string;
  sa_compteurnumero: string;
  miseensommeil: boolean;
  datesortieposte: string;
  qualification: string;
  dateentree: string;
  chefhierarchique: string;
  date_naissance: string;
};

const ValiderEvaluationRH = () => {
  const router = useRouter();
  const params = useParams();
  const matricule = params?.matricule as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [modifications, setModifications] = useState<Record<number, string>>(
    {}
  );
  const [filters, setFilters] = useState<
    Partial<Record<keyof Question, string>>
  >({});
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [employeInfo, setEmployeInfo] = useState<Employe | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (!matricule) return;

    const fetchData = async () => {
      try {
        const [resQuestions, resNiveaux, resEmploye] = await Promise.all([
          axios.get(
            `http://localhost:8080/api/evaluations/${matricule}/questions`
          ),
          axios.get("http://localhost:8080/Niveau"),
          axios.get(`http://localhost:8080/api/employe/${matricule}`),
        ]);

        const initialModifications: Record<number, string> = {};
        resQuestions.data.forEach((q: Question) => {
          initialModifications[q.id] = q.reponse_chef;
        });

        setQuestions(resQuestions.data);
        setNiveaux(resNiveaux.data);
        setEmployeInfo(resEmploye.data);
        setModifications(initialModifications);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
      }
    };

    fetchData();
  }, [matricule]);

  const handleChange = (id: number, value: string) => {
    setModifications((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        `http://localhost:8080/api/evaluations/${matricule}/valider`,
        { modifications }
      );

      // تحقق من أن السيرفر أكد الحفظ
      if (res.data && res.data.success) {
        alert(
          `Les réponses ont été validées avec succès ! Note totale: ${res.data.totalNote}`
        );
        router.back();
      } else {
        console.warn(
          "Le serveur n'a pas appliqué les modifications:",
          res.data
        );
        alert(
          "La validation n'a pas pu être effectuée. Veuillez vérifier les données."
        );
      }
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const errorObj = err as { response?: { data?: { error?: string } } };
        console.error(
          "Erreur lors de l'enregistrement :",
          errorObj.response || err
        );
        const message =
          errorObj.response?.data?.error || "Erreur lors de l'enregistrement !";
        alert(message);
      } else {
        console.error("Erreur lors de l'enregistrement :", err);
        alert("Erreur lors de l'enregistrement !");
      }
    }
  };

  const getNiveauLabel = (id: string | number | null | undefined) => {
    if (id === null || id === undefined) return "";
    const niveau = niveaux.find((n) => String(n.id) === String(id));
    return niveau ? niveau.niveau : String(id);
  };

  const handleFilterChange = (key: keyof Question, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredQuestions = questions.filter((q) =>
    Object.entries(filters).every(([key, val]) =>
      String(q[key as keyof Question] || "")
        .toLowerCase()
        .includes(val.toLowerCase())
    )
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedQuestions = filteredQuestions.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);

  return (
    <div className={styles.back} style={{ padding: "1rem" }}>
      <div className={styles.cont}>
        <h2 className={styles.title}>Validation de l’évaluation du salarié</h2>

        {employeInfo && (
          <div
            style={{
              fontSize: "0.9rem",
              color: "white",
              gap: "30px",
              display: "flex",
              marginBottom: "1rem",
              backgroundColor: "#015870ff",
              padding: "0.8rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p>
                <strong>Nom :</strong> {employeInfo.nom} {employeInfo.prenom}
              </p>
              <p>
                <strong>Matricule :</strong> {employeInfo.matriculesalarie}
              </p>
            </div>
            <div>
              <p>
                <strong>Direction :</strong> {employeInfo.direction}
              </p>
              <p>
                <strong>Service :</strong> {employeInfo.service}
              </p>
            </div>
            <div>
              <p>
                <strong>Qualification :</strong> {employeInfo.qualification}
              </p>
              <p>
                <strong>Date d`entrée :</strong>{" "}
                {new Date(employeInfo.dateentree).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p>
                <strong>Chef hiérarchique :</strong>{" "}
                {employeInfo.chefhierarchique}
              </p>
              <p>
                <strong>CodeFiche :</strong> {employeInfo.codeFiche}
              </p>
            </div>
          </div>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>Question</th>
                <th rowSpan={2}>Rubrique</th>
                <th rowSpan={2}>Niveau Requis</th>
                <th rowSpan={2}>Réponse du chef</th>
                <th rowSpan={2}>Révision RH</th>
              </tr>
              <tr>
                <th>
                  <Funnel size={12} />
                  <input
                    type="text"
                    placeholder="Filtrer question"
                    value={filters.texte ?? ""}
                    onChange={(e) =>
                      handleFilterChange("texte", e.target.value)
                    }
                    className={styles.inputField}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuestions.length > 0 ? (
                paginatedQuestions.map((q) => (
                  <tr key={q.id}>
                    <td>{q.texte}</td>
                    <td>{q.rubrique}</td>
                    <td>{getNiveauLabel(q.niveaurequis)}</td>
                    <td>{getNiveauLabel(q.reponse_chef)}</td>
                    <td>
                      <select
                        className={styles.select}
                        value={modifications[q.id] || ""}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                      >
                        <option value="">-- Choisir --</option>
                        {niveaux.map((niveau) => (
                          <option key={niveau.id} value={niveau.id.toString()}>
                            {niveau.niveau}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className={styles.noResults}>
                    Aucun résultat trouvé.
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
                    onClick={() => setCurrentPage(page)}
                    style={{
                      margin: "0 5px",
                      padding: "5px 10px",
                      backgroundColor:
                        page === currentPage ? "#0070f3" : "#eaeaea",
                      color: page === currentPage ? "#fff" : "#000",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className={styles.butt}
            style={{ marginTop: "20px", float: "right", marginBottom: "100px" }}
          >
            Valider le tout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValiderEvaluationRH;
