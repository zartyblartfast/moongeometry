import { useMemo } from "react";
import { horizonsExample } from "./explain-comparison";

export function CheckPrediction() {
  const { app, jpl, request } = useMemo(horizonsExample, []);
  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl text-fg">Outdoors: measure before you look up the prediction</h3>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Choose a clear view of the Moon well above the skyline. Note your latitude, longitude and UTC date. Keep the prediction out of sight.</li>
        <li>Check that your clinometer reads 0° along a level surface. Sight along its edge at the centre of the whole lunar disc, not the bright edge. Read the angle above level, not above the rooftops.</li>
        <li>Lower and re-aim at least three times within a minute. Write down each angle and its UTC time. Report the mean and range. For a rough ± uncertainty, use half the range or one scale division, whichever is larger. A zero offset can shift all readings together.</li>
        <li>Only now set the app to your coordinates. Adjust mean solar date and time until the UTC line matches the middle reading. Compare the mean with the calculated Moon altitude. If the readings span several minutes, compare each at its own time instead.</li>
      </ol>
      <p>Subtract predicted altitude from measured altitude. Is the difference larger than your uncertainty? Near the horizon, refraction can lift the apparent Moon and terrain can hide it. The app uses the centre crossing a level, airless horizon, not the first visible edge.</p>
      <h3 className="font-display text-xl text-fg">At your desk: compare two models</h3>
      <p>This fixed example is not a sighting or your live state. Use 19 November 2026, 18:00 UTC, latitude 51.5° N, longitude 0°, elevation 0 m. At this longitude enter 18:00 mean solar time.</p>
      <p><a className="text-gold underline" href={request} target="_blank" rel="noreferrer">Run the same JPL Horizons request</a>. Read the row between $$SOE and $$EOE: Moon (301), Earth observer, quantity 4, airless. Azimuth runs clockwise from true north; elevation is altitude above level.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <caption className="sr-only">Moon centre angles in degrees</caption>
          <thead><tr><th>Degrees</th><th>Azimuth</th><th>Altitude</th></tr></thead>
          <tbody>
            <tr><th>JPL Horizons</th><td>{jpl.azimuthDeg}</td><td>{jpl.altitudeDeg}</td></tr>
            <tr><th>App provider</th><td>{app.azimuthDeg.toFixed(9)}</td><td>{app.altitudeDeg.toFixed(9)}</td></tr>
            <tr><th>App − JPL</th><td>{(app.azimuthDeg - jpl.azimuthDeg).toFixed(9)}</td><td>{(app.altitudeDeg - jpl.altitudeDeg).toFixed(9)}</td></tr>
          </tbody>
        </table>
      </div>
      <p>The extra digits reveal differences hidden by the sky display’s rounding. Agreement checks the calculation for this case; it does not measure the Moon or establish instrument accuracy.</p>
    </div>
  );
}
