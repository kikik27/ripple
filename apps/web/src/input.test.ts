import test from "node:test";
import assert from "node:assert/strict";
import { cardinalFromAnalog } from "./input.ts";

test("analog deadzone and deterministic cardinal tie", () => {
  assert.equal(cardinalFromAnalog(9, 0, 40), null);
  assert.equal(cardinalFromAnalog(10, 0, 40), "E");
  assert.equal(cardinalFromAnalog(25, 25, 40), "E");
  assert.equal(cardinalFromAnalog(-25, -25, 40), "W");
  assert.equal(cardinalFromAnalog(8, -25, 40), "N");
  assert.equal(cardinalFromAnalog(3, 26, 40), "S");
});
