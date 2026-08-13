export const SERVICES = {
  "vocal-recording": {
    slug: "vocal-recording",
    name: "Vocal Recording",
    short: "Expert vocal takes, layers, comping and in-session mix work.",
    hourlyPence: 6000,
    durations: [60, 120, 180, 240],
  },
  "artist-development": {
    slug: "artist-development",
    name: "Artist Development & Industry Guidance",
    short: "Direction, strategy, sound, release planning and honest industry guidance.",
    hourlyPence: 6000,
    durations: [60, 120],
  },
  "full-day": {
    slug: "full-day",
    name: "Full Day Studio",
    short: "Eight hours in the vault for focused recording, development and production.",
    fixedPence: 45000,
    durations: [480],
  },
};

export const BUSINESS_HOURS = {
  0: null,
  1: ["10:00", "22:00"],
  2: ["10:00", "22:00"],
  3: ["10:00", "22:00"],
  4: ["10:00", "22:00"],
  5: ["10:00", "22:00"],
  6: ["10:00", "20:00"],
};

export function priceFor(service, durationMinutes) {
  if (service.fixedPence) return service.fixedPence;
  return Math.round((durationMinutes / 60) * service.hourlyPence);
}

export function formatGBP(pence) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}
