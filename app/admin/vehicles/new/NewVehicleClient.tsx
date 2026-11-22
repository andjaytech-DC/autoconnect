'use client';

import { useRouter } from 'next/navigation';
import VehicleForm from '@/app/components/admin/VehicleForm';

/** Client shim so the new-vehicle page can navigate after a successful create. */
export default function NewVehicleClient() {
  const router = useRouter();
  return (
    <VehicleForm
      onSuccess={() => {
        router.push('/admin/vehicles');
        router.refresh();
      }}
      onCancel={() => router.push('/admin/vehicles')}
    />
  );
}
