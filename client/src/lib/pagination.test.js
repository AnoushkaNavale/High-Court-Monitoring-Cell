import test from "node:test";
import assert from "node:assert/strict";
import { pageNumbers } from "./pagination.js";

test("page numbers stay within available table pages", () => {
  assert.deepEqual(pageNumbers(1, 10), [1, 2, 3]);
  assert.deepEqual(pageNumbers(5, 10), [3, 4, 5, 6, 7]);
  assert.deepEqual(pageNumbers(10, 10), [8, 9, 10]);
});
