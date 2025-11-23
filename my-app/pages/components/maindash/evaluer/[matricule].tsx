"use client";
import styles from "../../../../styles/Home.module.css";
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Funnel } from "lucide-react";

type Question = {
  id: number;
  texte: string;
  rubrique: string;
  niveaurequis: string;
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

type ReponseNonTerminee = {
  question_id: number;
  notechef: number | null;
};

const EvaluerPage = () => {
  const params = useParams();
  const router = useRouter();
  const matricule = params?.matricule as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [rubriques, setRubriques] = useState<string[]>([]);
  const [selected, setSelected] = useState<{ [key: number]: string }>({});
  const [filters, setFilters] = useState<
    Partial<Record<keyof Question, string>>
  >({});
  const [errorMsg, setErrorMsg] = useState("");
  const [employeInfo, setEmployeInfo] = useState<Employe | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [nouveauQuestion, setNouveauQuestion] = useState({
    texte: "",
    niveaurequis: "",
    rubrique: "",
  });

  const fetchQuestions = useCallback(
    async (codeFiche: number) => {
      try {
        const [resStandard, resPersonnalisees] = await Promise.all([
          axios.get("http://localhost:8080/api/questions", {
            params: { codeFiche },
          }),
          axios.get("http://localhost:8080/api/questions_personnalisees", {
            params: { matricule },
          }),
        ]);
        setQuestions([...resPersonnalisees.data, ...resStandard.data]);
      } catch (err) {
        console.error("Erreur lors du chargement des questions", err);
      }
    },
    [matricule]
  );

  const fetchNiveaux = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:8080/Niveau");
      setNiveaux(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement des niveaux", err);
    }
  }, []);

  const fetchRubriques = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/rubriques");
      setRubriques(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement des rubriques", err);
    }
  }, []);

  const fetchExistingAnswers = useCallback(async () => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/reponses_non_terminees?matricule=${matricule}`
      );
      const saved: { [key: number]: string } = {};
      (res.data as ReponseNonTerminee[]).forEach((r) => {
        if (r.notechef !== null && r.notechef !== undefined) {
          saved[r.question_id] = r.notechef.toString();
        }
      });
      setSelected(saved);
    } catch (err) {
      console.error("Erreur lors du chargement des réponses sauvegardées", err);
    }
  }, [matricule]);

  const fetchEmployeInfo = useCallback(async () => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/employe/${matricule}`
      );
      setEmployeInfo(res.data);
      await fetchQuestions(res.data.codeFiche);
    } catch (err) {
      console.error("Erreur chargement employé", err);
    }
  }, [matricule, fetchQuestions]);

  useEffect(() => {
    if (!matricule) return;
    fetchNiveaux();
    fetchRubriques();
    fetchExistingAnswers();
    fetchEmployeInfo();
  }, [
    matricule,
    fetchNiveaux,
    fetchRubriques,
    fetchExistingAnswers,
    fetchEmployeInfo,
  ]);

  const handleSelect = (id: number, value: string) => {
    setSelected((prev) => ({ ...prev, [id]: value }));
  };

  const handleFilterChange = (key: keyof Question, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getNiveauLabel = (niveauId: string | number) => {
    const idStr = String(niveauId).trim();
    const niveau = niveaux.find((n) => String(n.id).trim() === idStr);
    return niveau ? niveau.niveau.trim() : idStr;
  };

  const filteredQuestions = questions.filter((q) =>
    Object.entries(filters).every(([key, val]) =>
      String(q[key as keyof Question])
        ?.toLowerCase()
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

  const saveToDatabase = async (status: "En cours" | "Terminé") => {
    const answered = Object.entries(selected).filter(([_, v]) => v !== "");
    if (status === "Terminé" && answered.length < filteredQuestions.length) {
      setErrorMsg(
        "Veuillez répondre à toutes les questions avant de soumettre."
      );
      return;
    }
    const evaluations = answered.map(([questionId, note]) => ({
      question_id: Number(questionId),
      note: Number(note),
      matricule_employe: matricule,
    }));
    try {
      await axios.post("http://localhost:8080/api/evaluation_answers", {
        evaluations,
        status,
      });
      if (status === "Terminé") {
        alert("Évaluation soumise avec succès !");
        router.back();
      } else {
        alert("Progression enregistrée !");
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement", err);
    }
  };

  const ajouterQuestion = async () => {
    if (!employeInfo) return;
    if (
      !nouveauQuestion.texte ||
      !nouveauQuestion.niveaurequis ||
      !nouveauQuestion.rubrique
    ) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    try {
      await axios.post("http://localhost:8080/api/question_personnalisee", {
        texte: nouveauQuestion.texte,
        niveaurequis: nouveauQuestion.niveaurequis,
        rubrique: nouveauQuestion.rubrique,
        matricule_employe: employeInfo.matriculesalarie,
      });
      setNouveauQuestion({ texte: "", niveaurequis: "", rubrique: "" });
      await fetchQuestions(employeInfo.codeFiche);
      alert("Question ajoutée avec succès !");
    } catch (err) {
      console.error("Erreur lors de l'ajout de la question", err);
    }
  };

  return (
    <div
      style={{ fontSize: "0.8rem", padding: "1rem", flexWrap: "wrap" }}
      className={styles.back}
    >
      <div className={styles.container}>
        <h2>Informations de l`employé</h2>
        {employeInfo && (
          <div
            style={{
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

        <label style={{ width: "90px", float: "right" }} htmlFor="">
          Afficher
          <select
            style={{ width: "90px", float: "right", border: "1px solid" }}
            className={styles.inputField}
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
        </label>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  Question <br />
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
                <th>
                  Rubrique <br />
                  <Funnel size={12} />
                  <input
                    type="text"
                    placeholder="Filtrer rubrique"
                    value={filters.rubrique ?? ""}
                    onChange={(e) =>
                      handleFilterChange("rubrique", e.target.value)
                    }
                    className={styles.inputField}
                  />
                </th>
                <th rowSpan={2}>Niveau requis</th>
                <th rowSpan={2}>Évaluation</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuestions.length > 0 ? (
                paginatedQuestions.map((q) => (
                  <tr key={q.id}>
                    <td>{q.texte}</td>
                    <td>{q.rubrique}</td>
                    <td>{getNiveauLabel(q.niveaurequis)}</td>
                    <td>
                      <select
                        className={styles.select}
                        value={selected[q.id] || ""}
                        onChange={(e) => handleSelect(q.id, e.target.value)}
                      >
                        <option value="">Choisir </option>
                        {niveaux.map((niveau) => (
                          <option key={niveau.id} value={niveau.id}>
                            {niveau.niveau.trim()}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={styles.noResults}>
                    Aucun résultat trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={styles.butt}
                    style={{ marginRight: "5px", backgroundColor: "#0067f8ff" }}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          )}

          {errorMsg && (
            <div style={{ color: "red", marginTop: "1rem" }}>{errorMsg}</div>
          )}

          <div style={{ marginTop: "1rem", textAlign: "right" }}>
            <button
              className={styles.butt}
              style={{
                marginRight: "1rem",
                backgroundColor: "rgba(3, 186, 49, 1)",
              }}
              onClick={() => saveToDatabase("En cours")}
            >
              Enregistrer
            </button>
            <button
              style={{ backgroundColor: "rgb(0, 108, 190)" }}
              className={styles.butt}
              onClick={() => saveToDatabase("Terminé")}
            >
              Soumettre l`évaluation
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: "2rem",
            borderTop: "1px solid black",
            paddingTop: "1rem",
          }}
        >
          <h3>Ajouter une question personnalisée</h3>
          <div
            style={{
              marginBottom: "200px",
              gap: "20px",
              paddingTop: "1rem",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <textarea
              placeholder="Texte de la question"
              value={nouveauQuestion.texte}
              onChange={(e) =>
                setNouveauQuestion({
                  ...nouveauQuestion,
                  texte: e.target.value,
                })
              }
              style={{ width: "150vh", padding: "0.5rem", height: "40px" }}
            />

            <select
              value={nouveauQuestion.rubrique}
              onChange={(e) =>
                setNouveauQuestion({
                  ...nouveauQuestion,
                  rubrique: e.target.value,
                })
              }
              style={{ padding: "0.5rem", width: "200px", height: "40px" }}
            >
              <option value=""> Choisir une rubrique </option>
              {rubriques.map((rubrique, index) => (
                <option key={index} value={rubrique}>
                  {rubrique}
                </option>
              ))}
            </select>

            <select
              value={nouveauQuestion.niveaurequis}
              onChange={(e) =>
                setNouveauQuestion({
                  ...nouveauQuestion,
                  niveaurequis: e.target.value,
                })
              }
              style={{ padding: "0.5rem", width: "250px", height: "40px" }}
            >
              <option value=""> Choisir un niveau requis </option>
              {niveaux.map((niveau) => (
                <option key={niveau.id} value={niveau.id}>
                  {niveau.niveau.trim()}
                </option>
              ))}
            </select>

            <button className={styles.butt} onClick={ajouterQuestion}>
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluerPage;
