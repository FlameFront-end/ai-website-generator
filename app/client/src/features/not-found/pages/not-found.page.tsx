import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section>
      <h1>Страница не найдена</h1>
      <Link to="/">Назад к проектам</Link>
    </section>
  );
}
