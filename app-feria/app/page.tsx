import AuthGate from "@/components/AuthGate";
import Feria from "@/components/Feria";

export default function Page() {
  return (
    <AuthGate>
      <Feria />
    </AuthGate>
  );
}
