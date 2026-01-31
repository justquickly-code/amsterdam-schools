"use client";

import { cn } from "@/lib/utils";

interface MapPinProps {
  className?: string;
  size?: number;
  label?: string;
}

// Default school pin - warm red with schoolhouse icon
export function SchoolPin({ className, size = 40, label }: MapPinProps) {
  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 40 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={label || "School location"}
      >
        {/* Pin shadow */}
        <ellipse cx="20" cy="47" rx="8" ry="3" fill="black" fillOpacity="0.15" />
        
        {/* Pin body */}
        <path
          d="M20 0C9.507 0 1 8.507 1 19c0 13.5 19 29 19 29s19-15.5 19-29C39 8.507 30.493 0 20 0z"
          fill="#DC4545"
        />
        
        {/* Inner highlight */}
        <path
          d="M20 3C11.163 3 4 10.163 4 19c0 5.5 3 11 8 17"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
        
        {/* School icon */}
        <g transform="translate(10, 9)">
          {/* Roof */}
          <path d="M10 2L2 8V10H18V8L10 2Z" fill="white" />
          {/* Building */}
          <rect x="4" y="10" width="12" height="9" fill="white" />
          {/* Door */}
          <rect x="8" y="13" width="4" height="6" fill="#DC4545" />
          {/* Windows */}
          <rect x="5" y="12" width="2" height="2" fill="#DC4545" />
          <rect x="13" y="12" width="2" height="2" fill="#DC4545" />
          {/* Flag pole */}
          <rect x="9.5" y="0" width="1" height="4" fill="white" />
          <path d="M10.5 0L14 1.5L10.5 3V0Z" fill="#FBBF24" />
        </g>
      </svg>
      {label && (
        <span className="absolute -bottom-5 whitespace-nowrap rounded-full bg-foreground/90 px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

// Selected school pin - larger with ring highlight
export function SchoolPinSelected({ className, size = 48, label }: MapPinProps) {
  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 48 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={label || "Selected school"}
      >
        {/* Pulse ring animation */}
        <circle cx="24" cy="23" r="22" fill="#DC4545" fillOpacity="0.2">
          <animate
            attributeName="r"
            values="18;24;18"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="fill-opacity"
            values="0.3;0.1;0.3"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Pin shadow */}
        <ellipse cx="24" cy="56" rx="10" ry="4" fill="black" fillOpacity="0.2" />
        
        {/* Outer ring */}
        <circle cx="24" cy="23" r="21" stroke="#DC4545" strokeWidth="3" fill="none" />
        
        {/* Pin body */}
        <path
          d="M24 4C14.611 4 7 11.611 7 21c0 12 17 26 17 26s17-14 17-26c0-9.389-7.611-17-17-17z"
          fill="#DC4545"
        />
        
        {/* Inner highlight */}
        <path
          d="M24 7C16.268 7 10 13.268 10 21c0 4.5 2.5 9 6.5 14"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
        
        {/* School icon - slightly larger */}
        <g transform="translate(12, 10)">
          {/* Roof */}
          <path d="M12 2L2 10V12H22V10L12 2Z" fill="white" />
          {/* Building */}
          <rect x="4" y="12" width="16" height="11" fill="white" />
          {/* Door */}
          <rect x="9" y="16" width="6" height="7" fill="#DC4545" />
          {/* Windows */}
          <rect x="5" y="14" width="3" height="3" fill="#DC4545" />
          <rect x="16" y="14" width="3" height="3" fill="#DC4545" />
          {/* Flag pole */}
          <rect x="11" y="-1" width="1.5" height="5" fill="white" />
          <path d="M12.5 -1L17 1.5L12.5 4V-1Z" fill="#FBBF24" />
        </g>
      </svg>
      {label && (
        <span className="absolute -bottom-6 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-md">
          {label}
        </span>
      )}
    </div>
  );
}

// Home pin - teal with house icon
export function HomePin({ className, size = 36, label }: MapPinProps) {
  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 36 45"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={label || "Your home"}
      >
        {/* Pin shadow */}
        <ellipse cx="18" cy="42" rx="7" ry="3" fill="black" fillOpacity="0.15" />
        
        {/* Pin body */}
        <path
          d="M18 0C8.611 0 1 7.611 1 17c0 12 17 26 17 26s17-14 17-26C35 7.611 27.389 0 18 0z"
          fill="#14B8A6"
        />
        
        {/* Inner highlight */}
        <path
          d="M18 3C10.268 3 4 9.268 4 17c0 4 2 8 5.5 13"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
        
        {/* House icon */}
        <g transform="translate(8, 7)">
          {/* Roof */}
          <path d="M10 2L1 10H19L10 2Z" fill="white" />
          {/* House body */}
          <rect x="3" y="10" width="14" height="10" fill="white" />
          {/* Door */}
          <rect x="8" y="13" width="4" height="7" fill="#14B8A6" />
          {/* Window */}
          <rect x="4" y="12" width="3" height="3" fill="#14B8A6" />
          <rect x="13" y="12" width="3" height="3" fill="#14B8A6" />
          {/* Chimney */}
          <rect x="14" y="4" width="3" height="5" fill="white" />
          {/* Heart */}
          <path
            d="M10 17.5C10 17.5 7 15 7 13.5C7 12.5 8 12 8.5 12C9.2 12 10 12.8 10 12.8C10 12.8 10.8 12 11.5 12C12 12 13 12.5 13 13.5C13 15 10 17.5 10 17.5Z"
            fill="#DC4545"
          />
        </g>
      </svg>
      {label && (
        <span className="absolute -bottom-5 whitespace-nowrap rounded-full bg-info px-2 py-0.5 text-xs font-semibold text-info-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

// Visited school pin - with checkmark badge
export function SchoolPinVisited({ className, size = 40, label }: MapPinProps) {
  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 40 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={label || "Visited school"}
      >
        {/* Pin shadow */}
        <ellipse cx="20" cy="47" rx="8" ry="3" fill="black" fillOpacity="0.15" />
        
        {/* Pin body - slightly muted */}
        <path
          d="M20 0C9.507 0 1 8.507 1 19c0 13.5 19 29 19 29s19-15.5 19-29C39 8.507 30.493 0 20 0z"
          fill="#9CA3AF"
        />
        
        {/* School icon */}
        <g transform="translate(10, 9)">
          <path d="M10 2L2 8V10H18V8L10 2Z" fill="white" />
          <rect x="4" y="10" width="12" height="9" fill="white" />
          <rect x="8" y="13" width="4" height="6" fill="#9CA3AF" />
          <rect x="5" y="12" width="2" height="2" fill="#9CA3AF" />
          <rect x="13" y="12" width="2" height="2" fill="#9CA3AF" />
        </g>
        
        {/* Checkmark badge */}
        <circle cx="32" cy="8" r="8" fill="#22C55E" />
        <path
          d="M28 8L31 11L37 5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <span className="absolute -bottom-5 whitespace-nowrap rounded-full bg-foreground/80 px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

// Planned school pin - with calendar badge
export function SchoolPinPlanned({ className, size = 40, label }: MapPinProps) {
  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 40 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={label || "Planned visit"}
      >
        {/* Pin shadow */}
        <ellipse cx="20" cy="47" rx="8" ry="3" fill="black" fillOpacity="0.15" />
        
        {/* Pin body - teal */}
        <path
          d="M20 0C9.507 0 1 8.507 1 19c0 13.5 19 29 19 29s19-15.5 19-29C39 8.507 30.493 0 20 0z"
          fill="#14B8A6"
        />
        
        {/* School icon */}
        <g transform="translate(10, 9)">
          <path d="M10 2L2 8V10H18V8L10 2Z" fill="white" />
          <rect x="4" y="10" width="12" height="9" fill="white" />
          <rect x="8" y="13" width="4" height="6" fill="#14B8A6" />
          <rect x="5" y="12" width="2" height="2" fill="#14B8A6" />
          <rect x="13" y="12" width="2" height="2" fill="#14B8A6" />
        </g>
        
        {/* Calendar badge */}
        <circle cx="32" cy="8" r="8" fill="#FBBF24" />
        <rect x="28" y="5" width="8" height="6" rx="1" fill="white" />
        <rect x="29" y="4" width="1.5" height="2" fill="#FBBF24" />
        <rect x="33.5" y="4" width="1.5" height="2" fill="#FBBF24" />
        <rect x="29" y="8" width="2" height="2" fill="#FBBF24" />
      </svg>
      {label && (
        <span className="absolute -bottom-5 whitespace-nowrap rounded-full bg-info px-2 py-0.5 text-xs font-semibold text-info-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

// Favourite school pin - with star badge
export function SchoolPinFavourite({ className, size = 40, label }: MapPinProps) {
  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 40 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={label || "Favourite school"}
      >
        {/* Pin shadow */}
        <ellipse cx="20" cy="47" rx="8" ry="3" fill="black" fillOpacity="0.15" />
        
        {/* Pin body */}
        <path
          d="M20 0C9.507 0 1 8.507 1 19c0 13.5 19 29 19 29s19-15.5 19-29C39 8.507 30.493 0 20 0z"
          fill="#DC4545"
        />
        
        {/* School icon */}
        <g transform="translate(10, 9)">
          <path d="M10 2L2 8V10H18V8L10 2Z" fill="white" />
          <rect x="4" y="10" width="12" height="9" fill="white" />
          <rect x="8" y="13" width="4" height="6" fill="#DC4545" />
          <rect x="5" y="12" width="2" height="2" fill="#DC4545" />
          <rect x="13" y="12" width="2" height="2" fill="#DC4545" />
        </g>
        
        {/* Star badge */}
        <circle cx="32" cy="8" r="8" fill="#FBBF24" />
        <path
          d="M32 3L33.5 6.5L37 7L34.5 9.5L35 13L32 11.5L29 13L29.5 9.5L27 7L30.5 6.5L32 3Z"
          fill="white"
        />
      </svg>
      {label && (
        <span className="absolute -bottom-5 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

// Cluster pin for multiple schools
export function ClusterPin({ 
  className, 
  size = 44, 
  count 
}: MapPinProps & { count: number }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`${count} schools in this area`}
      >
        {/* Outer ring */}
        <circle cx="22" cy="22" r="20" fill="#DC4545" fillOpacity="0.2" />
        
        {/* Main circle */}
        <circle cx="22" cy="22" r="16" fill="#DC4545" />
        
        {/* Inner highlight */}
        <circle cx="22" cy="22" r="14" stroke="white" strokeWidth="2" strokeOpacity="0.3" fill="none" />
      </svg>
      <span className="absolute text-sm font-bold text-white">
        {count > 99 ? "99+" : count}
      </span>
    </div>
  );
}
