import { FileQuestion, RotateCw, TriangleAlert } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const describeError = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        detail: null,
        icon: FileQuestion,
        message: "There is nothing at this address. Trans Diff lives on the home page.",
        title: "Page not found"
      };
    }
    return {
      detail: error.statusText || null,
      icon: TriangleAlert,
      message: "The page could not be loaded.",
      title: `Error ${error.status}`
    };
  }

  return {
    detail: error instanceof Error ? error.message : null,
    icon: TriangleAlert,
    message:
      "Something went wrong while rendering the editor. Your files were only held in memory, so reloading starts fresh.",
    title: "Something went wrong"
  };
};

export default function ErrorPage() {
  const error = useRouteError();
  const { detail, icon: Icon, message, title } = describeError(error);
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-500 ease-out">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">{message}</p>
        </div>
        {detail && (
          <pre className="w-full overflow-x-auto rounded-lg border bg-card px-3 py-2 text-left font-mono text-xs text-muted-foreground">
            {detail}
          </pre>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Link className={cn(buttonVariants())} to="/">
            Go to Trans Diff
          </Link>
          {!isNotFound && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCw />
              Reload
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
