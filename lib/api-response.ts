import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export function apiError(status: number, code: ApiErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const unauthorized = () =>
  apiError(401, "UNAUTHORIZED", "You must be signed in to perform this action.");

export const forbidden = (message = "You do not have permission to perform this action.") =>
  apiError(403, "FORBIDDEN", message);

export const notFound = (message = "The requested project could not be found.") =>
  apiError(404, "NOT_FOUND", message);

export const conflict = (message = "The request conflicts with existing data.") =>
  apiError(409, "CONFLICT", message);

export const internalError = (message = "Something went wrong. Please try again.") =>
  apiError(500, "INTERNAL_ERROR", message);
