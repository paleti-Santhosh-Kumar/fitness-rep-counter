import test from "node:test";
import assert from "node:assert/strict";
import { PRAISE_TITLES, randomPraise } from "../src/lib/praise.ts";

test("random praise returns a known title and never repeats the previous one", () => {
  for (let index = 0; index < 50; index += 1) {
    const first = randomPraise();
    assert.ok(PRAISE_TITLES.includes(first.title));
    const second = randomPraise(first.title);
    assert.notEqual(second.title, first.title);
    assert.ok(second.line.length > 0 && second.emoji.length > 0);
  }
});

test("praise selection is deterministic for a given random source", () => {
  assert.equal(randomPraise(undefined, () => 0).title, PRAISE_TITLES[0]);
  assert.equal(randomPraise(PRAISE_TITLES[0], () => 0).title, PRAISE_TITLES[1]);
});
