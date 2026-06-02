export default function ProtectedRoute({ session, children }) {
  if (!session?.token) return null;
  return children;
}
