import { useMemo } from "react";
import { matchPath, useLocation } from "react-router-dom";

export const useMatchRoutes = (routes: string[]) => {
  const location = useLocation();
  const pathname = location.pathname;
  return useMemo(() => {
    return routes.some((route) => pathname && matchPath(route, pathname));
  }, [pathname, routes]);
};
