import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui/Avatar";
import { ThemeToggle } from "./ui/ThemeToggle";

export function NavBar() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-white px-6 dark:border-line-dark dark:bg-paper-dark">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-ink text-[13px] font-bold text-white dark:bg-white dark:text-ink">
          C
        </span>
        <span className="font-display text-xl font-extrabold tracking-tight text-ink dark:text-white">
          Clinic-O
        </span>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-ink dark:text-white">
              {user ? `${user.firstName} ${user.lastName}` : "Guest"}
            </p>
            <p className="text-[12px] leading-tight text-ink-soft dark:text-surface/60">
              {user?.email ?? ""}
            </p>
          </div>
          <Avatar src={user?.image} name={user?.firstName} size={38} />
        </div>
      </div>
    </header>
  );
}
