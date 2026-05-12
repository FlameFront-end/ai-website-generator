import { Link } from "react-router-dom";

import { ROUTES } from "@/model";

export default function NotFoundPage() {
  return (
    <section>
      <h1>Страница не найдена</h1>
      <Link to={ROUTES.RUNS}>Назад к проектам</Link>
    </section>
  );
}
