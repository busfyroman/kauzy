import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { VladaPage } from "@/pages/VladaPage";
import { ParlamentPage } from "@/pages/ParlamentPage";
import { PoliticianDetailPage } from "@/pages/PoliticianDetailPage";
import { KauzyPage } from "@/pages/KauzyPage";
import { ZakazkyPage } from "@/pages/ZakazkyPage";
import { GrafPage } from "@/pages/GrafPage";
import { AboutPage } from "@/pages/AboutPage";
import { GamePage } from "@/pages/GamePage";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="vlada" element={<VladaPage />} />
        <Route path="parlament" element={<ParlamentPage />} />
        <Route path="politik/:id" element={<PoliticianDetailPage />} />
        <Route path="kauzy" element={<KauzyPage />} />
        <Route path="zakazky" element={<ZakazkyPage />} />
        <Route path="graf" element={<GrafPage />} />
        <Route path="hra" element={<GamePage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
