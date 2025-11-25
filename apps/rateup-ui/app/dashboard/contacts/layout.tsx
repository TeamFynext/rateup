import ContactNavSidebar from "./components/ContactNavSidebar";

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <ContactNavSidebar />
      <div className="flex-1 bg-accent/50 p-3">{children}</div>
    </div>
  );
}
