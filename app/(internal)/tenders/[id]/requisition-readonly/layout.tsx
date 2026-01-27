export default function TenderRequisitionReadonlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render this page without the standard internal sidebars/navbars.
  return <>{children}</>;
}
