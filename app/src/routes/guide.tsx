import { createFileRoute } from "@tanstack/react-router";

const GUIDE_TITLE = "Why the Moon’s Path Changes | Moon Geometry Guide";
const GUIDE_DESCRIPTION =
  "Learn how latitude, declination, Earth’s rotation and the Moon’s tilted orbit determine where the Moon rises and the path it follows across your sky.";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: GUIDE_TITLE },
      { name: "description", content: GUIDE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://moongeometry.com/guide/" }],
  }),
  component: Guide,
});

const sections = [
  ["use", "Use the visualizer"],
  ["diagrams", "Read the diagrams"],
  ["declination", "Declination and latitude"],
  ["comparison", "Worked comparison"],
  ["time", "Understand the clocks"],
  ["limits", "Accuracy and limitations"],
  ["faq", "Frequently asked questions"],
] as const;

function Guide() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-4 lg:px-5 lg:py-6">
      <header className="mb-5 border-b border-line pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="mb-2 text-xs font-semibold tracking-widest text-gold uppercase">
              Moon Geometry guide
            </p>
            <h1 className="font-display text-4xl leading-tight text-fg sm:text-5xl">
              Why the Moon’s Path Changes Across Your Sky
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted sm:text-lg">
              The Moon does not follow the same arc every night. Its declination
              changes as it moves around its tilted orbit, while your latitude
              determines how that changing celestial position maps onto your
              local horizon.
            </p>
          </div>
          <a
            href="/"
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-bg hover:bg-fg"
          >
            Open the Moon Path Visualizer
          </a>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav
          aria-label="Guide sections"
          className="rounded-card bg-surface p-3 lg:sticky lg:top-4"
        >
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">
            In this guide
          </p>
          <ol className="grid gap-1 text-sm">
            {sections.map(([id, label], index) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex gap-2 rounded-lg px-2 py-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <span className="text-gold">{index + 1}.</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 space-y-5 text-[0.96rem] leading-7 text-muted">
          <GuideSection id="use" title="Use the Moon Path Visualizer">
            <p>
              Start by selecting a place, or set latitude and longitude
              directly. Choose a date and adjust the editable mean solar time.
              The Current time button moves the model to the present moment,
              while the time scrubber moves through the selected mean-solar day.
            </p>
            <ol className="grid gap-2 pl-5 marker:text-gold sm:grid-cols-2">
              <li>Select a place or set its coordinates.</li>
              <li>Choose the date and mean solar time.</li>
              <li>Read the Moon’s altitude, azimuth and declination.</li>
              <li>Compare rise, set and the top of the daily path.</li>
              <li>Drag the orbital model or choose a Model view.</li>
              <li>Use Spin Earth or Slide the Moon to reveal motion.</li>
              <li>Open Explain for the current calculation and limits.</li>
              <li>Use Share to export the current diagrams as a PNG.</li>
            </ol>
            <p>
              The address bar keeps the selected latitude, longitude, date and
              time, so a particular state can be bookmarked or shared.
            </p>
          </GuideSection>

          <GuideSection id="diagrams" title="How to read the two diagrams">
            <div className="grid gap-3 md:grid-cols-2">
              <Concept
                eyebrow="Orbital geometry"
                title="Why the Moon gets its declination"
              >
                The left diagram is a schematic orrery. Green marks Earth’s
                equatorial plane, gold marks the ecliptic and sunlight, and
                silver marks the Moon’s orbit. Ephemeris directions set the
                displayed Sun and Moon angles, but sizes and distances are not
                drawn to scale.
              </Concept>
              <Concept eyebrow="Local sky" title="Where that geometry appears">
                The right diagram places the calculated Sun and Moon paths on
                your local sky. The centre is the zenith, the edge is the
                horizon, gold is the Sun and silver is the Moon. The small tick
                identifies the top of the Moon’s path.
              </Concept>
            </div>
          </GuideSection>

          <GuideSection
            id="declination"
            title="Declination connects orbit to sky"
          >
            <p>
              Declination is the Moon’s angle north or south of the celestial
              equator. It is not the same as altitude, which is the angle above
              your local horizon. The Moon’s orbital position sets its
              declination; your latitude then determines how high that
              declination can pass through your sky.
            </p>
            <div className="rounded-card border border-line bg-bg/50 p-4">
              <p className="text-xs font-semibold tracking-widest text-gold uppercase">
                At meridian transit
              </p>
              <p className="mt-2 overflow-x-auto font-mono text-base text-fg">
                altitude = 90° − | observer latitude − Moon declination |
              </p>
            </div>
            <p>
              Earth’s rotation carries the Moon’s daily arc from east to west.
              Changing the date alters the Moon’s orbital position and
              declination, so the entire arc shifts north or south and reaches a
              different maximum altitude.
            </p>
          </GuideSection>

          <GuideSection id="comparison" title="Worked comparison">
            <p>
              Use New York at approximately 40.7° N, 74.0° W. Select the Winter
              full Moon preset, record the declination, top of path, rise and
              set, then repeat with Summer full Moon. Keeping the observer fixed
              makes the effect of changing lunar declination visible in both
              diagrams and in the numerical results.
            </p>
            <figure className="overflow-hidden rounded-card border border-line bg-bg/50">
              <img
                src="/guide/moon-path-example.png"
                alt="Moon Geometry visualizer showing the orbital geometry and local sky path for the worked New York example"
                width="1440"
                height="900"
                className="block h-auto w-full"
              />
              <figcaption className="border-t border-line px-4 py-3 text-sm">
                A real capture from the winter example at 22:00 mean solar time
                on 23 December 2026. The transit values below were also checked
                with 90° − | latitude − declination | and agree within 0.1°.
              </figcaption>
            </figure>
            <div className="overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                <thead className="bg-surface-2 text-fg">
                  <tr>
                    <th className="px-3 py-2">Preset</th>
                    <th className="px-3 py-2">Declination</th>
                    <th className="px-3 py-2">Top of path</th>
                    <th className="px-3 py-2">Geometric rise / set</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line">
                    <td className="px-3 py-2 text-fg">
                      Winter full Moon
                      <span className="block text-xs text-muted">
                        23 Dec 2026 · 22:00 mean solar
                      </span>
                    </td>
                    <td className="px-3 py-2">+26.9°</td>
                    <td className="px-3 py-2">76.3°</td>
                    <td className="px-3 py-2">16:26 / 07:40 mean solar</td>
                  </tr>
                  <tr className="border-t border-line">
                    <td className="px-3 py-2 text-fg">
                      Summer full Moon
                      <span className="block text-xs text-muted">
                        29 Jun 2026 · 22:00 mean solar
                      </span>
                    </td>
                    <td className="px-3 py-2">−27.8°</td>
                    <td className="px-3 py-2">21.4°</td>
                    <td className="px-3 py-2">20:01 / 04:19 mean solar</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GuideSection>

          <GuideSection id="time" title="Mean solar time, UTC and civil time">
            <p>
              The editable clock uses mean solar time at the selected longitude.
              This keeps the geometry tied directly to the observer’s meridian:
              noon is when the mean Sun is on that meridian. UTC and civil time
              appear below as read-only references to the same instant.
            </p>
            <p>
              Civil time depends on political time-zone boundaries and daylight
              rules, while mean solar time changes continuously with longitude.
              Near a time-zone border, verify the displayed IANA zone before
              using the civil label for travel or scheduling.
            </p>
          </GuideSection>

          <GuideSection id="limits" title="Accuracy and limitations">
            <ul className="list-disc space-y-2 pl-5 marker:text-gold">
              <li>
                Observed values use topocentric ephemeris positions and include
                observer parallax.
              </li>
              <li>
                Rise and set are geometric centre crossings at altitude 0°.
              </li>
              <li>
                Atmospheric refraction, the Moon’s apparent radius, terrain,
                buildings and weather are not included.
              </li>
              <li>
                Object sizes, distances, orbit hoops, sunlight rays and the
                Earth texture are schematic teaching elements.
              </li>
              <li>
                Libration and detailed lunar-surface orientation are outside the
                current model.
              </li>
            </ul>
            <p>
              Moon Geometry is an educational geometry app, not a precision
              navigation or almanac service. Use a published almanac when its
              conventions and precision matter.
            </p>
          </GuideSection>

          <GuideSection id="faq" title="Frequently asked questions">
            <Faq question="Does the Moon follow the same path every night?">
              No. Its changing declination shifts the daily arc north or south,
              and the time at which you observe it changes where the Moon sits
              along that arc.
            </Faq>
            <Faq question="Why is declination different from altitude?">
              Declination belongs to the celestial coordinate system. Altitude
              belongs to your local horizon system and changes continuously as
              Earth rotates.
            </Faq>
            <Faq question="Why does latitude change the path?">
              Latitude changes the orientation of your horizon relative to the
              celestial equator. The same lunar declination therefore crosses
              different altitudes for different observers.
            </Faq>
            <Faq question="Why might rise and set differ from another service?">
              This app uses a geometric centre crossing at altitude 0°. Other
              services may include refraction, the Moon’s apparent radius,
              terrain or different conventions.
            </Faq>
            <Faq question="What does “distances fiction” mean?">
              The directional angles are meaningful, but the displayed sizes and
              distances are deliberately compressed so the geometry fits on one
              screen.
            </Faq>
            <Faq question="Can I share a particular location and time?">
              Yes. The root app stores latitude, longitude, date and mean solar
              time in the URL, and the Share button exports the current
              diagrams.
            </Faq>
          </GuideSection>

          <GuideSection id="sources" title="Technical sources">
            <ul className="grid gap-2">
              <SourceLink
                href="https://aa.usno.navy.mil/publications/asa"
                label="US Naval Observatory — The Astronomical Almanac"
              />
              <SourceLink
                href="https://aa.usno.navy.mil/publications/exp_supp"
                label="US Naval Observatory — Explanatory Supplement"
              />
              <SourceLink
                href="https://science.nasa.gov/moon/facts/"
                label="NASA Science — Moon facts"
              />
            </ul>
          </GuideSection>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-5">
            <p className="text-sm">
              Ready to explore a particular place and date?
            </p>
            <a
              href="/"
              className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-bg hover:bg-fg"
            >
              Open the Moon Path Visualizer
            </a>
          </footer>
        </article>
      </div>
    </main>
  );
}

function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 rounded-card bg-surface p-4 sm:p-5">
      <h2 className="mb-3 font-display text-2xl text-fg sm:text-3xl">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Concept({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-bg/55 p-4">
      <p className="text-xs font-semibold tracking-widest text-gold uppercase">
        {eyebrow}
      </p>
      <h3 className="mt-1 font-display text-xl text-fg">{title}</h3>
      <p className="mt-2">{children}</p>
    </div>
  );
}

function Faq({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line pt-3 first:border-0 first:pt-0">
      <h3 className="font-semibold text-fg">{question}</h3>
      <p className="mt-1">{children}</p>
    </div>
  );
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-gold underline decoration-gold/40 underline-offset-4 hover:text-fg"
      >
        {label}
      </a>
    </li>
  );
}
