import { AdminAction, MiniStat, Panel } from "../ui";
import { canManageAdmins } from "../../../lib/privacy";
import { updateUserRole, updateUserStatus } from "../../state/demoActions";
import { useBackendActions } from "../../backend/BackendActionsContext";
import type {
  AppState,
  MeasurementEntry,
  NutritionLog,
  UserProfile,
  WorkoutLog,
} from "../../../types";

type UpdateState = (updater: (current: AppState) => AppState) => void;

interface UserListProps {
  users: UserProfile[];
  selectedUserId: string | undefined;
  selectedUser: UserProfile;
  measurements: MeasurementEntry[];
  nutrition: NutritionLog[];
  workouts: WorkoutLog[];
  currentUser: UserProfile;
  updateState: UpdateState;
  onSelect: (id: string) => void;
}

export function UserList({
  users,
  selectedUserId,
  selectedUser,
  measurements,
  nutrition,
  workouts,
  currentUser,
  updateState,
  onSelect,
}: UserListProps) {
  const backend = useBackendActions();

  function setStatus(userId: string, status: UserProfile["status"]) {
    void backend.setUserStatus(userId, status);
    updateUserStatus(userId, status, currentUser.id, updateState);
  }

  function setRole(userId: string, role: Exclude<UserProfile["role"], "super_admin">) {
    void backend.setUserRole(userId, role);
    updateUserRole(userId, role, currentUser.id, updateState);
  }

  return (
    <Panel title="Users">
      <div className="grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              className={`focus-ring w-full rounded-2xl px-4 py-3 text-left ${
                selectedUserId === user.id
                  ? "bg-plum text-white"
                  : "border border-plum/10 bg-white dark:border-white/10 dark:bg-white/10"
              }`}
              onClick={() => onSelect(user.id)}
            >
              <p className="font-black">{user.name}</p>
              <p className="text-xs font-black uppercase opacity-55">
                {user.status} · {user.role}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
          <h3 className="text-2xl font-black text-plum dark:text-cream">
            {selectedUser.name}
          </h3>
          <p className="text-sm font-bold text-ink/55 dark:text-cream/55">
            {selectedUser.email}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat label="Measurements" value={`${measurements.length}`} />
            <MiniStat label="Nutrition" value={`${nutrition.length}`} />
            <MiniStat label="Workouts" value={`${workouts.length}`} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedUser.status !== "approved" && (
              <AdminAction
                label="Approve"
                onClick={() => setStatus(selectedUser.id, "approved")}
              />
            )}
            {selectedUser.status !== "suspended" && (
              <AdminAction
                label="Suspend"
                onClick={() => setStatus(selectedUser.id, "suspended")}
              />
            )}
            {canManageAdmins(currentUser) &&
              selectedUser.role !== "admin" &&
              selectedUser.role !== "super_admin" && (
                <AdminAction
                  label="Make admin"
                  onClick={() => setRole(selectedUser.id, "admin")}
                />
              )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
