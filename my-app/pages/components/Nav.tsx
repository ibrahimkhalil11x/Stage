import React, { useState } from "react";
import styles from "../../styles/Home.module.css";
import { useRouter } from "next/navigation";
import { useCookies } from "react-cookie";
import Header from "./Header";

type Link = {
  title: string;
  url: string;
  section: string;
};

type Props = {
  navig: Link[];
  onSelect: (section: string) => void;
};

const Nav: React.FC<Props> = ({ navig, onSelect }) => {
  const router = useRouter();
  const [, , removeCookie] = useCookies(["access_token"]);

  const [selectedSection, setSelectedSection] = useState<string>();

  const handleLogout = () => {
    removeCookie("access_token", { path: "/" });
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/");
  };

  const handleClick = (section: string) => {
    setSelectedSection(section);
    onSelect(section);
  };

  return (
    <nav className={styles.nav}>
      <Header />
      <hr style={{ marginTop: "20px", marginBottom: "20px", width: "100%" }} />
      <ul className={styles.ul}>
        {Array.isArray(navig) &&
          navig.map((link, index) => (
            <li key={index} className={styles.li}>
              <button
                className={`${styles.btn} ${
                  selectedSection === link.section ? styles.selected : ""
                }`}
                onClick={() => handleClick(link.section)}
              >
                <strong>{link.title}</strong>
              </button>
            </li>
          ))}
        <li className={styles.li}>
          <button
            className={styles.btn}
            style={{
              position: "fixed",
              bottom: "60px",
              left: "20px",
              color: "red",
              borderColor: "white",
            }}
            onClick={handleLogout}
          >
            <strong>Se déconnecter</strong>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Nav;
