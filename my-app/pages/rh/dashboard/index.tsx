"use client";

import React, { useState, useEffect } from "react";

import Nav from "../../components/Nav";
import Main from "../../components/Main";
import Styles from "../../../styles/Home.module.css";
import { useRouter } from "next/navigation";
type User = {
  matricule: string;
  nom: string;
  role: string;
};

const Index = () => {
  const [activeSection, setActiveSection] = useState("manage");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const navig = [
      { title: "Compagnie", url: "", section: "create" },
     { title: "Évaluer un employé", url: "", section: "employee" },
    { title: "Valider les évaluations", url: "", section: "validate" },
    { title: "Les évaluations", url: "", section: "edit" },

    { title: "Les Chefs hiérarchique", url: "", section: "manage" },
    { title: "Les Employers", url: "", section: "employertable" },
  
    { title: "Ajouter des questions", url: "", section: "add" },
   
    { title: "Profil", url: "", section: "profil" },
  ];

  useEffect(() => {
    const userString = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!userString || !token) {
      setIsAuthenticated(false);
      router.push("/");
      return;
    }

    const user: User = JSON.parse(userString);

    if (user.role !== "rh") {
      setIsAuthenticated(false);
      router.push("/");
      return;
    }

    setIsAuthenticated(true);
    setLoading(false);
  }, [router]);

  if (loading) {
    return <div className={Styles.loading}>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className={Styles.errorContainer}>
        <h2 className={Styles.errorTitle}>Accès non autorisé</h2>
      </div>
    );
  }

  return (
    <div>
      <div className={Styles.dash}>
        <div>
         
          <Nav navig={navig} onSelect={setActiveSection} />
        </div>
        <Main activeSection={activeSection} />
      </div>
    </div>
  );
};

export default Index;
