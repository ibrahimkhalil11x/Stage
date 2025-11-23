"use client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import type { ChartConfiguration } from "chart.js";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import styles from "../../../../styles/Home.module.css";

Chart.register(ChartDataLabels);

type Question = {
  id: number;
  texte: string;
  reponse_chef: string;
  reponse_rh: string;
  niveaurequis: string;
  rubrique: string;
  code?: string;
};

type Niveau = {
  id: number | string;
  niveau: string;
};

type Employe = {
  codeFiche: number;
  code: string;
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
const ModifierEvaluationRH = () => {
  const router = useRouter();
  const params = useParams();
  const matricule = params?.matricule as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [modifications, setModifications] = useState<Record<number, string>>(
    {}
  );
  const [filters, setFilters] = useState<
    Partial<Record<"texte" | "reponse_chef" | "reponse_rh", string>>
  >({});
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [employeInfo, setEmployeInfo] = useState<Employe | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const toNumber = (v: string | number | undefined | null): number | null => {
    if (v === undefined || v === null) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
  };

  useEffect(() => {
    const fetchNiveaux = async () => {
      try {
        const res = await axios.get("http://localhost:8080/Niveau");
        setNiveaux(res.data);
      } catch (err) {
        console.error("Erreur lors du chargement des niveaux :", err);
      }
    };
    fetchNiveaux();
  }, []);

  useEffect(() => {
    if (!matricule) return;
    const fetchData = async () => {
      try {
        const [resQuestions, resEmploye] = await Promise.all([
          axios.get(
            `http://localhost:8080/api/evaluations/${matricule}/questions`
          ),
          axios.get(`http://localhost:8080/api/employe/${matricule}`),
        ]);
        setQuestions(resQuestions.data);

        const initialModifications: Record<number, string> = {};
        resQuestions.data.forEach((q: Question) => {
          initialModifications[q.id] = q.reponse_chef;
        });
        setModifications(initialModifications);
        setEmployeInfo(resEmploye.data);
      } catch (err) {
        console.error("Erreur lors du chargement des données :", err);
      }
    };
    fetchData();
  }, [matricule]);

  const getNiveauLabel = (niveauId: string | number) => {
    const idStr = String(niveauId).trim();
    const niveau = niveaux.find((n) => String(n.id).trim() === idStr);
    return niveau ? String(niveau.niveau).trim() : idStr;
  };

  const getLabelForScore = (score: string | undefined | null): string => {
    if (score === undefined || score === null) return "";
    const niveauObj = niveaux.find((n) => String(n.id) === String(score));
    return niveauObj ? niveauObj.niveau : String(score);
  };

  const handleFilterChange = (
    key: "texte" | "reponse_chef" | "reponse_rh",
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredQuestions = questions.filter((q) => {
    const texteFilter = filters.texte?.toLowerCase() || "";
    const reponseChefFilter = filters.reponse_chef?.toLowerCase() || "";
    const reponseRhFilter = filters.reponse_rh?.toLowerCase() || "";

    const texteMatch = q.texte.toLowerCase().includes(texteFilter);
    const chefMatch = getLabelForScore(q.reponse_chef)
      .toLowerCase()
      .includes(reponseChefFilter);
    const rhResponse = modifications[q.id];
    const rhMatch = rhResponse
      ? getLabelForScore(rhResponse).toLowerCase().includes(reponseRhFilter)
      : reponseRhFilter === "";

    return texteMatch && chefMatch && rhMatch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedQuestions = filteredQuestions.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);

  const rubriqueStats = useMemo(() => {
    const stats: Record<
      string,
      {
        count: number;
        avgRequired: number;
        avgManager: number;
        avgHR: number;
        gap: number;
      }
    > = {};

    questions.forEach((q) => {
      const key = q.rubrique;
      if (!stats[key]) {
        stats[key] = {
          count: 0,
          avgRequired: 0,
          avgManager: 0,
          avgHR: 0,
          gap: 0,
        };
      }
      const rq = toNumber(q.niveaurequis) ?? 0;
      const mc = toNumber(q.reponse_chef) ?? 0;
      const hr = toNumber(q.reponse_rh) ?? 0;
      stats[key].count++;
      stats[key].avgRequired += rq;
      stats[key].avgManager += mc;
      stats[key].avgHR += hr;
    });

    Object.keys(stats).forEach((k) => {
      const s = stats[k];
      s.avgRequired = s.count
        ? Number((s.avgRequired / s.count).toFixed(2))
        : 0;
      s.avgManager = s.count ? Number((s.avgManager / s.count).toFixed(2)) : 0;
      s.avgHR = s.count ? Number((s.avgHR / s.count).toFixed(2)) : 0;
      s.gap = Number((s.avgHR - s.avgManager).toFixed(2));
    });

    return stats;
  }, [questions]);

  const exportToPDF = async () => {
    if (!employeInfo) return;

    // 1. Initialization
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPosition = 15;

    const formatNumber = (num: number): string => {
      return num === null || num === undefined
        ? "N/A"
        : (Math.round(num * 100) / 100).toFixed(2);
    };

    const pdfStyles = {
      title: { size: 18, color: [0, 51, 102] as [number, number, number] },
      subtitle: { size: 14, color: [0, 51, 102] as [number, number, number] },
      body: { size: 10, color: [50, 50, 50] as [number, number, number] },
      small: { size: 8, color: [100, 100, 100] as [number, number, number] },
    };

    // 2. Employee Information Section
    const addEmployeeInfo = () => {
      doc.setFontSize(pdfStyles.title.size);
      doc.setTextColor(...pdfStyles.title.color);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport d'Évaluation RH", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      doc.setFontSize(pdfStyles.subtitle.size);
      doc.text("Informations du Salarié", margin, yPosition);
      yPosition += 8;

      autoTable(doc, {
        startY: yPosition,
        theme: "grid",
        styles: {
          fontSize: pdfStyles.body.size,
          textColor: pdfStyles.body.color,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [0, 102, 153],
          textColor: 255,
          fontStyle: "bold",
        },
        body: [
          ["Nom et Prénom", `${employeInfo.nom} ${employeInfo.prenom}`],
          ["Matricule", employeInfo.matriculesalarie],
          ["Direction", employeInfo.direction],
          ["Service", employeInfo.service],
          ["Qualification", employeInfo.qualification],
          [
            "Date d'entrée",
            new Date(employeInfo.dateentree).toLocaleDateString("fr-FR"),
          ],
          ["Chef hiérarchique", employeInfo.chefhierarchique],
          ["Code Fiche", String(employeInfo.codeFiche)],
        ],
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!
            .finalY + 15
        : yPosition + 15;
    };

    // 3. Evaluation Details Section
    const addEvaluationDetails = () => {
      doc.setFontSize(pdfStyles.subtitle.size);
      doc.setTextColor(...pdfStyles.title.color);
      doc.text("Détail des Évaluations ", margin, yPosition);
      yPosition += 8;

      autoTable(doc, {
        startY: yPosition,
        head: [["Question", "Rubrique", "Niveau requis", "Révision RH"]],
        body: questions.map((q) => [
          q.texte ? String(q.texte) : "",
          toNumber(q.rubrique) !== null
            ? String(toNumber(q.rubrique))
            : q.rubrique
            ? String(q.rubrique)
            : "",
          formatNumber(toNumber(q.niveaurequis) ?? 0) ?? "",
          formatNumber(toNumber(q.reponse_rh) ?? 0) ?? "",
        ]),
        styles: {
          fontSize: pdfStyles.body.size,
          textColor: pdfStyles.body.color,
          cellPadding: 3,
          valign: "middle",
        },
        headStyles: {
          fillColor: [0, 102, 153],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: "auto", halign: "left" },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 25, halign: "center" },
          3: { cellWidth: 25, halign: "center" },
        },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!
            .finalY + 15
        : yPosition + 15;
    };

    // 4. Statistics Section
    const addStatistics = () => {
      const rubNames = Object.keys(rubriqueStats);
      const avgRequiredData = rubNames.map((r) => rubriqueStats[r].avgRequired);
      const avgHRData = rubNames.map((r) => rubriqueStats[r].avgHR);

      // Rubric Statistics
      doc.setFontSize(pdfStyles.subtitle.size);
      doc.setTextColor(...pdfStyles.title.color);
      doc.text("Statistiques par Rubrique", margin, yPosition);
      yPosition += 8;

      autoTable(doc, {
        startY: yPosition,
        head: [
          [
            "Rubrique",
            "Questions",
            "Moy. Requis",
            "Moy. RH",
            "Écart (RH - Req)",
          ],
        ],
        body: rubNames.map((rub) => {
          const s = rubriqueStats[rub];
          const gap = s.avgHR - s.avgRequired;
          return [
            rub,
            String(s.count),
            formatNumber(s.avgRequired),
            formatNumber(s.avgHR),
            {
              content: formatNumber(gap),
              styles: {
                textColor: gap >= 0 ? [0, 128, 0] : [255, 0, 0],
                fontStyle: gap !== 0 ? "bold" : "normal",
              },
            },
          ];
        }),
        styles: {
          fontSize: pdfStyles.body.size,
          textColor: pdfStyles.body.color,
          cellPadding: 3,
          halign: "center",
        },
        headStyles: {
          fillColor: [0, 102, 153],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 50, halign: "left" },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
        },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!
            .finalY + 15
        : yPosition + 15;

      // Global Summary
      doc.setFontSize(pdfStyles.subtitle.size);
      doc.setTextColor(...pdfStyles.title.color);
      doc.text("Synthèse Globale", margin, yPosition);
      yPosition += 8;

      const globalAvgRequired = avgRequiredData.length
        ? avgRequiredData.reduce((a, b) => a + b, 0) / avgRequiredData.length
        : 0;
      const globalAvgHR = avgHRData.length
        ? avgHRData.reduce((a, b) => a + b, 0) / avgHRData.length
        : 0;
      const globalGap = globalAvgHR - globalAvgRequired;

      autoTable(doc, {
        startY: yPosition,
        body: [
          ["Moyenne Niveau Requis", formatNumber(globalAvgRequired)],
          ["Moyenne Évaluation RH", formatNumber(globalAvgHR)],
          [
            "Écart Global",
            {
              content: formatNumber(globalGap),
              styles: {
                textColor: globalGap >= 0 ? [0, 128, 0] : [255, 0, 0],
                fontStyle: "bold",
              },
            },
          ],
        ],
        styles: {
          fontSize: pdfStyles.body.size,
          textColor: pdfStyles.body.color,
          cellPadding: 5,
          halign: "left",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 70 },
          1: { cellWidth: 40, halign: "center" },
        },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!
            .finalY + 15
        : yPosition + 15;
    };

    // 5. Charts Section
    const addCharts = async () => {
      doc.addPage();
      yPosition = 15;

      const rubNames = Object.keys(rubriqueStats);
      const avgRequiredData = rubNames.map((r) => rubriqueStats[r].avgRequired);
      const avgHRData = rubNames.map((r) => rubriqueStats[r].avgHR);
      const allVals = [...avgRequiredData, ...avgHRData].filter(
        Number.isFinite
      );
      const yMax = allVals.length
        ? Math.max(5, Math.ceil(Math.max(...allVals)))
        : 5;

      // Comparison Chart
      doc.setFontSize(pdfStyles.subtitle.size);
      doc.setTextColor(...pdfStyles.title.color);
      doc.text("Visualisation des Résultats", margin, yPosition);
      yPosition += 8;

      const comparisonCanvas = document.createElement("canvas");
      comparisonCanvas.width = 900;
      comparisonCanvas.height = 420;
      new Chart(comparisonCanvas, {
        type: "bar",
        data: {
          labels: rubNames,
          datasets: [
            {
              label: "Niveau Requis",
              data: avgRequiredData,
              backgroundColor: "rgba(0, 153, 255, 1)",
            },
            {
              label: "Évaluation RH",
              data: avgHRData,
              backgroundColor: "rgba(252, 164, 0, 1)",
            },
          ],
        },
        options: {
          responsive: false,
          scales: {
            y: {
              beginAtZero: true,
              max: yMax,
              title: { display: true, text: "Score" },
            },
            x: { title: { display: true, text: "Rubriques" } },
          },
          plugins: {
            title: {
              display: true,
              text: "Comparaison Niveau Requis vs Évaluation RH",
            },
          },
        },
      });

      await new Promise((res) => setTimeout(res, 300));
      doc.addImage(
        comparisonCanvas.toDataURL("image/png", 1.0),
        "PNG",
        margin,
        yPosition,
        pageWidth - margin * 2,
        80
      );
      yPosition += 90;

      // Gap Chart
      doc.setFontSize(pdfStyles.subtitle.size);
      doc.setTextColor(...pdfStyles.title.color);
      doc.text("Écart RH - Niveau Requis", margin, yPosition);
      yPosition += 8;

      const gapCanvas = document.createElement("canvas");
      gapCanvas.width = 900;
      gapCanvas.height = 360;
      new Chart(gapCanvas, {
        type: "bar",
        data: {
          labels: rubNames,
          datasets: [
            {
              label: "Écart (RH - Niveau Requis)",
              data: rubNames.map((r) =>
                Number(
                  formatNumber(
                    rubriqueStats[r].avgHR - rubriqueStats[r].avgRequired
                  )
                )
              ),
              backgroundColor: rubNames.map((r) => {
                const gap =
                  rubriqueStats[r].avgHR - rubriqueStats[r].avgRequired;
                return gap >= 0
                  ? "rgba(59, 210, 109, 0.81)"
                  : "rgba(255, 0, 55, 1)";
              }),
            },
          ],
        },
        options: {
          responsive: false,
          scales: {
            y: { beginAtZero: true, title: { display: true, text: "Écart" } },
            x: { title: { display: true, text: "Rubriques" } },
          },
          plugins: {
            title: {
              display: true,
              text: "Écart entre Évaluation RH et Niveau Requis",
            },
          },
        },
      });

      await new Promise((res) => setTimeout(res, 300));
      doc.addImage(
        gapCanvas.toDataURL("image/png", 1.0),
        "PNG",
        margin,
        yPosition,
        pageWidth - margin * 2,
        70
      );
      yPosition += 90;
    };

    // 6. Competencies Section
    const addCompetencies = async () => {
      doc.addPage();
      yPosition = 15;
      doc.setFontSize(pdfStyles.subtitle.size);
      doc.setTextColor(...pdfStyles.title.color);
      doc.text("Compétences par Code", margin, yPosition);
      yPosition += 10;

      // Group questions by competency type
      const competencyGroups: { [key: string]: Question[] } = {};
      questions.forEach((question) => {
        if (!question.code) return;
        const type = question.code.replace(/\d+/g, "");
        if (!competencyGroups[type]) competencyGroups[type] = [];
        competencyGroups[type].push(question);
      });

      // Add radar chart for each competency type
      for (const [type, questions] of Object.entries(competencyGroups)) {
        if (questions.length < 3) continue;

        doc.setFontSize(pdfStyles.subtitle.size);
        doc.setTextColor(...pdfStyles.title.color);
        doc.text(`Compétences ${type}`, margin, yPosition);
        yPosition += 8;

        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 400;
        const hue = Math.floor(Math.random() * 360);

        new Chart(canvas, {
          type: "radar",
          data: {
            labels: questions.map((q) => q.code),
            datasets: [
              {
                label: "Niveau",
                data: questions.map((q) => toNumber(q.reponse_rh) || 0),
                backgroundColor: `hsla(${hue}, 70%, 50%, 0.4)`,
                borderColor: `hsl(${hue}, 70%, 40%)`,
                pointBackgroundColor: `hsl(${hue}, 70%, 40%)`,
                pointBorderColor: "#fff",
                pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: false,
            scales: {
              r: {
                angleLines: { display: true },
                suggestedMin: 0,
                suggestedMax: 5,
                ticks: { stepSize: 1 },
              },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => [
                    `Code: ${questions[context.dataIndex].code}`,
                    `Question: ${questions[context.dataIndex].texte}`,
                    `Score: ${context.raw}`,
                  ],
                },
              },
            },
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
        doc.addImage(
          canvas.toDataURL("image/png", 1.0),
          "PNG",
          margin,
          yPosition,
          pageWidth - margin * 2,
          100
        );
        yPosition += 110;

        // Add questions table
        autoTable(doc, {
          startY: yPosition,
          head: [["Code", "Question", "Score RH"]],
          body: questions.map((q) => [
            q.code ?? "", // <- fallback for undefined
            q.texte ?? "",
            formatNumber(toNumber(q.reponse_rh) ?? 0),
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: "auto" },
            2: { cellWidth: 20 },
          },
          margin: { left: margin, right: margin },
        });

        yPosition = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
          .lastAutoTable?.finalY
          ? (doc as jsPDF & { lastAutoTable?: { finalY: number } })
              .lastAutoTable!.finalY + 15
          : yPosition + 15;

        if (yPosition > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          yPosition = 15;
        }
      }

      if (Object.keys(competencyGroups).length === 0) {
        doc.setFontSize(pdfStyles.body.size);
        doc.setTextColor(150, 50, 50);
        doc.text("Aucune donnée de compétence disponible", margin, yPosition);
      }
    };

    // 7. Footer
    const addFooter = () => {
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Généré le ${new Date().toLocaleDateString("fr-FR")} - ${
          employeInfo.nom
        } ${employeInfo.prenom}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
    };

    try {
      addEmployeeInfo();
      addEvaluationDetails();
      addStatistics();
      addFooter();
      await addCharts();
      await addCompetencies();

      doc.save(
        `Evaluation_RH_${employeInfo.matriculesalarie}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };
  return (
    <div className={styles.back} style={{ padding: "1rem" }}>
      <div className={styles.cont}>
        <h2 className={styles.title}>Consulter l’évaluation du salarié</h2>

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

        <div style={{ marginBottom: "1rem" }}>
          <span style={{ float: "right" }}>
            <label
              htmlFor="pagination-select"
              style={{ marginRight: "0.5rem" }}
            >
              Afficher
            </label>
            <select
              id="pagination-select"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={styles.inputField}
            >
              {[5, 10, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>
                  Question
                  <br />
                  <input
                    type="text"
                    placeholder="Filtrer question"
                    value={filters.texte ?? ""}
                    onChange={(e) =>
                      handleFilterChange("texte", e.target.value)
                    }
                    className={styles.inputField}
                    style={{ marginTop: 5, width: "90%" }}
                  />
                </th>
                <th>Rubrique</th>
                <th rowSpan={2}>Niveau requis</th>
                <th>
                  Réponse du chef
                  <br />
                  <input
                    type="text"
                    placeholder="Filtrer réponse chef"
                    value={filters.reponse_chef ?? ""}
                    onChange={(e) =>
                      handleFilterChange("reponse_chef", e.target.value)
                    }
                    className={styles.inputField}
                    style={{ marginTop: 5, width: "90%" }}
                  />
                </th>
                <th>
                  Révision RH
                  <br />
                  <input
                    type="text"
                    placeholder="Filtrer révision RH"
                    value={filters.reponse_rh ?? ""}
                    onChange={(e) =>
                      handleFilterChange("reponse_rh", e.target.value)
                    }
                    className={styles.inputField}
                    style={{ marginTop: 5, width: "90%" }}
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
                    <td>{getLabelForScore(q.reponse_chef)}</td>
                    <td>{getLabelForScore(q.reponse_rh)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.noResults}>
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
        </div>

        <button
          onClick={() => router.back()}
          className={styles.butt}
          style={{ marginTop: "20px" }}
        >
          Retour
        </button>
        <button
          onClick={exportToPDF}
          className={styles.butt}
          style={{ marginTop: "10px", backgroundColor: "darkred" }}
        >
          Exporter en PDF
        </button>
      </div>
    </div>
  );
};

export default ModifierEvaluationRH;
