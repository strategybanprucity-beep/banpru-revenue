import assert from 'node:assert/strict';
import {CALENDAR_SCOPE,validCalendarScope,calendarEventId,calendarEvent,writeCalendarEvent} from '../app/calendar-events.ts';
assert(validCalendarScope('openid email '+CALENDAR_SCOPE));assert(!validCalendarScope('https://www.googleapis.com/auth/calendar'));assert(!validCalendarScope(CALENDAR_SCOPE+' https://www.googleapis.com/auth/calendar.events'));
const b={id:'booking-1',status:'approved',purpose:'ประชุมแผน',venue_name:'ห้องประชุมชั้น 2',location:'เทศบาลเมืองบ้านพรุ',department:'หน่วยงานภายนอก',external_department:'หน่วยงานทดสอบ',start_at:'2026-10-23T01:30:00.000Z',end_at:'2026-10-23T09:30:00.000Z',phone:'PRIVATE PHONE',email:'PRIVATE EMAIL'};
const id=await calendarEventId(b.id);assert.match(id,/^[0-9a-v]{5,1024}$/);assert.equal(id,await calendarEventId(b.id));assert.notEqual(id,await calendarEventId('another'));
const event=calendarEvent(b);assert.equal(event.start.timeZone,'Asia/Bangkok');assert.equal(event.visibility,'private');assert(!JSON.stringify(event).includes('PRIVATE'));assert(!event.attendees);assert(event.description.includes('หน่วยงานทดสอบ'));
let calls=[],statuses=[404,200];const mock=async(url,options)=>{calls.push({url,...options});return new Response('{}',{status:statuses.shift()??200})};
await writeCalendarEvent('test','private-calendar',b.id,b,mock);assert.deepEqual(calls.map(c=>c.method),['PUT','POST']);assert.equal(JSON.parse(calls[1].body).id,id);
calls=[];statuses=[200];await writeCalendarEvent('test','private-calendar',b.id,{...b,purpose:'แก้ไข'},mock);assert.deepEqual(calls.map(c=>c.method),['PUT']);
for(const booking of [null,{...b,status:'cancelled'},{...b,status:'pending'},{...b,status:'rejected'}]){calls=[];statuses=[404];await writeCalendarEvent('test','private-calendar',b.id,booking,mock);assert.equal(calls[0].method,'DELETE');}
calls=[];statuses=[404,409,200];await writeCalendarEvent('test','private-calendar',b.id,b,mock);assert.deepEqual(calls.map(c=>c.method),['PUT','POST','PUT']);
statuses=[401];await assert.rejects(writeCalendarEvent('test','private-calendar',b.id,b,mock));
console.log('PASS: minimal Calendar scope, deterministic event IDs, approved-only updates/removal, timezone, privacy and retry conflict handling');
