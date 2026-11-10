/**
 * Router
 * Hash based so it works on any static host / Live Server:
 *   #home   #products   #foodlog   #meal/52772
 * Every tab change updates the URL, and the browser back/forward buttons work.
 */
export class Router {
  /** @param {Record<string, (param?: string) => Promise<void>|void>} routes */
  constructor(routes) {
    this.routes = routes;
    this.current = "";
    window.addEventListener("hashchange", () => this.resolve());
  }

  start() {
    return this.resolve();
  }

  navigate(path) {
    if (location.hash === `#${path}`) return this.resolve();
    location.hash = path;
    return Promise.resolve();
  }

  async resolve() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [name = "home", param] = raw.split("/");
    const route = this.routes[name];

    if (!route) {
      history.replaceState(null, "", "#home");
      return this.routes.home();
    }
    this.current = name;
    window.scrollTo(0, 0);
    return route(param ? decodeURIComponent(param) : undefined);
  }
}
