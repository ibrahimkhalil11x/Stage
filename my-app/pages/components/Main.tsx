import React from "react";
import styles from "../../styles/Home.module.css";
import ChefTable from "./maindash/ChefTable";
import EmployerTable from "./maindash/EmployerTable";
import ADchefTable from "./maindash/ADchefTable";

import EvaluerEmployer from "./maindash/EvaluerEmployer";
import Adduser from "./maindash/Adduser";
import ValiderEvaluation from "./maindash/ValiderEvaluation";
import Ajouter from "./maindash/Ajouter";
import Compagnie from "./maindash/compagnie";
import Profil from "./maindash/Profil";
import LesEvaluations from "./maindash/LesEvaluations";

type Props = {
  activeSection: string;
};

const Main: React.FC<Props> = ({ activeSection }) => {
  const renderSection = () => {
    switch (activeSection) {
      case "create":
        return (
          <div>
            <Compagnie />
          </div>
        );
      case "validate":
        return (
          <div>
            <ValiderEvaluation />
          </div>
        );
      case "manage":
        return (
          <div>
            <div className={styles.adduser}>
              <Adduser />
            </div>
            <div className={styles.manage}>
              {" "}
              <ChefTable />
            </div>
          </div>
        );
      case "AdminManagechef":
        return (
          <div>
            <div className={styles.adduser}>
              <Adduser />
            </div>
            <div className={styles.manage}>
              {" "}
              <ADchefTable />
            </div>
          </div>
        );
      case "AdminManageemployer":
        return (
          <div className={styles.manage}>
            <EmployerTable />
          </div>
        );
      case "add":
        return (
          <div>
            {" "}
            <Ajouter />
          </div>
        );
      case "employee":
        return (
          <div>
            <EvaluerEmployer />
          </div>
        );
      case "employertable":
        return (
          <div className={styles.manage}>
            {" "}
            <EmployerTable />
          </div>
        );
      case "list":
        return <div>Consulter les employés</div>;
      case "edit":
        return (
          <div>
            <LesEvaluations />
          </div>
        );
      case "profil":
        return (
          <div>
            <Profil />
          </div>
        );
      default:
        return <div>Sélectionnez une option</div>;
    }
  };

  return <div className={styles.main}>{renderSection()}</div>;
};

export default Main;
