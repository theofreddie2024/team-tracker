import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold tracking-tight bg-gradient-to-br from-sky-500 to-slate-900 bg-clip-text text-transparent">
          404
        </div>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button variant="accent">Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
