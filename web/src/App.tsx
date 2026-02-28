import { Route, Routes, Navigate } from "react-router-dom";
import { Content, Theme } from "@carbon/react";

import HeaderBar from "./components/HeaderBar";
import DigestPage from "./pages/DigestPage";
import SourcesPage from "./pages/SourcesPage";
import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <Theme theme="g100">
      <HeaderBar />
      <Content>
        <Routes>
          <Route path="/" element={<DigestPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
    </Theme>
  );
}
