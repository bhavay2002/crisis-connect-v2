/** Severity levels shared across all features */
export type Severity = "critical" | "high" | "medium" | "low";

/** Standard paginated API response envelope */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Generic API error shape */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

/** Coordinate pair */
export interface LatLng {
  lat: number;
  lng: number;
}

/** User role options */
export type UserRole =
  | "citizen"
  | "volunteer"
  | "ngo"
  | "government"
  | "authority"
  | "admin"
  | "super_admin";
