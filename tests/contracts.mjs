import assert from 'node:assert/strict';import {londonDateTimeToUtc,londonToday} from '../lib/time.js';import {SERVICES} from '../lib/services.js';
assert.deepEqual(SERVICES['vocal-recording'].durations,[60,120,180,240,300,360,420]);
assert.equal(SERVICES['vocal-recording'].durations.includes(480),false);
const summer=londonDateTimeToUtc('2026-08-15','10:00');assert.equal(summer.toISOString(),'2026-08-15T09:00:00.000Z');
const winter=londonDateTimeToUtc('2026-12-15','10:00');assert.equal(winter.toISOString(),'2026-12-15T10:00:00.000Z');
assert.match(londonToday(),/^\d{4}-\d{2}-\d{2}$/);
console.log('Contract tests passed');
