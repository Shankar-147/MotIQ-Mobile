// The parts of Bengaluru the prototype works with. Customers choose a pickup
// area and providers choose where they are waiting, so every distance in
// the demo is real and repeatable without needing GPS.
export interface Area {
  name: string;
  latitude: number;
  longitude: number;
}

export const AREAS: Area[] = [
  { name: 'MG Road', latitude: 12.9756, longitude: 77.607 },
  { name: 'Indiranagar', latitude: 12.9784, longitude: 77.6408 },
  { name: 'Koramangala', latitude: 12.9352, longitude: 77.6245 },
  { name: 'Jayanagar', latitude: 12.9299, longitude: 77.5826 },
  { name: 'Malleshwaram', latitude: 13.0035, longitude: 77.571 },
  { name: 'Hebbal', latitude: 13.0358, longitude: 77.597 },
  { name: 'Whitefield', latitude: 12.9698, longitude: 77.75 },
  { name: 'Electronic City', latitude: 12.8452, longitude: 77.6602 },
];

export function findArea(name: string): Area | undefined {
  return AREAS.find((area) => area.name === name);
}
