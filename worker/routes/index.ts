/**
 * Route registry: one line per module. Each module exports `routes: Route[]`.
 * To add a module (e.g. push, billing): create worker/routes/<name>.ts and add one export line below.
 */
export { routes as health } from "./health";
export { routes as config } from "./config";
export { routes as guest } from "./guest";
export { routes as parentSignup } from "./parentSignup";
export { routes as auth } from "./auth";
export { routes as me } from "./me";
export { routes as children } from "./children";
export { routes as friends } from "./friends";
export { routes as challenges } from "./challenges";
export { routes as unsubscribe } from "./unsubscribe";
export { routes as push } from "./push";
export { routes as billing } from "./billing";
