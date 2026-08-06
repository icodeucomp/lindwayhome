/**
 * Makes a thrown value safe to put in a JSON response body.
 *
 * Every handler ends with `catch (error) { … message: error }` (§E3). An `Error`
 * instance has no enumerable own properties, so `JSON.stringify` renders it as `{}` —
 * the client receives `{ success: false, message: {} }` and the admin sees an empty
 * error toast with nothing to act on. The failure is fully described in the server
 * log and completely invisible in the UI.
 *
 * The response shape is unchanged; only the value stops being a black hole.
 */
export const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  // Zod issue arrays and similar structured throws still carry their detail.
  if (error && typeof error === "object") {
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      /* circular or otherwise unserializable — fall through to the generic message */
    }
  }

  return "An unexpected error occurred";
};
