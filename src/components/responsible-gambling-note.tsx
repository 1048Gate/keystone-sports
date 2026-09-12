import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const COPY = "Lines are for information only. 21+ · If you gamble, call 1-800-GAMBLER.";

export function ResponsibleGamblingNote({
  className,
  deskLink,
}: {
  className?: string;
  deskLink?: boolean;
}) {
  return (
    <p className={cn("text-xs text-subtle", className)}>
      {COPY}
      {deskLink ? (
        <>
          {" "}
          Log a pick in the{" "}
          <Link to="/desk" className="text-fg underline-offset-2 hover:underline">
            editor
          </Link>{" "}
          if you want a private record.
        </>
      ) : null}
    </p>
  );
}
