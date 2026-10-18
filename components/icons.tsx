// Inline icons. Stroke icons inherit currentColor.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const S = ({ size = 18, children, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
);

export const LOGO_PATH =
  "m297.3 85.31c-33.47 3.392-58.11 25.6-58.11 56.06 0 33.41 26.69 58.94 49.73 58.94 15.04 0 26.5-9.92 26.5-28.99 0-27.2-13.89-49.15-16.13-83.97-0.064-1.28-0.832-2.176-1.984-2.048zM459.3 97.54h-17.92c-14.91 0-27.58-8.768-32.77-22.34-11.07-27.2-38.08-45.38-69.12-45.38-36.99 0-66.94 25.73-78.14 59.14-0.128 0.384 0.256 0.64 0.576 0.448 11.9-6.592 28.74-10.62 40.58-10.82 3.008-0.064 5.056 1.536 5.056 4.224 0.576 34.11 16.19 60.67 16.19 88.19 0 37.18-26.88 69.76-69.25 87.36-73.22 29.89-120.6 82.82-137.4 145.2-0.32 0.96-0.896 1.088-1.856 0.832-16.38-4.928-31.81-24.83-31.81-54.08 0-13.06 1.92-25.41 4.416-33.73 0.384-1.344-0.448-2.048-1.856-1.6-23.94 8.896-44.42 35.78-44.42 67.78 0 31.1 17.66 56.06 43.97 69.5 13.95 7.232 25.41 16.19 31.49 27.26 0.384 0.768 1.024 1.152 1.92 1.152h308.9c1.472 0 2.24-0.96 2.048-2.496-2.944-21.95-22.91-37.38-44.93-36.99-7.488 0.192-11.71-3.968-11.39-9.152 0.576-7.808 6.656-16.77 13.57-24.96 22.91-26.82 36.67-58.05 36.67-91.2 0-30.02-11.33-56-24.64-76.99-10.18-15.55-17.47-30.91-17.47-46.4 0-15.3 11.71-27.01 26.43-27.07 34.3-0.32 60.42-26.88 60.42-58.62 0-5.312-3.968-9.28-9.28-9.28zm-85.7-1.344c-5.376 0-9.536-4.224-9.536-9.6 0-5.312 4.16-9.728 9.536-9.728 5.44 0 9.728 4.416 9.728 9.728 0 5.376-4.288 9.6-9.728 9.6z";
export const Logo = ({ size = 30 }: { size?: number }) => (
  <svg className="logo" width={size} height={size} aria-hidden="true" viewBox="0 0 512 512" fill="currentColor"><path d={LOGO_PATH} /></svg>
);

export const FilterIcon = () => <S><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="15" cy="7" r="2.5" /><circle cx="9" cy="17" r="2.5" /></S>;
export const SortIcon = () => <S><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></S>;
export const HeartIcon = ({ filled = false, size = 18 }: { filled?: boolean; size?: number }) => (
  <S size={size} fill={filled ? "currentColor" : "none"}><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></S>
);
export const ZoomInIcon = () => <S strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></S>;
export const ZoomOutIcon = () => <S strokeWidth={2.4}><path d="M5 12h14" /></S>;
export const RecenterIcon = () => <S size={22} strokeWidth={2}><circle cx="12" cy="12" r="3" fill="currentColor" /><circle cx="12" cy="12" r="8" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></S>;
export const RefreshIcon = () => <S strokeWidth={2.4}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></S>;
export const SearchIcon = () => <S size={20} strokeWidth={2.4}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></S>;
export const XIcon = ({ size = 16 }: { size?: number }) => <S size={size} strokeWidth={2.4}><path d="M6 6l12 12M18 6 6 18" /></S>;
export const ChevronLeft = () => <S strokeWidth={2.4}><path d="m15 5-7 7 7 7" /></S>;
export const ChevronRight = () => <S strokeWidth={2.4}><path d="m9 5 7 7-7 7" /></S>;
export const ArrowOut = () => <S size={16} strokeWidth={2.4}><path d="M7 17 17 7M9 7h8v8" /></S>;
export const SignOutIcon = () => <S size={16} strokeWidth={2}><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l5 4-5 4M20 12H9" /></S>;

// fact lines in the detail panel
export const ClockIcon = () => <S strokeWidth={2}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></S>;
export const YenIcon = () => <S strokeWidth={2}><path d="M7 4l5 7 5-7M12 11v9M8 14h8M8 17.5h8" /></S>;
export const PinIcon = () => <S strokeWidth={2}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></S>;
export const TrainIcon = () => <S strokeWidth={2}><rect x="5" y="3.5" width="14" height="14" rx="3" /><path d="M5 10h14M9 14h.01M15 14h.01M8 20.5l1.5-3M16 20.5l-1.5-3" /></S>;
export const ForkIcon = () => <S strokeWidth={2}><path d="M7 3v7a2.5 2.5 0 0 0 5 0V3M9.5 3v18M17 3c-1.5 1.5-2.5 4-2.5 7.5 0 1 .5 2 2.5 2V21" /></S>;

// payment: card, cash, QR
export const CardIcon = () => <S strokeWidth={2}><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M3 10h18M7 14.5h3" /></S>;
export const CashIcon = () => <S strokeWidth={2}><rect x="2.5" y="6.5" width="19" height="11" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 12h.01M18 12h.01" /></S>;
export const QrIcon = () => <S strokeWidth={2}><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" /><path d="M14 14h2.5v2.5H14zM19 14h1.5M14 19h1.5M18.5 18.5h2v2" /></S>;

// used as innerHTML for the imperative MapLibre "you are here" marker
export const PERSON_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.5" r="4"/><path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z"/></svg>';
