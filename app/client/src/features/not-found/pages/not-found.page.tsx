import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <Link to="/">Back to runs</Link>
    </section>
  )
}
