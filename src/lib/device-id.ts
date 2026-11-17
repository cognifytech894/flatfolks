// A random id for this browser, kept in a cookie, so limits can apply per
// device as well as per account. Websites can't see a device's MAC address
// or any other hardware id, so this is the closest stand-in: clearing
// cookies or a private window gets a new id, which is why the per-account
// and per-network limits stay in place alongside it.
import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";
import { isUuid } from "@/lib/json-body";
import { isSecureContext } from "@/lib/session";

export const DEVICE_COOKIE = "flatfolks_device";
const DEVICE_COOKIE_DAYS = 400; // the longest browsers keep a cookie

/** This request's device id, or a new one (`isNew`) to store with saveDeviceId. */
export function deviceIdFrom(request: Request): { id: string; isNew: boolean } {
  const cookie = request.headers.get("cookie") || "";
  const value = cookie.split(/;\s*/).find((part) => part.startsWith(`${DEVICE_COOKIE}=`))?.slice(DEVICE_COOKIE.length + 1);
  return isUuid(value) ? { id: value, isNew: false } : { id: randomUUID(), isNew: true };
}

/** Stores a new device id in the browser; does nothing for an id the browser already has. */
export function saveDeviceId<T extends NextResponse>(response: T, request: Request, device: { id: string; isNew: boolean }): T {
  if (device.isNew) {
    response.cookies.set(DEVICE_COOKIE, device.id, {
      httpOnly: true, sameSite: "lax", secure: isSecureContext(request), path: "/", maxAge: 60 * 60 * 24 * DEVICE_COOKIE_DAYS,
    });
  }
  return response;
}
