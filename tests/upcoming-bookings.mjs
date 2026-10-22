import assert from 'node:assert/strict';
import {upcomingBookings} from '../app/upcoming-bookings.ts';
const now=Date.parse('2026-10-23T00:00:00Z');
const rows=[{id:'later',status:'approved',start_at:'2026-10-26T01:30:00Z'},{id:'cancelled',status:'cancelled',start_at:'2026-10-24T01:30:00Z'},{id:'earlier',status:'pending',start_at:'2026-10-24T01:30:00Z'},{id:'past',status:'approved',start_at:'2026-10-22T01:30:00Z'},{id:'rejected',status:'rejected',start_at:'2026-10-24T01:30:00Z'}];
assert.deepEqual(upcomingBookings(rows,now).map(b=>b.id),['earlier','later']);assert.equal(rows[0].id,'later');assert.deepEqual(upcomingBookings([],now),[]);
console.log('PASS: upcoming bookings include pending/approved, exclude past/cancelled/rejected, sort soonest first without mutating source');
