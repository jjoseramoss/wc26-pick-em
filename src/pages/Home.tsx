import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* WC26 4-color stripe top */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
        <div className="flex-1 bg-blue-700" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* WC26 Logo image */}
        <div className="mb-6 w-52">
          <img
            src="/wc26-logo.png"
            alt="FIFA World Cup 26"
            className="w-full h-auto object-contain drop-shadow-2xl"
          />
        </div>

        {/* Branding */}
        <div className="text-center mb-2">
          <h1 className="font-black text-5xl leading-none tracking-tight">
            PICK<span className="text-yellow-400">'EM</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-gray-500 text-sm text-center mt-5 mb-10 max-w-xs">
          Pick every scoreline. Compete with your crew. One group, one champion.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            to="/login"
            className="bg-yellow-400 text-black font-black text-sm py-4 px-6 rounded-2xl text-center uppercase tracking-widest hover:bg-yellow-300 transition"
          >
            Sign In
          </Link>
          <Link
            to="/login"
            state={{ mode: 'signup' }}
            className="border-2 border-gray-700 text-gray-300 font-black text-sm py-4 px-6 rounded-2xl text-center uppercase tracking-widest hover:border-gray-500 hover:text-white transition"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* Bottom stripe */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-blue-700" />
        <div className="flex-1 bg-green-600" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-red-600" />
      </div>
    </div>
  )
}
