"use client";

import styles from "../styles/Home.module.css";
import Image from "next/image";
import axios from "axios";
import { useCookies } from "react-cookie";
import { useState } from "react";
import { useRouter } from "next/navigation";

const Index = () => {
  const [_cookies, setCookies] = useCookies(["access_token"]);
  const [errorMessage, setErrorMessage] = useState("");
  const [captchaValue, setCaptchaValue] = useState("");
  const router = useRouter();

  const verif = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const matricule = e.currentTarget.matricule.value.trim();
    const password = e.currentTarget.password.value.trim();
    setErrorMessage("");

    if (matricule.length < 8) {
      setErrorMessage("Le matricule doit contenir au moins 8 chiffres.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }



    try {
      const response = await axios.post("http://localhost:8080/login", {
        matricule,
        password,
        captcha: captchaValue,
      });

      console.log("Réponse du serveur:", response.data);

      if (response.data.message === "Matricule ou mot de passe incorrect ") {
        setErrorMessage("Matricule ou mot de passe incorrect.");
        return;
      }

      if (response.data.token) {
        setCookies("access_token", response.data.token, { path: "/" });
        window.localStorage.setItem("token", response.data.token);
      } else {
        setErrorMessage("Matricule ou mot de passe incorrect");
        return;
      }

      const user = {
        matricule: response.data.matricule,
        nom: response.data.nom,

        role: response.data.role,
      };
      window.localStorage.setItem("user", JSON.stringify(user));
      console.log("Données utilisateur sauvegardées:", user);

      switch (user.role) {
        case "admin":
          router.push("/Admin/dashboard");
          break;
        case "rh":
          router.push("/rh/dashboard");
          break;
        case "chef":
          router.push("/chef/dashboard");
          break;
        default:
          setErrorMessage("Rôle inconnu.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Erreur serveur. Veuillez réessayer.");
    }
  };

  return (
    <center>
      <div>
        <form className={styles.form} onSubmit={verif}>
          <Image src="/logo.png" alt="Logo" width={120} height={70} />

          <div className={styles.inputs}>
            <label className={styles.label} htmlFor="matricule">
              Matricule
            </label>
            <input className={styles.input} type="text" name="matricule" />
          </div>

          <div className={styles.inputs}>
            <label className={styles.label} htmlFor="password">
              Mot de passe
            </label>
            <input className={styles.input} type="password" name="password" />
          </div>

          <div className={styles.inputs}>

          </div>

          <div className={styles.inputs}>
            {errorMessage && (
              <div style={{ color: "red", marginBottom: "10px" }}>
                {errorMessage}
              </div>
            )}
            <input
              className={styles.Button}
              type="submit"
              value="Se Connecter"
            />
          </div>
        </form>
      </div>
    </center>
  );
};

export default Index;
