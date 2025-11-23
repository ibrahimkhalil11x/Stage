"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "../../../styles/Home.module.css";
import {
  Funnel,
  Pencil,
  Save,
  X,
  Trash2,
  ChevronRight,
  ChevronDown,
  Copy,
  Plus,

} from "lucide-react";

type Question = {
  id: number;
  codefiche: number;
  code: string;
  profil: string;
  rubrique: string;
  texte: string;
  niveaurequis: string;
  sousprocess: string;
  est_active: boolean;
  created_at: string;
};

const headers: { key: keyof Question; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "codefiche", label: "Codefiche" },
  { key: "code", label: "Code" },
  { key: "profil", label: "Profil" },
  { key: "rubrique", label: "Rubrique" },
  { key: "texte", label: "Texte" },
  { key: "niveaurequis", label: "Niveau Requis" },
  { key: "sousprocess", label: "Sous-process" },
  { key: "est_active", label: "Active" },
  { key: "created_at", label: "Créé le" },
];

const Ajouter = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filters, setFilters] = useState<
    Partial<Record<keyof Question, string>>
  >({});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<Partial<Question>>({});
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    codefiche: 0,
    code: "",
    profil: "",
    rubrique: "",
    texte: "",
    niveaurequis: "",
    sousprocess: "",
    est_active: true,
  });
  const [showNewForm, setShowNewForm] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [pageMap, setPageMap] = useState<Record<number, number>>({});
  const [sourceFiche, setSourceFiche] = useState<number>(0);
  const [newFicheCode, setNewFicheCode] = useState<number>(0);
  const [showDuplicateSection, setShowDuplicateSection] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/lesquestions");
      setQuestions(res.data);
      const initialGroupState: Record<number, boolean> = {};
      res.data.forEach((q: Question) => {
        initialGroupState[q.codefiche] = false;
      });
      setOpenGroups(initialGroupState);
    } catch (err) {
      console.error("Erreur lors du chargement:", err);
    }
  };

  const handleDuplicateFiche = async () => {
    if (!sourceFiche || !newFicheCode) {
      alert("Veuillez remplir les deux champs de duplication.");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:8080/api/dupliquer-fiche",
        {
          sourceCodefiche: sourceFiche,
          newCodefiche: newFicheCode,
        }
      );

      alert(res.data.message || "Fiche dupliquée avec succès !");
      fetchQuestions();
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { status?: number } }).response?.status === "number" &&
        (err as { response: { status: number } }).response.status === 409
      ) {
        alert("Ce codefiche existe déjà. Veuillez en choisir un autre.");
      } else {
        console.error("Erreur lors de la duplication:", err);
        alert("Erreur lors de la duplication de la fiche.");
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Supprimer cette question ?")) {
      try {
        await axios.delete(`http://localhost:8080/api/questions/${id}`);
        fetchQuestions();
      } catch (err) {
        console.error("Erreur lors de la suppression :", err);
        alert("Erreur lors de la suppression.");
      }
    }
  };

  const handleDeleteAllQuestions = async (codefiche: number) => {
    if (confirm(`Supprimer toutes les questions du codefiche ${codefiche} ?`)) {
      try {
        await axios.delete(
          `http://localhost:8080/api/questions/fiche/${codefiche}`
        );
        fetchQuestions();
        alert(
          `Toutes les questions du codefiche ${codefiche} ont été supprimées.`
        );
      } catch (err) {
        console.error("Erreur lors de la suppression :", err);
        alert("Erreur lors de la suppression des questions.");
      }
    }
  };

  const handleEditClick = (q: Question) => {
    setEditIndex(q.id);
    setEditedQuestion({ ...q });
  };

  const handleInputChange = (key: keyof Question, value: string) => {
    setEditedQuestion((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!editedQuestion.id) return;
    try {
      await axios.put(
        `http://localhost:8080/api/questions/${editedQuestion.id}`,
        editedQuestion
      );
      setEditIndex(null);
      setEditedQuestion({});
      fetchQuestions();
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleNewChange = (key: keyof Question, value: string | boolean) => {
    if (key === "codefiche" && typeof value === "string") {
      const parsed = parseInt(value);
      if (!isNaN(parsed)) {
        setNewQuestion((prev) => ({ ...prev, [key]: parsed }));
      }
    } else {
      setNewQuestion((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.codefiche || !newQuestion.code || !newQuestion.texte) {
      alert("Veuillez remplir au minimum les champs Codefiche, Code et Texte.");
      return;
    }
    try {
      await axios.post("http://localhost:8080/api/questions", newQuestion);
      setNewQuestion({
        codefiche: 0,
        code: "",
        profil: "",
        rubrique: "",
        texte: "",
        niveaurequis: "",
        sousprocess: "",
        est_active: true,
      });
      setShowNewForm(false);
      fetchQuestions();
    } catch (err) {
      console.error("Erreur lors de l'ajout:", err);
      alert("Erreur lors de l'ajout.");
    }
  };

  const handleFilterChange = (key: keyof Question, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleGroup = (codefiche: number) => {
    setOpenGroups((prev) => ({ ...prev, [codefiche]: !prev[codefiche] }));
  };

  const handlePageChange = (codefiche: number, page: number) => {
    setPageMap((prev) => ({ ...prev, [codefiche]: page }));
  };

  const groupedByCodefiche = questions.reduce((acc, q) => {
    if (!acc[q.codefiche]) acc[q.codefiche] = [];
    acc[q.codefiche].push(q);
    return acc;
  }, {} as Record<number, Question[]>);

  return (
    <div className={styles.container} style={{ padding: "15px", maxWidth: "100%" }}>
      <h2 className={styles.title} style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: "600" }}>
        Gestion des Questions par Fiche d`Évaluation
      </h2>

    
      <div style={{ 
        marginBottom: "15px", 
        padding: "12px", 
        borderRadius: "8px", 
        backgroundColor: "#f8f9fa",
        border: "1px solid #e9ecef"
      }}>
        <h3 
          style={{ 
            margin: "0 0 10px 0", 
            fontSize: "1rem", 
            display: "flex", 
            alignItems: "center", 
            gap: "6px",
            fontWeight: "500",
            cursor: "pointer"
          }}
          onClick={() => setShowDuplicateSection(!showDuplicateSection)}
        >
          {showDuplicateSection ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Copy size={18} /> Duplication de Fiche
        </h3>
        
        {showDuplicateSection && (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ minWidth: "150px" }}>
              <label style={{ fontSize: "0.8rem", marginBottom: "3px", display: "block", fontWeight: "500" }}>Codefiche source:</label>
              <input
                type="number"
                value={sourceFiche || ""}
                onChange={(e) => setSourceFiche(parseInt(e.target.value) || 0)}
                style={{ 
                  width: "100%", 
                  padding: "6px 8px", 
                  border: "1px solid #ced4da", 
                  borderRadius: "4px",
                  fontSize: "0.9rem"
                }}
                placeholder="Codefiche source"
              />
            </div>
            <div style={{ minWidth: "150px" }}>
              <label style={{ fontSize: "0.8rem", marginBottom: "3px", display: "block", fontWeight: "500" }}>Nouveau codefiche:</label>
              <input
                type="number"
                value={newFicheCode || ""}
                onChange={(e) => setNewFicheCode(parseInt(e.target.value) || 0)}
                style={{ 
                  width: "100%", 
                  padding: "6px 8px", 
                  border: "1px solid #ced4da", 
                  borderRadius: "4px",
                  fontSize: "0.9rem"
                }}
                placeholder="Nouveau codefiche"
              />
            </div>
            <div>
              <button 
                onClick={handleDuplicateFiche}
                style={{ 
                  padding: "6px 12px", 
                  backgroundColor: "#0d6efd", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Copy size={14} /> Dupliquer
              </button>
            </div>
          </div>
        )}
      </div>

 
      <div style={{ 
        marginBottom: "15px", 
        padding: "12px", 
        borderRadius: "8px", 
        backgroundColor: "#f8f9fa",
        border: "1px solid #e9ecef"
      }}>
        <h3 
          style={{ 
            margin: "0 0 10px 0", 
            fontSize: "1rem", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: "6px",
            fontWeight: "500"
          }}
          onClick={() => setShowNewForm(!showNewForm)}
        >
          {showNewForm ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Plus size={18} /> Ajouter une nouvelle question
        </h3>

        {showNewForm && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "10px" }}>
            {[
              { key: "codefiche", label: "Codefiche", type: "number" },
              { key: "code", label: "Code", type: "text" },
              { key: "profil", label: "Profil", type: "text" },
              { key: "rubrique", label: "Rubrique", type: "text" },
              { key: "texte", label: "Texte", type: "text" },
              { key: "niveaurequis", label: "Niveau Requis", type: "text" },
              { key: "sousprocess", label: "Sous-process", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label style={{ fontSize: "0.8rem", marginBottom: "3px", display: "block", fontWeight: "500" }}>{label}:</label>
                <input
                  type={type}
                  value={newQuestion[key as keyof Question]?.toString() || ""}
                  onChange={(e) => handleNewChange(key as keyof Question, e.target.value)}
                  style={{ 
                    width: "100%", 
                    padding: "6px 8px", 
                    border: "1px solid #ced4da", 
                    borderRadius: "4px",
                    fontSize: "0.9rem"
                  }}
                  placeholder={label}
                />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button 
                onClick={handleAddQuestion}
                style={{ 
                  padding: "6px 12px", 
                  backgroundColor: "#198754", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>
        )}
      </div>


      {Object.entries(groupedByCodefiche)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([codeficheStr, questionsGroup]) => {
          const codefiche = parseInt(codeficheStr);
          const isOpen = openGroups[codefiche] ?? false;
          const filtered = questionsGroup.filter((q) =>
            headers.every(({ key }) =>
              (q[key]?.toString().toLowerCase() ?? "").includes(
                filters[key]?.toLowerCase() ?? ""
              )
            )
          );

          const currentPage = pageMap[codefiche] ?? 1;
          const startIndex = (currentPage - 1) * itemsPerPage;
          const paginated = filtered.slice(
            startIndex,
            startIndex + itemsPerPage
          );
          const totalPages = Math.ceil(filtered.length / itemsPerPage);

          return (
            <div key={codefiche} style={{ marginBottom: "12px" }}>
              <div
                onClick={() => toggleGroup(codefiche)}
                style={{
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #0052aaff 0%, #2575fc 100%)",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: isOpen ? "10px" : "0",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem" }}>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <strong>Fiche {codefiche}</strong> 
                  <span style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                    ({filtered.length} question{filtered.length !== 1 ? 's' : ''})
                  </span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAllQuestions(codefiche);
                  }}
                  style={{ 
                    padding: "4px 8px", 
                    backgroundColor: "#dc3545", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px"
                  }}
                >
                  <Trash2 size={12} /> Supprimer toutes
                </button>
              </div>

              {isOpen && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead className={styles.thead}>
                      <tr>
                        {headers.map(({ label }) => (
                          <th key={label}>{label}</th>
                        ))}
                        <th>Actions</th>
                      </tr>
                      <tr>
                        {headers.map(({ key, label }) => (
                          <th key={key}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                              <Funnel size={14} />
                              <input
                                type="text"
                                placeholder={`Filtrer ${label.toLowerCase()}`}
                                value={filters[key] ?? ""}
                                onChange={(e) => handleFilterChange(key, e.target.value)}
                                className={styles.inputField}
                                style={{width: '100%', padding: '4px 6px', fontSize: '0.8rem'}}
                              />
                            </div>
                          </th>
                        ))}
                        <th>
                          <select
                            className={styles.inputField}
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            style={{padding: '4px 6px', fontSize: '0.8rem'}}
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length > 0 ? (
                        paginated.map((q) => (
                          <tr key={q.id}>
                            {headers.map(({ key }) => (
                              <td key={key}>
                                {editIndex === q.id &&
                                key !== "id" &&
                                key !== "created_at" &&
                                key !== "est_active" ? (
                                  <input
                                    type="text"
                                    value={editedQuestion[key]?.toString() ?? ""}
                                    onChange={(e) =>
                                      handleInputChange(key, e.target.value)
                                    }
                                    className={styles.inputField}
                                    style={{width: '100%', padding: '4px 6px', fontSize: '0.8rem'}}
                                  />
                                ) : key === "est_active" ? (
                                  <span style={{ 
                                    color: q.est_active ? "#198754" : "#dc3545",
                                    fontWeight: "500"
                                  }}>
                                    {q.est_active ? "✓ Actif" : "✗ Inactif"}
                                  </span>
                                ) : key === "created_at" ? (
                                  new Date(q.created_at).toLocaleDateString('fr-FR')
                                ) : key === "texte" ? (
                                  <div style={{ 
                                    maxWidth: "250px", 
                                    overflow: "hidden", 
                                    textOverflow: "ellipsis", 
                                    lineHeight: "1.4",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical"
                                  }}>
                                    {q[key]}
                                  </div>
                                ) : (
                                  q[key]
                                )}
                              </td>
                            ))}
                            <td style={{ width: "80px" }}>
                              {editIndex === q.id ? (
                                <>
                                  <button 
                                    onClick={handleSave} 
                                    title="Enregistrer"
                                    style={{backgroundColor: "white", borderColor: "white"}}
                                  >
                                    <Save size={12} width={30} />
                                  </button>
                                  <button 
                                    onClick={() => setEditIndex(null)} 
                                    title="Annuler"
                                    style={{backgroundColor: "white", borderColor: "white"}}
                                  >
                                    <X size={12} width={30} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    style={{backgroundColor: "white", borderColor: "white"}}
                                    onClick={() => handleEditClick(q)}
                                    title="Modifier"
                                  >
                                    <Pencil size={12} width={30} />
                                  </button>
                                  <button
                                    style={{backgroundColor: "white", borderColor: "white"}}
                                    onClick={() => handleDelete(q.id)}
                                    title="Supprimer"
                                  >
                                    <Trash2 size={12} width={30} color="red" />
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
                          onClick={() => handlePageChange(codefiche, page)}
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
              )}
            </div>
          );
        }
      )}
    </div>
  );
};

export default Ajouter;