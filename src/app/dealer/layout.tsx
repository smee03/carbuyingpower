import DealerNav from "./DealerNav";

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DealerNav />
      {children}
    </>
  );
}
