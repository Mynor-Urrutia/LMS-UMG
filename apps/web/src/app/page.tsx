import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900">
          Aprendé lo que querés,<br />
          <span className="text-primary-600">cuando querés.</span>
        </h1>
        <p className="mt-6 text-xl text-gray-500">
          Cursos en línea con seguimiento de progreso, foros de discusión y gamificación.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/courses" className="btn-primary px-6 py-3 text-base">
            Explorar cursos
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            Iniciar sesión
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { title: 'Aprendizaje a tu ritmo', desc: 'Accedé a las lecciones en cualquier momento y avanzá según tu disponibilidad.' },
            { title: 'Seguimiento de progreso', desc: 'Visualizá cuánto avanzaste en cada curso y cuánto te falta para completarlo.' },
            { title: 'Comunidad activa', desc: 'Participá en foros de discusión y aprendé junto a otros estudiantes.' },
          ].map(f => (
            <div key={f.title} className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
