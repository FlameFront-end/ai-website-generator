import { Outlet } from "react-router-dom";

import { Layout } from "@/widgets";

export function AppRoutes() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
