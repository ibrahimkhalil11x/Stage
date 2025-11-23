"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import styles from "../../../styles/Home.module.css";

type User = {
  matricule: string;
  name: string;
  email: string;
  role: string;
};

const Profil = () => {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      alert("Utilisateur non connecté");
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      const matricule = parsedUser.matricule?.trim();

      if (!matricule) {
        alert("Matricule manquant");
        setLoading(false);
        return;
      }

      const fetchUserDetails = async () => {
        try {
          const res = await axios.get(
            `http://localhost:8080/api/user/${matricule}`
          );
          setUser(res.data);
          setName(res.data.name);
          setEmail(res.data.email);
        } catch (err) {
          console.error("Erreur lors du chargement du profil:", err);
          alert("Erreur lors du chargement du profil");
        } finally {
          setLoading(false);
        }
      };

      fetchUserDetails();
    } catch (error) {
      console.error("Erreur parsing user data:", error);
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    if (!user) return;

    try {
      await axios.put(`http://localhost:8080/api/user/${user.matricule}`, {
        name,
        email,
        password: password.trim() === "" ? undefined : password,
      });
      alert("Profil mis à jour avec succès !");
      setPassword("");
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour !");
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (!user) return <div>Utilisateur non trouvé</div>;

  return (
    <div className="p-6 max-w-md mx-auto bg-white shadow rounded">
      <h1 className="text-xl font-bold mb-4">Mon Profil</h1>

      <div className={styles.profilinp}>
        <p>
          <strong>Matricule:</strong> {user.matricule}
        </p>
        <p>
          <strong>Nom:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Role:</strong> {user.role}
        </p>
      </div>
      <hr />

      <div className={styles.profilinp}>
   
        <div className="mb-4">
          <label>Modifier le nom :</label>
          <br />
          <input className={
          styles.inputStyle
        }
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          
          />
        </div>

        <div className="mb-4">
          <label>Modifier l`email :</label>
          <br />
          <input className={
          styles.inputStyle
        }
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
           
          />
        </div>

     
        <div>
          <label className="block text-gray-700 mb-1">
            Nouveau mot de passe :
          </label>
          <br />
          <input className={
          styles.inputStyle
        }
            type="password"
            placeholder="Laisser vide pour ne pas changer"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
           
          />
        </div>

        <button
          className={styles.butt}

          onClick={handleSave}
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

export default Profil;
