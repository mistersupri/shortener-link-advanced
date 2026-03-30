export interface Link {
  id: string;
  user_id: string;
  original_url: string;
  slug: string;
  password_hash: string | null;
  expires_at: string | null;
  click_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Click {
  id: string;
  link_id: string;
  clicked_at: string;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}

export interface AppSettings {
  key: string;
  value: string;
}

export interface LinkWithStats extends Link {
  user_email?: string;
  user_name?: string;
}

export interface AnalyticsData {
  totalClicks: number;
  clicksByDay: { date: string; clicks: number }[];
  clicksByDevice: { device: string; clicks: number }[];
  clicksByBrowser: { browser: string; clicks: number }[];
  clicksByCountry: { country: string; clicks: number }[];
  recentClicks: Click[];
}
