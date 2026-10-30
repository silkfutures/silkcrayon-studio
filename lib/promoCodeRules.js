export function eligibleCode(p, service, duration) { return !!p?.active && (!p.service_slug || p.service_slug === service) && (!p.min_duration_minutes || duration >= p.min_duration_minutes); }
