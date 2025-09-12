
import { LaneWindow } from "../components/LaneWindow";

const lanes = ["North Lane", "East Lane", "South Lane", "West Lane"];

export function AuthorityDashboard() {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
      {lanes.map((lane) => (
        <LaneWindow key={lane} laneName={lane} />
      ))}
    </div>
  );
}
