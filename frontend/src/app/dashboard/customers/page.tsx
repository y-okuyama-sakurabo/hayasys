import { Suspense } from "react";
import CustomersPageClient from "./CustomersPageClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
          Loading...
        </div>
      }
    >
      <CustomersPageClient />
    </Suspense>
  );
}
