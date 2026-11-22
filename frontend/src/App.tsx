import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import LoginPage from "./pages/LoginPage";
import TransfersPage from "./pages/TransfersPage";
import NewTransferPage from "./pages/NewTransferPage";
import AccountPage from "./pages/AccountPage";
import EditTransferPage from "./pages/EditTransferPage";
import TransferDetailPage from "./pages/TransferDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/transfers" replace />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/transfers/new" element={<NewTransferPage />} />
          <Route path="/transfers/:id" element={<TransferDetailPage />} />
          <Route path="/transfers/:id/edit" element={<EditTransferPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
