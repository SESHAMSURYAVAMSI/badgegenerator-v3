export interface ScanItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface ScanDay {
  id: string;
  name: string;
  date?: string;
  enabled: boolean;
  sortOrder: number;
  items: ScanItem[];
}

export interface ScanConfigData {
  eventId: string;
  days: ScanDay[];
}

export interface ScanRecordData {
  _id: string;
  eventId: string;
  attendeeId: string;
  dayId: string;
  dayName: string;
  itemId: string;
  itemName: string;
  registrationNumber: string;
  attendeeName: string;
  scannedAt: string;
  scannedBy?: string;
}