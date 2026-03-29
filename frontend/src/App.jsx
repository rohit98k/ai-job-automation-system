import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import JobAnalyzer from "./pages/JobAnalyzer";
import CoverLetterGenerator from "./pages/CoverLetterGenerator";
import SkillGapAnalyzer from "./pages/SkillGapAnalyzer";
import JobBoard from "./pages/JobBoard";
import MockInterview from "./pages/MockInterview";
import PortfolioBuilder from "./pages/PortfolioBuilder";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="board" element={<JobBoard />} />
                <Route path="interview" element={<MockInterview />} />
                <Route path="resume" element={<ResumeAnalyzer />} />
                <Route path="job-analyzer" element={<JobAnalyzer />} />
                <Route path="cover-letter" element={<CoverLetterGenerator />} />
                <Route path="skill-gap" element={<SkillGapAnalyzer />} />
                <Route path="portfolio-builder" element={<PortfolioBuilder />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
