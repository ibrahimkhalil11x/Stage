"use client";

import React, { useEffect, useState } from "react";
import styles from "../../../styles/Home.module.css";
import {
  Funnel,
  Pencil,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  List,
  ChevronRight,
  Download,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Chart from "chart.js/auto";

type Employe = {
  id?: number;
  matriculesalarie?: string;
  prenom?: string;
  nom?: string;
  direction?: string;
  service?: string;
  paye?: string;
  qualification?: string;
  dateentree?: string;
  chefhierarchique?: string;
  date_de_naissance?: string;
};

type Evaluation = {
  id: number;
  employer_id: number;
  evaluation_date: string;
  note: number;
  status: string;
  valide: boolean;
  compagnie_id: number;
};

type Reponse = {
  id: number;
  evaluation_id: number;
  question_id: number;
  notechef: number;
  noterh: number;
  question_texte?: string;
  rubrique?: string;
  code?: string;
};

type Question = {
  id?: number;
  texte?: string;
  rubrique?: string;
  code?: string;
  niveaurequis?: number;
  reponse_rh?: number;
};

// Extend jsPDF types to include lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

const headers: { key: keyof Employe; label: string }[] = [
  { key: "matriculesalarie", label: "Matricule" },
  { key: "prenom", label: "Prénom" },
  { key: "nom", label: "Nom" },
  { key: "direction", label: "Direction" },
  { key: "service", label: "Service" },
  { key: "paye", label: "Payé" },
  { key: "qualification", label: "Qualification" },
  { key: "dateentree", label: "Date Entrée" },
  { key: "chefhierarchique", label: "Chef hiérarchique" },
  { key: "date_de_naissance", label: "Date de naissance" },
];

const EmployeTable: React.FC = () => {
  const searchParams = useSearchParams();
  const matriculeFromUrl = searchParams?.get('matricule');
  
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [filters, setFilters] = useState<Partial<Record<keyof Employe, string>>>({});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedEmploye, setEditedEmploye] = useState<Employe | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Employe;
    direction: string;
  } | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation[]>>({});
  const [showEvaluations, setShowEvaluations] = useState<Record<number, boolean>>({});
  const [reponses, setReponses] = useState<Record<number, Reponse[]>>({});
  const [expandedEvaluations, setExpandedEvaluations] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [autoOpenEvaluations, setAutoOpenEvaluations] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<Record<number, boolean>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const response = await fetch("http://localhost:8080/employe");
        const data: unknown = await response.json();
        setEmployes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur lors de la récupération des données :", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (matriculeFromUrl && employes.length > 0) {
      const employe = employes.find(emp => emp.matriculesalarie === matriculeFromUrl);
      if (employe) {
        setAutoOpenEvaluations(matriculeFromUrl);
        handleEvalClickAuto(employe);
      }
    }
  }, [matriculeFromUrl, employes]);

  const fetchEvaluations = async (matricule: string): Promise<Evaluation[]> => {
    try {
      const response = await fetch(`http://localhost:8080/api/evaluationsemp/${matricule}`);
      const data: unknown = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Erreur lors de la récupération des évaluations :", err);
      return [];
    }
  };

  const fetchReponses = async (evaluationId: number): Promise<Reponse[]> => {
    try {
      const response = await fetch(`http://localhost:8080/api/reponses/${evaluationId}`);
      const data: unknown = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Erreur lors de la récupération des réponses :", err);
      return [];
    }
  };

  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  const exportToPDF = async (evaluation: Evaluation, employe: Employe): Promise<void> => {
    setPdfLoading(prev => ({ ...prev, [evaluation.id]: true }));
    
    try {
      let evaluationReponses = reponses[evaluation.id];
      if (!evaluationReponses) {
        evaluationReponses = await fetchReponses(evaluation.id);
        setReponses(prev => ({ ...prev, [evaluation.id]: evaluationReponses }));
      }

      const questions: Question[] = evaluationReponses.map(reponse => ({
        id: reponse.id,
        texte: reponse.question_texte,
        rubrique: reponse.rubrique,
        code: reponse.code,
        niveaurequis: reponse.notechef, 
        reponse_rh: reponse.noterh,
      }));

      const rubriqueStats: Record<string, { count: number; avgRequired: number; avgHR: number }> = {};
      
      questions.forEach(q => {
        if (!q.rubrique) return;
        if (!rubriqueStats[q.rubrique]) {
          rubriqueStats[q.rubrique] = { count: 0, avgRequired: 0, avgHR: 0 };
        }
        rubriqueStats[q.rubrique].count++;
        rubriqueStats[q.rubrique].avgRequired += toNumber(q.niveaurequis) || 0;
        rubriqueStats[q.rubrique].avgHR += toNumber(q.reponse_rh) || 0;
      });

      Object.keys(rubriqueStats).forEach(rub => {
        const stats = rubriqueStats[rub];
        stats.avgRequired = stats.avgRequired / stats.count;
        stats.avgHR = stats.avgHR / stats.count;
      });

      const employeInfo = employe;

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = 15;

      const formatNumber = (num: number | null): string => {
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

      const addEmployeeInfo = (): void => {
        doc.setFontSize(pdfStyles.title.size);
        doc.setTextColor(...pdfStyles.title.color);
        doc.setFont("helvetica", "bold");
        doc.text("Rapport d'Évaluation RH", pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 5;
        
        doc.setFontSize(pdfStyles.small.size);
        doc.setTextColor(...pdfStyles.small.color);
        doc.text(`Évaluation #${evaluation.id} du ${formatDate(evaluation.evaluation_date)}`, pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 10;

        doc.setFontSize(pdfStyles.subtitle.size);
        doc.setTextColor(...pdfStyles.title.color);
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
            ["Nom et Prénom", `${employeInfo.nom || ''} ${employeInfo.prenom || ''}`],
            ["Matricule", employeInfo.matriculesalarie || ''],
            ["Direction", employeInfo.direction || ''],
            ["Service", employeInfo.service || ''],
            ["Qualification", employeInfo.qualification || ''],
            [
              "Date d'entrée",
              employeInfo.dateentree ? new Date(employeInfo.dateentree).toLocaleDateString("fr-FR") : '',
            ],
            ["Chef hiérarchique", employeInfo.chefhierarchique || ''],
            ["Note globale", `${evaluation.note}/100`],
            ["Statut", evaluation.status],
          ],
          margin: { left: margin, right: margin },
        });
        yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 15;
      };

      const addEvaluationDetails = (): void => {
        doc.setFontSize(pdfStyles.subtitle.size);
        doc.setTextColor(...pdfStyles.title.color);
        doc.text("Détail des Évaluations", margin, yPosition);
        yPosition += 8;

        autoTable(doc, {
          startY: yPosition,
          head: [["Question", "Rubrique", "Note Chef", "Note RH"]],
          body: questions.map((q) => [
            q.texte ? String(q.texte) : "",
            q.rubrique ? String(q.rubrique) : "",
            formatNumber(toNumber(q.niveaurequis)),
            formatNumber(toNumber(q.reponse_rh)),
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
        yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 15;
      };

      const addStatistics = (): void => {
        const rubNames = Object.keys(rubriqueStats);
        if (rubNames.length === 0) return;

        const avgRequiredData = rubNames.map((r) => rubriqueStats[r].avgRequired);
        const avgHRData = rubNames.map((r) => rubriqueStats[r].avgHR);

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
              "Moy. Chef",
              "Moy. RH",
              "Écart (RH - Chef)",
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
        yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 15;

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
            ["Moyenne Note Chef", formatNumber(globalAvgRequired)],
            ["Moyenne Note RH", formatNumber(globalAvgHR)],
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
        yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 15;
      };

      const addCharts = async (): Promise<void> => {
        const rubNames = Object.keys(rubriqueStats);
        if (rubNames.length === 0) return;

        doc.addPage();
        yPosition = 15;

        const avgRequiredData = rubNames.map((r) => rubriqueStats[r].avgRequired);
        const avgHRData = rubNames.map((r) => rubriqueStats[r].avgHR);
        const allVals = [...avgRequiredData, ...avgHRData].filter(Number.isFinite);
        const yMax = allVals.length ? Math.max(5, Math.ceil(Math.max(...allVals))) : 5;

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
                label: "Note Chef",
                data: avgRequiredData,
                backgroundColor: "rgba(0, 153, 255, 1)",
              },
              {
                label: "Note RH",
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
                text: "Comparaison Note Chef vs Note RH",
              },
            },
          },
        });

        await new Promise<void>((res) => setTimeout(res, 500));
        doc.addImage(
          comparisonCanvas.toDataURL("image/png", 1.0),
          "PNG",
          margin,
          yPosition,
          pageWidth - margin * 2,
          80
        );
        yPosition += 90;

        doc.setFontSize(pdfStyles.subtitle.size);
        doc.setTextColor(...pdfStyles.title.color);
        doc.text("Écart RH - Note Chef", margin, yPosition);
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
                label: "Écart (RH - Chef)",
                data: rubNames.map((r) =>
                  Number(
                    formatNumber(
                      rubriqueStats[r].avgHR - rubriqueStats[r].avgRequired
                    )
                  )
                ),
                backgroundColor: rubNames.map((r) => {
                  const gap = rubriqueStats[r].avgHR - rubriqueStats[r].avgRequired;
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
                text: "Écart entre Note RH et Note Chef",
              },
            },
          },
        });

        await new Promise<void>((res) => setTimeout(res, 500));
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

      const addCompetencies = async (): Promise<void> => {
        doc.addPage();
        yPosition = 15;
        doc.setFontSize(pdfStyles.subtitle.size);
        doc.setTextColor(...pdfStyles.title.color);
        doc.text("Compétences par Code", margin, yPosition);
        yPosition += 10;

        const competencyGroups: { [key: string]: Question[] } = {};
        questions.forEach((question) => {
          if (!question.code) return;
          const type = question.code.replace(/\d+/g, "");
          if (!competencyGroups[type]) competencyGroups[type] = [];
          competencyGroups[type].push(question);
        });

        for (const [type, competencyQuestions] of Object.entries(competencyGroups)) {
          if (competencyQuestions.length < 3) continue;

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
              labels: competencyQuestions.map((q) => q.code),
              datasets: [
                {
                  label: "Niveau",
                  data: competencyQuestions.map((q) => toNumber(q.reponse_rh) || 0),
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
                    label: (context: any) => [
                      `Code: ${competencyQuestions[context.dataIndex].code}`,
                      `Question: ${competencyQuestions[context.dataIndex].texte}`,
                      `Score: ${context.raw}`,
                    ],
                  },
                },
              },
            },
          });

          await new Promise<void>((resolve) => setTimeout(resolve, 700));
          doc.addImage(
            canvas.toDataURL("image/png", 1.0),
            "PNG",
            margin,
            yPosition,
            pageWidth - margin * 2,
            100
          );
          yPosition += 110;

          autoTable(doc, {
            startY: yPosition,
            head: [["Code", "Question", "Score RH"]],
            body: competencyQuestions.map((q) => [
              q.code ?? "",
              q.texte ?? "",
              formatNumber(toNumber(q.reponse_rh)),
            ]),
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
              0: { cellWidth: 20 },
              1: { cellWidth: "auto" },
              2: { cellWidth: 20 },
            },
            margin: { left: margin, right: margin },
          });

          yPosition = doc.lastAutoTable?.finalY
            ? doc.lastAutoTable.finalY + 15
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

      const addFooter = (): void => {
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

      addEmployeeInfo();
      addEvaluationDetails();
      addStatistics();
      addFooter();
      await addCharts();
      await addCompetencies();

      doc.save(
        `Evaluation_${evaluation.id}_${employeInfo.matriculesalarie}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );

    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setPdfLoading(prev => ({ ...prev, [evaluation.id]: false }));
    }
  };

  const handleFilterChange = (key: keyof Employe, value: string): void => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredEmployes = matriculeFromUrl 
    ? employes.filter(emp => emp.matriculesalarie === matriculeFromUrl)
    : employes.filter((emp) =>
        headers.every(({ key }) =>
          (emp[key]?.toString().toLowerCase() ?? "").includes(
            filters[key]?.toLowerCase() ?? ""
          )
        )
      );

  const sortedEmployes = React.useMemo(() => {
    const sortableItems = [...filteredEmployes];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue && bValue) {
          if (aValue < bValue) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredEmployes, sortConfig]);

  const requestSort = (key: keyof Employe): void => {
    let direction = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedEmployes = sortedEmployes.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(sortedEmployes.length / itemsPerPage);

  const handlePageChange = (pageNumber: number): void => setCurrentPage(pageNumber);

  const handleEditClick = (index: number): void => {
    const absoluteIndex = indexOfFirstItem + index;
    setEditIndex(absoluteIndex);
    setEditedEmploye({ ...sortedEmployes[absoluteIndex] });
    setShowEvaluations({});
  };

  const handleEvalClick = async (index: number): Promise<void> => {
    const absoluteIndex = indexOfFirstItem + index;
    const employe = sortedEmployes[absoluteIndex];

    if (employe.matriculesalarie) {
      setLoading((prev) => ({ ...prev, [absoluteIndex]: true }));

      if (!evaluations[employe.matriculesalarie]) {
        const evalData = await fetchEvaluations(employe.matriculesalarie);
        setEvaluations((prev) => ({
          ...prev,
          [employe.matriculesalarie!]: evalData,
        }));
      }

      setShowEvaluations({ [absoluteIndex]: true });
      setLoading((prev) => ({ ...prev, [absoluteIndex]: false }));
    }
  };

  const handleEvalClickAuto = async (employe: Employe): Promise<void> => {
    if (employe.matriculesalarie) {
      if (!evaluations[employe.matriculesalarie]) {
        const evalData = await fetchEvaluations(employe.matriculesalarie);
        setEvaluations((prev) => ({
          ...prev,
          [employe.matriculesalarie!]: evalData,
        }));
      }

      const index = sortedEmployes.findIndex(emp => emp.matriculesalarie === employe.matriculesalarie);
      if (index !== -1) {
        setShowEvaluations({ [index]: true });
      }
    }
  };

  const toggleEvaluation = async (evaluationId: number): Promise<void> => {
    if (!reponses[evaluationId]) {
      setLoading((prev) => ({ ...prev, [evaluationId]: true }));
      const reponsesData = await fetchReponses(evaluationId);
      setReponses((prev) => ({
        ...prev,
        [evaluationId]: reponsesData,
      }));
      setLoading((prev) => ({ ...prev, [evaluationId]: false }));
    }

    setExpandedEvaluations((prev) => ({
      ...prev,
      [evaluationId]: !prev[evaluationId],
    }));
  };

  const handleInputChange = (key: keyof Employe, value: string): void => {
    if (editedEmploye) {
      setEditedEmploye({ ...editedEmploye, [key]: value });
    }
  };

  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    } catch (e) {
      console.error("Erreur de format de date:", e);
    }

    return "";
  };

  const handleSave = async (): Promise<void> => {
    if (editedEmploye) {
      try {
        const response = await fetch(
          `http://localhost:8080/api/employe/update`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editedEmploye),
          }
        );

        if (response.ok) {
          const updatedEmployes = employes.map((e) =>
            e.matriculesalarie === editedEmploye.matriculesalarie
              ? editedEmploye
              : e
          );
          setEmployes(updatedEmployes);
          setEditIndex(null);
          setEditedEmploye(null);
          alert("Mise à jour réussie !");
        } else {
          alert("Erreur lors de la mise à jour !");
        }
        window.location.reload();
      } catch (err) {
        console.error("Erreur lors de l'envoi au serveur :", err);
      }
    }
  };

  const handleCancel = (): void => {
    setEditIndex(null);
    setEditedEmploye(null);
    setShowEvaluations({});
    setExpandedEvaluations({});
    setAutoOpenEvaluations(null);
    
    if (matriculeFromUrl) {
      window.history.back();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <div className="back">
      <div className="main">
        <div className="container">
          <h2 className="header">
            {matriculeFromUrl ? `Détails de l'employé` : 'Liste des Employés'}
          </h2>

          {matriculeFromUrl && (
            <div style={{ marginBottom: '15px' }}>
              <button
                onClick={() => window.history.back()}
                className={styles.butt}
                style={{ backgroundColor: '#666' }}
              >
                ← Retour à la liste
              </button>
            </div>
          )}

          <div className="manage">
            <div className="container1" style={{ textAlign: "right" }}>
              <div
                className="box1"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                <label style={{ marginRight: "10px", fontSize: "14px" }}>
                  Éléments par page:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="selectStyle"
                  style={{ height: "30px", width: "80px" }}
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="tableWrapper">
            <table className={styles.table}>
              <thead>
                <tr>
                  {headers.map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => requestSort(key)}
                      style={{ cursor: "pointer" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{label}</span>
                        {sortConfig &&
                          sortConfig.key === key &&
                          (sortConfig.direction === "ascending" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginTop: "5px",
                        }}
                      >
                        <Funnel size={12} style={{ marginRight: "5px" }} />
                        <input
                          type="text"
                          placeholder={`Filtrer`}
                          value={filters[key] ?? ""}
                          onChange={(e) =>
                            handleFilterChange(key, e.target.value)
                          }
                          className={styles.inputField}
                          style={{ width: "80%" }}
                        />
                      </div>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployes.length > 0 ? (
                  paginatedEmployes.map((emp, index) => {
                    const absoluteIndex = indexOfFirstItem + index;
                    const isExpanded = editIndex === absoluteIndex;
                    const isEvalExpanded = showEvaluations[absoluteIndex];
                    const matricule = emp.matriculesalarie || "";
                    const employeEvaluations = evaluations[matricule] || [];

                    return (
                      <React.Fragment key={emp.matriculesalarie}>
                        <tr
                          className={
                            isExpanded || isEvalExpanded ? "selectedRow" : ""
                          }
                        >
                          {headers.map(({ key }) => (
                            <td key={key}>{emp[key] || "-"}</td>
                          ))}
                          <td
                            style={{
                              textAlign: "center",
                              display: "flex",
                              gap: "5px",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              className={styles.butt}
                              onClick={() => handleEditClick(index)}
                              title="Modifier"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "5px 10px",
                              }}
                            >
                              <Pencil size={14} />
                              Modifier
                            </button>
                            <button
                              className={styles.butt}
                              onClick={() => handleEvalClick(index)}
                              title="Voir les évaluations"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "5px 10px",
                                backgroundColor: isEvalExpanded
                                  ? "#2196F3"
                                  : "#16BB00",
                                color: "white",
                              }}
                            >
                              <List size={14} />
                              Évaluations
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={headers.length + 1}>
                              <div
                                className="form"
                                style={{
                                  padding: "15px",
                                }}
                              >
                                <h3
                                  style={{
                                    marginTop: "0",
                                    color: "#939393ff",
                                    borderBottom: "2px solid var(--main-color)",
                                    paddingBottom: "10px",
                                  }}
                                >
                                  Modifier les informations de l'employé
                                </h3>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fill, minmax(300px, 1fr))",
                                    gap: "16px",
                                    margin: "20px 0",
                                  }}
                                >
                                  {headers.map(({ key, label }) => (
                                    <div key={key} className="inputs">
                                      <label className="label">{label} :</label>
                                      {key === "dateentree" ||
                                      key === "date_de_naissance" ? (
                                        <input
                                          type="date"
                                          value={formatDateForInput(
                                            editedEmploye?.[key]
                                          )}
                                          onChange={(e) =>
                                            handleInputChange(
                                              key,
                                              e.target.value
                                            )
                                          }
                                          className="input"
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          value={editedEmploye?.[key] || ""}
                                          onChange={(e) =>
                                            handleInputChange(
                                              key,
                                              e.target.value
                                            )
                                          }
                                          className="input"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "10px",
                                    marginTop: "20px",
                                  }}
                                >
                                  <button
                                    onClick={handleSave}
                                    className={styles.butt}
                                  >
                                    <Save
                                      size={14}
                                      style={{ marginRight: "5px" }}
                                    />{" "}
                                    Enregistrer
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className={styles.butt}
                                    style={{ backgroundColor: "#f44336" }}
                                  >
                                    <X
                                      size={14}
                                      style={{ marginRight: "5px" }}
                                    />{" "}
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {isEvalExpanded && (
                          <tr>
                            <td colSpan={headers.length + 1}>
                              <div
                                className="form"
                                style={{
                                  padding: "10px",
                                }}
                              >
                                <h3
                                  style={{
                                    margin: "0 0 10px 0",
                                    color: "#939393ff",
                                    borderBottom: "2px solid #16BB00",
                                    paddingBottom: "8px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "16px",
                                  }}
                                >
                                  <List size={18} />
                                  Évaluations de {emp.prenom} {emp.nom}
                                </h3>

                                {loading[absoluteIndex] ? (
                                  <p style={{ padding: "15px", textAlign: "center", fontSize: "14px" }}>Chargement des évaluations...</p>
                                ) : employeEvaluations.length === 0 ? (
                                  <p style={{ padding: "15px", color: "#666", textAlign: "center", fontSize: "14px" }}>Aucune évaluation trouvée.</p>
                                ) : (
                                  <div style={{ marginTop: "12px" }}>
                                    {employeEvaluations.map((evaluation) => (
                                      <div key={evaluation.id} style={{ marginBottom: "12px", border: "1px solid #ddd", borderRadius: "4px" }}>
                                        <div
                                          style={{
                                            padding: "8px 10px",
                                            backgroundColor: "#f5f5f5",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            minHeight: "40px",
                                          }}
                                          onClick={() => toggleEvaluation(evaluation.id)}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            {expandedEvaluations[evaluation.id] ? (
                                              <ChevronDown size={14} />
                                            ) : (
                                              <ChevronRight size={14} />
                                            )}
                                            <div>
                                              <div style={{ fontWeight: "bold", fontSize: "13px" }}>Évaluation #{evaluation.id}</div>
                                              <div style={{ fontSize: "11px", color: "#666" }}>Date: {formatDate(evaluation.evaluation_date)}</div>
                                            </div>
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", fontSize: "11px" }}>
                                              <div><strong>Note:</strong> {evaluation.note}/100</div>
                                              <div><strong>Statut:</strong> {evaluation.status}</div>
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                exportToPDF(evaluation, emp);
                                              }}
                                              className={styles.butt}
                                              disabled={pdfLoading[evaluation.id]}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                padding: "4px 8px",
                                                fontSize: "10px",
                                                backgroundColor: "#4CAF50",
                                                color: "white",
                                                minWidth: "80px",
                                                opacity: pdfLoading[evaluation.id] ? 0.6 : 1,
                                              }}
                                              title="Exporter en PDF"
                                            >
                                              {pdfLoading[evaluation.id] ? (
                                                <>
                                                  <span style={{ fontSize: "8px" }}>...</span>
                                                  PDF
                                                </>
                                              ) : (
                                                <>
                                                  <Download size={12} />
                                                  PDF
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        {expandedEvaluations[evaluation.id] && (
                                          <div style={{ padding: "8px" }}>
                                            {loading[evaluation.id] ? (
                                              <p style={{ padding: "8px", textAlign: "center", fontSize: "13px" }}>Chargement des réponses...</p>
                                            ) : reponses[evaluation.id] && reponses[evaluation.id].length > 0 ? (
                                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                                <thead>
                                                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                                                    <th style={{ padding: "5px", textAlign: "left", border: "1px solid #ddd", fontWeight: "bold" }}>Question</th>
                                                    <th style={{ padding: "5px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold", width: "70px" }}>Note Chef</th>
                                                    <th style={{ padding: "5px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold", width: "70px" }}>Note RH</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {reponses[evaluation.id].map((reponse) => (
                                                    <tr key={reponse.id} style={{ borderBottom: "1px solid #eee" }}>
                                                      <td style={{ padding: "5px", border: "1px solid #ddd", verticalAlign: "top" }}>
                                                        <div>
                                                          <div style={{ fontWeight: "bold", fontSize: "10px" }}>{reponse.code} - {reponse.rubrique}</div>
                                                          <div style={{ fontSize: "10px", marginTop: "2px", lineHeight: "1.2" }}>{reponse.question_texte}</div>
                                                        </div>
                                                      </td>
                                                      <td style={{ padding: "5px", textAlign: "center", border: "1px solid #ddd", verticalAlign: "top" }}>
                                                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#2196F3" }}>
                                                          {reponse.notechef}/5
                                                        </div>
                                                      </td>
                                                      <td style={{ padding: "5px", textAlign: "center", border: "1px solid #ddd", verticalAlign: "top" }}>
                                                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#4CAF50" }}>
                                                          {reponse.noterh}/5
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            ) : (
                                              <p style={{ padding: "8px", color: "#666", textAlign: "center", fontSize: "13px" }}>Aucune réponse trouvée pour cette évaluation.</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    marginTop: "12px",
                                  }}
                                >
                                  <button
                                    onClick={handleCancel}
                                    className={styles.butt}
                                    style={{ 
                                      backgroundColor: "#f44336",
                                      padding: "5px 10px",
                                      fontSize: "11px"
                                    }}
                                  >
                                    <X
                                      size={11}
                                      style={{ marginRight: "3px" }}
                                    />{" "}
                                    Fermer
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={headers.length + 1}
                      style={{
                        textAlign: "center",
                        padding: "30px",
                        color: "#757575",
                        fontStyle: "italic",
                      }}
                    >
                      Aucun résultat trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "20px",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn"
                  style={{ padding: "8px 16px" }}
                >
                  Précédent
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`btn ${
                          pageNum === currentPage ? "selected" : ""
                        }`}
                        style={{
                          padding: "8px 12px",
                          color: pageNum === currentPage ? "white" : "black",
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn"
                  style={{ padding: "8px 16px" }}
                >
                  Suivant
                </button>

                <span
                  style={{
                    marginLeft: "15px",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  Page {currentPage} sur {totalPages} ({filteredEmployes.length} éléments)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        :root {
          --main-color: #2196f3;
        }

        .selectedRow {
          background-color: #e3f2fd !important;
        }

        .btn.selected {
          background-color: var(--main-color) !important;
          color: white !important;
        }

        .form {
          max-height: 60vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default EmployeTable;