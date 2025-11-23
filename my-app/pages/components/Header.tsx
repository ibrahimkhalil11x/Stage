"use client";

import React, { useEffect, useState } from "react";
import styles from "../../styles/Home.module.css";

type User = {
  matricule: string;
  nom: string;
  role: string;
};

const Header = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser({
          matricule: parsedUser.matricule?.trim() || "",
          nom: parsedUser.nom || "User",
          role: parsedUser.role || "user",
        });
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <header className={styles.header}>
      <h3>Dashboard {user.role.toUpperCase()}</h3>

      <h4> {user.nom}</h4>
    </header>
  );
};

export default Header;
