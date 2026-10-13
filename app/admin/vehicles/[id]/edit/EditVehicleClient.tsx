'use client';

import { useRouter } from 'next/navigation';
import VehicleForm from '@/app/components/admin/VehicleForm';

/** Client shim so the edit page can pass a navigation callback to VehicleForm
 *  (server components cannot pass function props). */
export default function EditVehicleClient({ initialData }: { initialData: Record<string, unknown> }) {
  const router = useRouter();
  return (
    <VehicleForm
      initialData={initialData}
      onSuccess={() => {
        router.push('/admin/vehicles');
        router.refresh();
      }}
      onCancel={() => router.push('/admin/vehicles')}
    />
  );
}
