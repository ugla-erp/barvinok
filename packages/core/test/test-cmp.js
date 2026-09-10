import { describe, it, expect } from "vitest";
import { Buffer } from "buffer";

import { makePayload, unpack } from "../lib/services/cmp.js";
import Message from "../lib/models/Message.js";

const ID_A = Buffer.alloc(32, 0xab);
const ID_B = Buffer.alloc(32, 0xcd);

const bodyOf = (request) => new Message(request).info;

describe("cmp.makePayload", () => {
  it("puts both key ids in their slots", () => {
    const body = bodyOf(makePayload([ID_A, ID_B]));

    expect(body.length).toBe(120);
    expect(body.slice(0x0c, 0x2c)).toEqual(ID_A);
    expect(body.slice(0x2c, 0x4c)).toEqual(ID_B);
  });

  it("repeats the only key id a one-key container has", () => {
    const body = bodyOf(makePayload([ID_A]));

    expect(body.slice(0x2c, 0x4c)).toEqual(ID_A);
  });

  it("sets the constants the endpoint expects", () => {
    const body = bodyOf(makePayload([ID_A]));

    expect([body[0x00], body[0x08], body[0x6c], body[0x70]]).toEqual([0x0d, 2, 1, 1]);
  });
});

describe("cmp.unpack", () => {
  const reply = (status, inner) => {
    const head = Buffer.alloc(8);
    head.writeInt32LE(status, 4);

    return new Message({
      type: "data",
      data: Buffer.concat([head, inner ?? Buffer.alloc(0)]),
    }).as_asn1();
  };

  // A CA that does not hold the key still answers well-formed, so "no certificate" is an ordinary
  // result here rather than a failure.
  it("answers null when the status word is not 1", () => {
    expect(unpack(reply(0, Buffer.alloc(4)))).toBe(null);
  });

  it("answers null for bytes that are not a message", () => {
    expect(unpack(Buffer.from("<html>404</html>"))).toBe(null);
  });

  it("does not throw on a truncated body", () => {
    expect(() =>
      unpack(new Message({ type: "data", data: Buffer.alloc(2) }).as_asn1()),
    ).not.toThrow();
  });
});
