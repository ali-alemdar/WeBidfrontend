"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  params: { token: string };
}

export default function InvitationPage({ params }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (params.token) {
      // Redirect to the public invitation submission page with the token
      router.replace(`/public/invitations/${params.token}`);
    }
  }, [params.token, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <p>Loading invitation...</p>
    </div>
  );
}
