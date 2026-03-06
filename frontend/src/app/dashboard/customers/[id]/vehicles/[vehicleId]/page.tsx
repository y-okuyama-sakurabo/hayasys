"use client";

import { useParams } from "next/navigation";
import VehicleDetail from "@/components/vehicles/VehicleDetail";
import VehicleMemos from "@/components/vehicles/VehicleMemos";
import VehicleImages from "@/components/vehicles/VehicleImages";

export default function Page() {

  const params = useParams();

  const customerId = Number(params.id);
  const vehicleId = Number(params.vehicleId);

  return (
    <>
      <VehicleDetail
        customerId={customerId}
        vehicleId={vehicleId}
      />

      <VehicleMemos vehicleId={vehicleId} />

      <VehicleImages vehicleId={vehicleId} />
    </>
  );
}