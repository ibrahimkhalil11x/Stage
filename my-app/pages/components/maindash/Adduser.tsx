import React, { useState } from "react";
import styles from "../../../styles/Home.module.css";
const Adduser = () => {
  const [matricule, setmatricule] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("rh");
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userData = {
      matricule,
      name,
      password,
      email,
      role,
    };

    try {
      const response = await fetch("http://localhost:8080/adduser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        alert("Utilisateur ajouté avec succès !");

        setmatricule("");
        setName("");
        setPassword("");
        setEmail("");
        setRole("rh");
      } else {
        alert("Erreur lors de l'ajout de l'utilisateur.");
      }
    } catch (error) {
      console.error("Erreur réseau :", error);
    }
  };

  return (
    <div>
      <h2>Ajouter un Chef hiérarchique </h2>
      <form onSubmit={handleSubmit}>
        <input
          className={styles.inputStyle}
          type="text"
          placeholder="matricule"
          value={matricule}
          onChange={(e) => setmatricule(e.target.value)}
          required
        />
        <input
          className={styles.inputStyle}
          type="text"
          placeholder="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={styles.inputStyle}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={styles.inputStyle}
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select
          className={styles.selectStyle}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        >
          <option value="rh">RH</option>
          <option value="chef">Chef</option>
        </select>
        <button className={styles.butt} type="submit">
          Ajouter
        </button>
      </form>
    </div>
  );
};

export default Adduser;
