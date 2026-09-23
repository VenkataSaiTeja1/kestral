import { Suspense, lazy } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import routes from "tempo-routes";
import { ThemeProvider } from "@/components/theme/theme-provider";

const SQLGenerator = lazy(() => import("@/pages/SQLGenerator"));

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <div className="min-h-screen flex flex-col">
        <Suspense
          fallback={
            <div className="flex h-screen w-screen items-center justify-center">
              <p>Loading...</p>
            </div>
          }
        >
          <>
            <Routes>
              <Route path="/" element={<SQLGenerator />} />
            </Routes>
            {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
          </>
        </Suspense>
      </div>
    </ThemeProvider>
  );
}

export default App;
