import React from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-sky-50 to-violet-50" />
        <div className="relative z-10">
          <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/brand/app-icon.png"
                alt="Simplitest"
                className="h-9 w-9 rounded-xl object-cover"
                loading="eager"
                decoding="async"
              />
              <span className="text-xl font-semibold tracking-tight">Simplitest</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://blog.simplitest.ch" className="text-slate-700 hover:text-slate-900">Blog</a>
              <Link to="/login" className="text-slate-700 hover:text-slate-900">Se connecter</Link>
              <Link to="/register" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Essayer l'application
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h9.69L10.22 6.03a.75.75 0 1 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </nav>

          <div className="max-w-7xl mx-auto px-6 pt-10 pb-20 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-semibold leading-tight tracking-tight">
                La facturation suisse,
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">réduite à l'essentiel</span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-xl">
                Créez et envoyez des factures professionnelles en quelques clics, avec QR-bill suisse intégré. Une interface claire, rapide, et sans fioritures.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <Link to="/register" className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition-colors">Essayer gratuitement</Link>
                <Link to="/login" className="px-5 py-3 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-50">Se connecter</Link>
              </div>
              <div className="mt-6 text-sm text-slate-500">Aucun engagement. QR-bill conforme aux normes suisses.</div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-tr from-blue-100 to-violet-100 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                {/* Mocked app preview */}
                <div className="flex items-center justify-between">
                  <div className="h-8 w-24 rounded bg-slate-100" />
                  <div className="h-8 w-8 rounded-full bg-slate-100" />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="h-24 rounded-xl bg-slate-50 border border-slate-200" />
                  <div className="h-24 rounded-xl bg-slate-50 border border-slate-200" />
                  <div className="h-24 rounded-xl bg-slate-50 border border-slate-200" />
                </div>
                <div className="mt-6 h-56 rounded-xl bg-slate-50 border border-slate-200" />
                <div className="mt-4 h-10 rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white">
            <div className="h-10 w-10 rounded-lg bg-blue-600 text-white grid place-items-center mb-4">1</div>
            <h3 className="text-lg font-semibold mb-2">Ultra simple</h3>
            <p className="text-slate-600">Créez vos factures en quelques étapes. Des champs clairs, un flux logique, aucune complexité inutile.</p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 bg-white">
            <div className="h-10 w-10 rounded-lg bg-blue-600 text-white grid place-items-center mb-4">2</div>
            <h3 className="text-lg font-semibold mb-2">QR-bill intégré</h3>
            <p className="text-slate-600">Générez automatiquement des QR-bills suisses conformes, prêts à être payés.</p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 bg-white">
            <div className="h-10 w-10 rounded-lg bg-blue-600 text-white grid place-items-center mb-4">3</div>
            <h3 className="text-lg font-semibold mb-2">Design soigné</h3>
            <p className="text-slate-600">Des modèles PDF européens élégants pour une image professionnelle.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-600 to-violet-600 p-10 text-white grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">Essayez Simplitest aujourd'hui</h2>
            <p className="mt-2 text-blue-100">Commencez en quelques secondes. Pas de carte requise.</p>
          </div>
          <div className="flex md:justify-end gap-3">
            <Link to="/register" className="bg-white text-blue-700 px-5 py-3 rounded-xl hover:bg-blue-50 transition-colors">Créer un compte</Link>
            <Link to="/login" className="px-5 py-3 rounded-xl border border-white/60 hover:bg-white/10">Se connecter</Link>
          </div>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 pb-10 text-sm text-slate-500">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Simplitest. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <a href="/mentions" className="hover:text-slate-700">Mentions légales</a>
            <a href="/confidentialite" className="hover:text-slate-700">Confidentialité</a>
            <a href="https://blog.simplitest.ch" className="hover:text-slate-700">Blog</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
