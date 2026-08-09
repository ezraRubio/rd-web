import { setCommonHandlers } from "./set_common.js";
import { setRdHandlers } from "./set_rd.js";
import { setFtHandlers } from "./set_ft.js";
import { getStorageHandlers } from "./get_storage.js";
import { getRdHandlers } from "./get_rd.js";
import { getStubHandlers, setStubHandlers } from "./stubs.js";

export const setByNameHandlers = {
  ...setCommonHandlers,
  ...setRdHandlers,
  ...setFtHandlers,
  ...setStubHandlers,
};

export const getByNameHandlers = {
  ...getStorageHandlers,
  ...getRdHandlers,
  ...getStubHandlers,
};

export function dispatchSetByName(name, value, ctx) {
  const handler = setByNameHandlers[name];
  if (!handler) return undefined;
  return handler(ctx, value);
}

export function dispatchGetByName(name, arg, ctx) {
  const handler = getByNameHandlers[name];
  if (!handler) return undefined;
  return handler(ctx, arg);
}
