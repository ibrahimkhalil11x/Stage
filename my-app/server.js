const express = require("express");
const pg = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 8080;
const DATABASE = process.env.DATABASE;
const client = new pg.Client(DATABASE);

client.connect().then(() => {
  app.listen(PORT, () => {});
});

app.post("/login", async (req, res) => {
  try {
    const { matricule, password } = req.body;
    const sqlget = "SELECT * FROM users WHERE matricule = $1 AND password = $2";
    const result = await client.query(sqlget, [matricule, password]);

    if (result.rows.length === 0) {
      return res.json({ message: "ID ou mot de passe incorrect" });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      { matricule: user.matricule, role: user.role },
      process.env.SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      token,
      matricule: user.matricule,
      nom: user.name || "",

      role: user.role,
    });
  } catch (error) {
    console.error("Erreur lors du login:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/api/chef/:matricule", async (req, res) => {
  const { matricule } = req.params;
  const { name, role, email, password } = req.body;

  try {
    const updateSql = `
      UPDATE users
      SET name = $1, role = $2, email = $3, password = $4
      WHERE matricule = $5
    `;

    const result = await client.query(updateSql, [
      name,
      role,
      email,
      password,
      matricule,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ message: "Utilisateur mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/api/chef", async (req, res) => {
  try {
    const sql =
      "SELECT matricule, name, password, role, email FROM users WHERE role != 'admin'";
    const result = await client.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur lors de la récupération des utilisateurs :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.delete("/api/chef/:matricule", async (req, res) => {
  const { matricule } = req.params;

  try {
    const result = await client.query(
      "DELETE FROM users WHERE matricule = $1",
      [matricule]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Chef non trouvé" });
    }

    res.json({ message: "Chef supprimé avec succès" });
  } catch (err) {
    console.error("Erreur lors de la suppression :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/adduser", async (req, res) => {
  const { matricule, name, password, email, role } = req.body;

  if (!matricule || !name || !password || !email || !role) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  try {
    const insertSql = `
      INSERT INTO users (matricule, name, password, email, role)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await client.query(insertSql, [matricule, name, password, email, role]);
    res.status(201).json({ message: "Utilisateur ajouté avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'ajout :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/api/employe/:matricule", async (req, res) => {
  const { matricule } = req.params;

  try {
    const result = await client.query(
      "SELECT * FROM employe WHERE matriculesalarie = $1 LIMIT 1",
      [matricule]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employé non trouvé" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur lors du chargement de l'employé:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/employe", async (req, res) => {
  try {
    const sql = `
      SELECT 
        matriculesalarie,
        prenom,
        nom,
        direction,
        service,
        paye,
        sa_compteurnumero,
        miseensommeil,
        datesortieposte,
        qualification,
        dateentree,
        chefhierarchique,
        TO_CHAR(date_de_naissance, 'DD/MM/YYYY') AS date_de_naissance
      FROM employe
    `;
    const result = await client.query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des employés :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/employes/chef/:matriculeChef", async (req, res) => {
  const { matriculeChef } = req.params;

  try {
    const query = `
      SELECT e.matriculesalarie, e.nom, e.prenom
      FROM employe e
      WHERE e.chefhierarchique = $1
        AND NOT EXISTS (
          SELECT 1
          FROM evaluation_employer ev
          JOIN compagnie c ON ev.compagnie_id = c.id
          WHERE ev.employer_id = CAST(e.matriculesalarie AS INTEGER)
            AND ev.status = 'Terminé'
            AND c.status = true
        )
    `;
    const result = await client.query(query, [matriculeChef]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/api/employe/update", async (req, res) => {
  const {
    matriculesalarie,
    prenom,
    nom,
    direction,
    service,
    paye,
    sa_compteurnumero,
    miseensommeil,
    datesortieposte,
    qualification,
    dateentree,
    chefhierarchique,
    date_de_naissance,
  } = req.body;

  const updateSql = `
  UPDATE Employe 
  SET 
    prenom = $1,
    nom = $2,
    direction = $3,
    service = $4,
    paye = $5,
    sa_compteurnumero = $6,
    miseensommeil = $7,
    datesortieposte = $8,
    qualification = $9,
    dateentree = $10,
    chefhierarchique = $11,
    date_de_naissance = $12
  WHERE matriculesalarie = $13
`;

  const values = [
    prenom,
    nom,
    direction,
    service,
    paye,
    sa_compteurnumero,
    miseensommeil,
    datesortieposte,
    qualification,
    dateentree,
    chefhierarchique,
    date_de_naissance,
    matriculesalarie,
  ];
  try {
    const result = await client.query(updateSql, values);

    res.json({ message: "Employé mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour :", error.message);
    res.status(500).json({ message: "Erreur lors de la mise à jour !" });
  }
});

app.delete("/api/employe/:matriculesalarie", async (req, res) => {
  const { matriculesalarie } = req.params;

  const deleteSql = `DELETE FROM employe WHERE matriculesalarie = $1`;

  try {
    const result = await client.query(deleteSql, [matriculesalarie]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Aucun employé trouvé avec ce matricule." });
    }

    res.json({ message: "Employé supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression :", error.message);
    res
      .status(500)
      .json({ message: "Erreur lors de la suppression de l'employé." });
  }
});

app.get("/api/questions", async (req, res) => {
  const { codeFiche } = req.query;

  if (!codeFiche) {
    return res.status(400).json({ error: "codeFiche est requis" });
  }

  try {
    const result = await client.query(
      "SELECT * FROM question WHERE est_active = true AND codefiche = $1 ORDER BY created_at ASC",
      [codeFiche]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Erreur lors du fetch des questions:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/Ajouter", async (req, res) => {
  try {
    const {
      CodeFiche,
      Code,
      Profil,
      Rubrique,
      Text,
      NiveauRequis,
      SousProcess,
      Est_active,
    } = req.body;

    const result = await client.query(
      "INSERT INTO question ( codefiche,code,profil,rubrique,texte,niveaurequis,sousprocess,est_active) VALUES ($1, $2, $3, $4, $5, $6,$7,$8) ",
      [
        CodeFiche,
        Code,
        Profil,
        Rubrique,
        Text,
        NiveauRequis,
        SousProcess,
        Est_active,
      ]
    );

    res.status(201).json({ message: "Question enregistrée avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de question:", error);

    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement" });
  }
});

app.post("/api/compagnie", async (req, res) => {
  const { date_debut } = req.body;

  if (!date_debut) {
    return res.status(400).json({ message: "La date de début est requise." });
  }

  try {
    const checkQuery = "SELECT * FROM compagnie WHERE status = true";
    const checkResult = await client.query(checkQuery);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        message:
          "Une compagnie active existe déjà. Veuillez la désactiver avant d’en ajouter une nouvelle.",
      });
    }

    const insertSql =
      "INSERT INTO compagnie (date_debut, status) VALUES ($1, true)";
    await client.query(insertSql, [date_debut]);

    res.status(201).json({ message: "Compagnie enregistrée avec succès." });
  } catch (error) {
    console.error("Erreur complète :", error);
    res.status(500).json({
      message: "Erreur serveur lors de l'enregistrement de la compagnie.",
    });
  }
});

app.put("/api/compagnie/disable", async (req, res) => {
  try {
    await client.query(
      "UPDATE compagnie SET status = false WHERE status = true"
    );
    res.status(200).json({ message: "Compagnie désactivée avec succès." });
  } catch (error) {
    console.error("Erreur lors de la désactivation :", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la désactivation." });
  }
});

app.get("/api/compagnie/active", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM compagnie WHERE status = true "
    );
    res.json({ active: result.rows.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.use(express.json());

app.get("/api/evaluations/validated", async (req, res) => {
  try {
    const result = await client.query(`
      SELECT 
        e.id, 
        em.matriculesalarie AS matricule_employe, 
        em.nom, 
        em.prenom,
        e.evaluation_date,
        e.note,
        e.valide,
        e.status,
        e.compagnie_id
      FROM evaluation_employer e
      JOIN employe em ON e.employer_id = CAST(em.matriculesalarie AS INTEGER)
      JOIN compagnie c ON e.compagnie_id = c.id
      WHERE e.valide = false AND e.status = 'Terminé' AND c.status = true
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(
      "Erreur lors du chargement des évaluations terminées :",
      error
    );
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

app.get("/api/user/:matricule", async (req, res) => {
  const { matricule } = req.params;

  try {
    const result = await client.query(
      "SELECT * FROM users WHERE matricule = $1",
      [matricule]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur lors de la récupération utilisateur :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/api/user/:matricule", async (req, res) => {
  const { matricule } = req.params;
  const { name, email, password } = req.body;

  try {
    if (password && password.trim() !== "") {
      await client.query(
        "UPDATE users SET name = $1, email = $2, password = $3 WHERE matricule = $4",
        [name, email, password, matricule]
      );
    } else {
      await client.query(
        "UPDATE users SET name = $1, email = $2 WHERE matricule = $3",
        [name, email, matricule]
      );
    }

    res.json({ message: "Profil mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/api/evaluations/terminer", async (req, res) => {
  const role = req.query.role?.toUpperCase();
  const matriculeChef = req.query.matriculeChef;

  try {
    let query = `
      SELECT 
        e.id, 
        em.matriculesalarie AS matricule_employe, 
        em.nom, 
        em.prenom,
        e.evaluation_date,
        e.note,
        e.valide,
        e.status,
        e.compagnie_id
      FROM evaluation_employer e
      JOIN employe em ON e.employer_id = CAST(em.matriculesalarie AS INTEGER)
      JOIN compagnie c ON e.compagnie_id = c.id
      WHERE e.status = 'Terminé' AND c.status = true
    `;

    let values = [];

    if (role === "CHEF" && matriculeChef) {
      query += ` AND em.chefhierarchique = $1`;
      values.push(matriculeChef);
    }

    const result = await client.query(query, values);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(
      "Erreur lors du chargement des évaluations terminées :",
      error
    );
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

app.get("/Niveau", async (req, res) => {
  try {
    const rqs = "SELECT  id , niveau FROM niveau ORDER BY id ASC ";
    const result = await client.query(rqs);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/api/reponses_non_terminees", async (req, res) => {
  const { matricule } = req.query;
  const matriculeInt = parseInt(matricule);

  if (!matricule || isNaN(matriculeInt)) {
    return res.status(400).json({ error: "Matricule invalide." });
  }

  try {
    const evalRes = await client.query(
      "SELECT id FROM evaluation_employer WHERE employer_id = $1 AND status != 'Terminé' ORDER BY evaluation_date DESC LIMIT 1",
      [matriculeInt]
    );

    if (evalRes.rows.length === 0) {
      return res.status(200).json([]);
    }

    const evaluationId = evalRes.rows[0].id;

    const reponses = await client.query(
      "SELECT question_id, notechef FROM reponse WHERE evaluation_id = $1",
      [evaluationId]
    );

    res.status(200).json(reponses.rows);
  } catch (err) {
    console.error("Erreur récupération réponses:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/questions_personnalisees", async (req, res) => {
  const { matricule } = req.query;

  if (!matricule) {
    return res.status(400).json({ error: "Matricule est requis" });
  }

  try {
    const result = await client.query(
      `
      SELECT q.id, q.texte, q.rubrique, q.niveaurequis
      FROM reponse r
      JOIN question q ON q.id = r.question_id
      JOIN evaluation_employer e ON r.evaluation_id = e.id
      WHERE e.employer_id = $1 AND q.codefiche = '11'
      `,
      [matricule]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/questions_personnalisees:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/evaluation_answers", async (req, res) => {
  const { evaluations, status } = req.body;

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return res.status(400).json({ error: "Aucune évaluation fournie." });
  }

  const matricule = evaluations[0]?.matricule_employe;
  if (!matricule) {
    return res.status(400).json({ error: "Matricule employé manquant." });
  }

  const statutFinal = status === "Terminé" ? "Terminé" : "En cours";

  const totalNote = evaluations.reduce(
    (sum, ev) => sum + Number(ev.note ?? 0),
    0
  );

  try {
    await client.query("BEGIN");

    const { rows: compagnieRows } = await client.query(
      `SELECT id FROM compagnie WHERE status = true LIMIT 1`
    );

    if (compagnieRows.length === 0) {
      throw new Error("Aucune compagnie active trouvée.");
    }

    const compagnieId = compagnieRows[0].id;

    const evalExist = await client.query(
      "SELECT id FROM evaluation_employer WHERE employer_id = $1 AND status != 'Terminé' ORDER BY evaluation_date DESC LIMIT 1",
      [parseInt(matricule)]
    );

    let evaluationId;

    if (evalExist.rows.length > 0) {
      evaluationId = evalExist.rows[0].id;

      await client.query("DELETE FROM reponse WHERE evaluation_id = $1", [
        evaluationId,
      ]);

      await client.query(
        "UPDATE evaluation_employer SET note = $1, status = $2, compagnie_id = $3 WHERE id = $4",
        [totalNote, statutFinal, compagnieId, evaluationId]
      );
    } else {
      const { rows } = await client.query(
        `INSERT INTO evaluation_employer (employer_id, evaluation_date, note, status, valide, compagnie_id)
         VALUES ($1, CURRENT_DATE, $2, $3, false, $4)
         RETURNING id`,
        [parseInt(matricule), totalNote, statutFinal, compagnieId]
      );
      evaluationId = rows[0].id;
    }

    const insertReponse =
      "INSERT INTO reponse (question_id, notechef, evaluation_id) VALUES ($1, $2, $3)";
    for (const ev of evaluations) {
      await client.query(insertReponse, [
        ev.question_id,
        ev.note,
        evaluationId,
      ]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: `Évaluation ${
        statutFinal === "Terminé" ? "soumise" : "enregistrée"
      } avec succès`,
      evaluationId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur d'enregistrement:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
//------------------------------
app.put("/api/evaluations/:matricule/update", async (req, res) => {
  const matricule = req.params.matricule;
  const modifications = req.body.modifications;

  if (!modifications || typeof modifications !== "object") {
    return res.status(400).json({ message: "Modifications invalides." });
  }

  try {
    await client.query("BEGIN");

    const evaluationResult = await client.query(
      `SELECT id FROM evaluation_employer 
       WHERE employer_id = $1 AND status = 'Terminé' 
       ORDER BY evaluation_date DESC LIMIT 1`,
      [matricule]
    );

    if (evaluationResult.rows.length === 0) {
      return res.status(404).json({ message: "Aucune évaluation trouvée." });
    }

    const evaluationId = evaluationResult.rows[0].id;

    for (const [questionId, newValue] of Object.entries(modifications)) {
      await client.query(
        "UPDATE reponse SET noterh = $1 WHERE evaluation_id = $2 AND question_id = $3",
        [newValue, evaluationId, Number(questionId)]
      );
    }

    const sumResult = await client.query(
      `SELECT SUM(COALESCE(noterh, 0)) AS total_note
       FROM reponse
       WHERE evaluation_id = $1`,
      [evaluationId]
    );

    const totalNote = sumResult.rows[0].total_note || 0;

    await client.query(
      `UPDATE evaluation_employer
       SET note = $1
       WHERE id = $2`,
      [totalNote, evaluationId]
    );

    await client.query("COMMIT");

    res.json({ message: "Mise à jour réussie", totalNote });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur lors de la mise à jour:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
//------------------------------
app.get("/api/evaluations/:matricule/questions", async (req, res) => {
  const { matricule } = req.params;

  try {
    const query = `
      SELECT q.code, q.niveaurequis ,q.rubrique , q.id AS id, q.texte, r.notechef AS reponse_chef,
             r.noterh AS reponse_rh 
      FROM reponse r
      JOIN question q ON r.question_id = q.id
      JOIN evaluation_employer e ON r.evaluation_id = e.id
      JOIN compagnie c ON e.compagnie_id = c.id
      WHERE e.employer_id = $1 AND c.status = true
    `;

    const result = await client.query(query, [matricule]);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur lors de la récupération des réponses RH :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/evaluations/:matricule/valider", async (req, res) => {
  const { matricule } = req.params;
  const { modifications } = req.body;

  if (!modifications || typeof modifications !== "object") {
    return res.status(400).json({ error: "Modifications invalides." });
  }

  try {
    // بدء Transaction
    await client.query("BEGIN");

    // البحث عن آخر تقييم مكتمل
    const evalResult = await client.query(
      `SELECT id FROM evaluation_employer 
       WHERE employer_id = $1 AND status = 'Terminé' 
       ORDER BY evaluation_date DESC LIMIT 1`,
      [matricule]
    );

    if (evalResult.rows.length === 0) {
      console.log("No evaluation found for matricule:", matricule);
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Aucune évaluation trouvée." });
    }

    const evaluationId = evalResult.rows[0].id;
    console.log("Evaluation ID found:", evaluationId);
    let totalUpdated = 0;

    // تحديث الإجابات
    for (const questionIdStr in modifications) {
      const questionId = Number(questionIdStr);
      const noterh = modifications[questionIdStr];

      const updateResult = await client.query(
        `UPDATE reponse 
         SET noterh = $1
         WHERE evaluation_id = $2 AND question_id = $3`,
        [noterh, evaluationId, questionId]
      );

      console.log(
        `Question ID ${questionId}: ${updateResult.rowCount} row(s) updated`
      );
      totalUpdated += updateResult.rowCount;
    }

    if (totalUpdated === 0) {
      console.log("Aucune réponse mise à jour, rollback");
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Aucune modification n'a été appliquée." });
    }

    // إعادة حساب المجموع
    const sumResult = await client.query(
      `SELECT SUM(COALESCE(noterh, 0)) AS total_note
       FROM reponse
       WHERE evaluation_id = $1`,
      [evaluationId]
    );

    const totalNote = sumResult.rows[0].total_note || 0;

    // تحديث جدول evaluation_employer
    const evalUpdate = await client.query(
      `UPDATE evaluation_employer
       SET note = $1, valide = true
       WHERE id = $2`,
      [totalNote, evaluationId]
    );

    console.log(
      `Evaluation ID ${evaluationId} updated: ${evalUpdate.rowCount} row(s)`
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message:
        "Réponses RH mises à jour et note totale recalculée avec succès.",
      totalNote,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur lors de la mise à jour des réponses RH :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/question_personnalisee", async (req, res) => {
  const { texte, niveaurequis, matricule_employe, rubrique } = req.body;

  if (!texte || !niveaurequis || !matricule_employe) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  try {
    const emp = await client.query(
      `SELECT matriculesalarie FROM employe WHERE matriculesalarie = $1`,
      [matricule_employe]
    );

    if (emp.rows.length === 0) {
      return res.status(404).json({ message: "Employé non trouvé" });
    }

    const evalRes = await client.query(
      `SELECT id FROM evaluation_employer 
       WHERE employer_id = $1 AND status != 'Terminé' 
       ORDER BY evaluation_date DESC LIMIT 1`,
      [matricule_employe]
    );

    if (evalRes.rows.length === 0) {
      return res.status(404).json({
        message: "Aucune évaluation en cours trouvée pour cet employé.",
      });
    }

    const evaluationId = evalRes.rows[0].id;

    const result = await client.query(
      `
      INSERT INTO question (texte, rubrique, niveaurequis, codefiche)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
      [texte, rubrique, niveaurequis, 11]
    );

    const questionId = result.rows[0].id;

    await client.query(
      `
      INSERT INTO reponse (question_id, evaluation_id, notechef)
      VALUES ($1, $2, $3)
    `,
      [questionId, evaluationId, null]
    );

    res.status(201).json({
      message: "Question et réponse initiale enregistrées",
      id: questionId,
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ message: "Erreur lors de l'ajout" });
  }
});

app.get("/api/lesquestions", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM question ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur GET:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/api/questions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await client.query("DELETE FROM question WHERE id = $1", [id]);
    res.json({ message: "Supprimé avec succès" });
  } catch (error) {
    console.error("Erreur DELETE:", error);
    res.status(500).json({ error: "Erreur suppression" });
  }
});

app.put("/api/questions/:id", async (req, res) => {
  const { id } = req.params;
  const {
    codefiche,
    code,
    profil,
    rubrique,
    texte,
    niveaurequis,
    sousprocess,
  } = req.body;

  try {
    await client.query(
      `UPDATE question SET 
        codefiche = $1,
        code = $2,
        profil = $3,
        rubrique = $4,
        texte = $5,
        niveaurequis = $6,
        sousprocess = $7
      WHERE id = $8`,
      [codefiche, code, profil, rubrique, texte, niveaurequis, sousprocess, id]
    );

    res.json({ message: "Mise à jour réussie" });
  } catch (error) {
    console.error("Erreur PUT:", error);
    res.status(500).json({ error: "Erreur mise à jour" });
  }
});

app.post("/api/questions", async (req, res) => {
  const {
    codefiche,
    code,
    profil,
    rubrique,
    texte,
    niveaurequis,
    sousprocess,
    est_active,
  } = req.body;

  if (
    codefiche === undefined ||
    !code ||
    !profil ||
    !rubrique ||
    !texte ||
    !niveaurequis ||
    !sousprocess
  ) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
    const result = await client.query(
      `INSERT INTO question 
      (codefiche, code, profil, rubrique, texte, niveaurequis, sousprocess, est_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        codefiche,
        code,
        profil,
        rubrique,
        texte,
        niveaurequis,
        sousprocess,
        est_active ?? true,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erreur insertion:", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de l'ajout de la question." });
  }
});

app.post("/api/dupliquer-fiche", async (req, res) => {
  const { sourceCodefiche, newCodefiche } = req.body;

  if (!sourceCodefiche || !newCodefiche) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  try {
    const check = await client.query(
      "SELECT 1 FROM question WHERE codefiche = $1 LIMIT 1",
      [newCodefiche]
    );
    if (check.rowCount > 0) {
      return res
        .status(409)
        .json({ message: "Le codefiche cible existe déjà." });
    }

    const result = await client.query(
      "SELECT * FROM question WHERE codefiche = $1",
      [sourceCodefiche]
    );
    const sourceQuestions = result.rows;

    for (const question of sourceQuestions) {
      await client.query(
        `INSERT INTO question 
        (codefiche, code, profil, rubrique, texte, niveaurequis, sousprocess, est_active, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          newCodefiche,
          question.code,
          question.profil,
          question.rubrique,
          question.texte,
          question.niveaurequis,
          question.sousprocess,
          question.est_active,
        ]
      );
    }

    res.status(201).json({ message: "Fiche dupliquée avec succès." });
  } catch (error) {
    console.error("Erreur duplication fiche:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.delete("/api/questions/fiche/:codefiche", async (req, res) => {
  const { codefiche } = req.params;
  try {
    const deleteQuery = "DELETE FROM question WHERE codefiche = $1";
    await client.query(deleteQuery, [codefiche]);
    res
      .status(200)
      .json({ message: `Questions du codefiche ${codefiche} supprimées.` });
  } catch (error) {
    console.error("Erreur lors de la suppression des questions:", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression" });
  }
});

app.get("/api/compagnies/active", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM compagnie WHERE status = true "
    );

    if (result.rows.length === 0) {
      return res.status(204).send();
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(
      "Erreur lors de la récupération de la compagnie active:",
      err
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/rubriques", async (req, res) => {
  try {
    const result = await client.query("SELECT DISTINCT rubrique FROM question");
    const rubriques = result.rows.map((row) => row.rubrique);
    res.json(rubriques);
  } catch (error) {
    console.error("Error fetching rubriques:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/evaluationsemp/:matricule", async (req, res) => {
  const { matricule } = req.params;

  try {
    const query = `
      SELECT 
        ev.id AS evaluation_id,
        ev.evaluation_date,
        ev.note,
        ev.status,
        ev.valide,
        c.id AS compagnie_id,
        TO_CHAR(c.date_debut, 'DD/MM/YYYY') AS compagnie_date
      FROM evaluation_employer ev
      JOIN compagnie c ON ev.compagnie_id = c.id
      WHERE ev.employer_id = $1
      ORDER BY c.date_debut DESC, c.id DESC
    `;
    const result = await client.query(query, [matricule]);

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur fetch evaluations:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
