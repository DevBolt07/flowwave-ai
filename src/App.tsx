
import { AuthorityDashboard } from "./pages/AuthorityDashboard";

function App() {

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <header className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Live Video Analysis - JM Road x FC Road</h1>
      </header>
      <main className="p-4">
        <AuthorityDashboard />
      </main>
    </div>
  );
}

export default App;
