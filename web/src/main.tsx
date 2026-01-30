import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeConfig } from "./config";

function RootWrapper() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeConfig().then(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return <div>Loading...</div>;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootWrapper />
  </React.StrictMode>,
);
