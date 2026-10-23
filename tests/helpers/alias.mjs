// Lets node --test load app modules that import "@/..." (the tsconfig path alias for src/).
//   node --import ./tests/helpers/alias.mjs --test tests/budget.test.mjs
import { register } from "node:module";

register(new URL("./alias-hooks.mjs", import.meta.url));
