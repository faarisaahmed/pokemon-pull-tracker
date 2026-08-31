import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/sets.tsx"),
  route("sets/:setId", "routes/set-detail.tsx"),
  route("cards", "routes/cards.tsx"),
  route("cards/:cardId", "routes/card-detail.tsx"),
  route("chase", "routes/chase.tsx"),
  route("about", "routes/about.tsx"),
  route("api/psa/:cardId", "routes/api.psa.tsx"),
] satisfies RouteConfig;
