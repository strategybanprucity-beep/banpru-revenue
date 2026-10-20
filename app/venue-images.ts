// Approved static venue images; no R2 subscription is required.
const byId:Record<string,string>={
  "33490708-e009-4006-9988-3556aacedd10": "/images/venues/online-conference-room.png",
  "ee5c4e21-b156-42e7-a257-110a1e21d65e": "/images/venues/floating-market.png",
  "d57d1bbb-0acb-4a50-85fa-a7121623e67b": "/images/venues/phasi-charoen-sports.png",
  "a4307a31-9462-464e-b2da-1205cb0ca309": "/images/venues/wai-wan-college.png",
  "3e8b98e5-b4fa-4c8a-906a-e030692f497f": "/images/venues/meeting-room-floor-2.png",
  "7f72d33f-3e51-4175-96eb-7c75fda31f3a": "/images/venues/municipal-council-room.png",
  "8e58bcd6-bf12-44c2-9c41-1399f7487dbc": "/images/venues/tk-park-banpru.png"
};
const byName:Record<string,string>={
  "online conference room": "/images/venues/online-conference-room.png",
  "ตลาดน้ำบ้านพรุ": "/images/venues/floating-market.png",
  "ลานกีฬาภาษีเจริญ": "/images/venues/phasi-charoen-sports.png",
  "วิทยาลัยวัยหวาน": "/images/venues/wai-wan-college.png",
  "ห้องประชุมชั้น 2": "/images/venues/meeting-room-floor-2.png",
  "ห้องประชุมสภาเทศบาล": "/images/venues/municipal-council-room.png",
  "อุทยานการเรียนรู้บ้านพรุ (tkpark banpru)": "/images/venues/tk-park-banpru.png"
};
export function staticVenueImage(venue:{id:string;name:string}){return byId[venue.id]??byName[venue.name.trim().toLowerCase()]??''}
