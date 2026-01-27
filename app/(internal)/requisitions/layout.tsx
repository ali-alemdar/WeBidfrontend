export default function RequisitionsLayout({ children }: { children: React.ReactNode }) {
  // Navigation is handled globally by app/(internal)/layout.tsx via SecondaryNav.
  return <>{children}</>;
}
