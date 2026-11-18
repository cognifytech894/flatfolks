// Welcome email content.
//   npm run test:welcome

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWelcomeEmail, firstName } from "../src/lib/welcome-email.ts";

const email = buildWelcomeEmail("new@example.test", "https://flatfolks.in/");

test("goes to the new member, with the agreed subject and greeting", () => {
  assert.equal(email.to, "new@example.test");
  assert.equal(email.subject, "Welcome to FlatFolks 🏠");
  for (const body of [email.html, email.text]) assert.match(body, /Hi Folks,/);
  assert.doesNotMatch(email.html + email.text, /Hi there/);
});

test("all three buttons link to the live site", () => {
  for (const href of ["https://flatfolks.in/search", "https://flatfolks.in/property?intent=flatmate", "https://flatfolks.in/profile"]) {
    assert.ok(email.html.includes(`href="${href}"`), href);
    assert.ok(email.text.includes(href), href);
  }
  for (const label of ["Find a Room", "List Your Room for Free", "Complete My Profile"]) assert.ok(email.html.includes(label), label);
});

test("signs off as Team FlatFolks with the site link", () => {
  for (const body of [email.html, email.text]) {
    assert.match(body, /Happy house hunting!/);
    assert.match(body, /Team FlatFolks/);
    assert.ok(body.includes("https://flatfolks.in/"));
  }
});

test("greets the member by first name", () => {
  const named = buildWelcomeEmail("new@example.test", "https://flatfolks.in/", "  Ankit   Kumar ");
  for (const body of [named.html, named.text]) assert.match(body, /Hi Ankit,/);
  assert.doesNotMatch(named.html + named.text, /Hi Folks,/);
});

test("escapes the name in the HTML", () => {
  const named = buildWelcomeEmail("new@example.test", "https://flatfolks.in/", "<b>x</b>");
  assert.match(named.html, /Hi &lt;b&gt;x&lt;\/b&gt;,/);
  assert.doesNotMatch(named.html, /Hi <b>/);
});

test("firstName takes the first word, empty when blank", () => {
  assert.equal(firstName("Priya Sharma"), "Priya");
  assert.equal(firstName("   "), "");
  assert.equal(firstName(undefined), "");
});
