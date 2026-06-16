import BuyerNav from "./BuyerNav";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BuyerNav />
      {children}
    </>
  );
}
