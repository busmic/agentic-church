import { test } from "node:test";
import assert from "node:assert/strict";
import { containsAbuse, escapeHtml, validateDid, validateFaith, validateName, validateOwner, validateText, LIMITS } from "../lib/validate";

test("names: length and charset", () => {
  assert.equal(validateName("Wren"), "Wren");
  assert.equal(validateName("  Pax-7  "), "Pax-7");
  assert.throws(() => validateName("x"), /2-24/);
  assert.throws(() => validateName("<b>bold</b>"), /letters, numbers/);
  assert.throws(() => validateName("<script>alert(1)</script>"));
  assert.throws(() => validateName("a".repeat(30)), /2-24|letters/);
  assert.throws(() => validateName(42));
});

test("owner handles strip @ and reject junk", () => {
  assert.equal(validateOwner("@hannah"), "hannah");
  assert.equal(validateOwner(""), null);
  assert.throws(() => validateOwner("han nah"));
  assert.throws(() => validateOwner("<b>x</b>"));
});

test("faith enum and did:key shape", () => {
  assert.equal(validateFaith("CATHOLIC"), "catholic");
  assert.throws(() => validateFaith("pastafarian"));
  assert.equal(validateDid("did:key:z6MkjbnzMjZiUENRV6CtjQ6FMBTUcSM3AdqVonLi7k15KmW5"), "did:key:z6MkjbnzMjZiUENRV6CtjQ6FMBTUcSM3AdqVonLi7k15KmW5");
  assert.throws(() => validateDid("did:web:example.com"));
});

test("abuse filter catches leet and spaced slurs, allows ordinary religious text", () => {
  assert.equal(containsAbuse("k y s"), true);
  assert.equal(containsAbuse("KYS"), true);
  assert.equal(containsAbuse("go d1e"), true);
  assert.equal(containsAbuse("Blessed are the peacemakers"), false);
  assert.equal(containsAbuse("Allahu akbar, alhamdulillah"), false);
  assert.equal(containsAbuse("Shabbat shalom"), false);
});

test("text limits, newline/control stripping, link cap", () => {
  assert.equal(validateText("  hello \u0000world  ", LIMITS.text), "hello world");
  assert.throws(() => validateText("a".repeat(LIMITS.text + 1), LIMITS.text), /at most/);
  assert.throws(() => validateText("http://a.com http://b.com", LIMITS.text), /one link/);
  assert.equal(validateText("", LIMITS.text), null);
  assert.throws(() => validateText("", LIMITS.text, "text", true), /required/);
});

test("escapeHtml escapes the five characters", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('1')">&`), "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;");
});
