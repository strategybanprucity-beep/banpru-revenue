import assert from 'node:assert/strict';
import {reportMonth,reportRows} from '../app/admin/reports/model.ts';
const rows=[{id:'a',start_at:'2026-12-31T18:00:00Z',status:'approved'},{id:'b',start_at:'2027-02-28T17:00:00Z',status:'cancelled'},{id:'c',start_at:'2027-02-28T16:59:00Z',status:'rejected'},{id:'d',start_at:'2026-12-31T16:59:00Z',status:'pending'}];
assert.equal(reportMonth(rows[0].start_at),'2027-01');
assert.deepEqual(reportRows(rows,'2027-01','2027-02').map(r=>r.id),['a','c']);
assert.deepEqual(reportRows(rows,'2027-03','2027-02'),[]);
assert.equal(rows[0].id,'a');
console.log('PASS: inclusive month range uses Bangkok timezone, year boundary, all statuses and preserves source');
