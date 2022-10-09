import React from "react";
import { render } from "react-dom";
import App from "./App";
import "./index.css";

const root = document.getElementById("root") as HTMLElement;
render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  root
);
