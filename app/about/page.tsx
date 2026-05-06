export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">About Austin Shelter Map</h1>
      <p className="text-gray-400 text-sm mb-8">Built by a student in Austin, TX</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">What this is</h2>
        <p className="text-gray-300 leading-relaxed">
          Austin Shelter Map is a free, real-time map of emergency shelter bed availability across Austin.
          Shelter staff update bed counts directly from their phones. Outreach workers, case managers,
          and people in need can see availability instantly — no phone calls required.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Why I built this</h2>
        <p className="text-gray-300 leading-relaxed">
          Shelter bed availability in Austin is tracked through manual phone calls and spreadsheets.
          Outreach workers waste time calling multiple shelters before finding one with space.
          This tool removes that friction.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Important disclaimer</h2>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-yellow-200 text-sm">
          Bed availability data is self-reported by partner shelter staff. It may not reflect real-time
          conditions. Always call the shelter directly to confirm space is available before sending someone there.
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Partner shelters</h2>
        <p className="text-gray-400 text-sm">
          Interested in listing your shelter? Email{' '}
          <a href="mailto:chaogong@yahoo.com" className="text-blue-400 hover:underline">
            chaogong@yahoo.com
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Source code</h2>
        <p className="text-gray-300 text-sm">
          This project is open source.{' '}
          <a
            href="https://github.com/hogri/austin-shelter-map"
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub →
          </a>
        </p>
      </section>
    </div>
  )
}
