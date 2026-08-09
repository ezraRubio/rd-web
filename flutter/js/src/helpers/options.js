import { getEffectiveOption } from "./config";
import { loadPeerOptions, setPeerField } from "./peer_store";

function setUserDefaultOption(value) {
  try {
    const ojb = JSON.parse(value);
    const userDefaultOptions =
      JSON.parse(localStorage.getItem("user-default-options")) || {};
    userDefaultOptions[ojb.name] = ojb.value;
    localStorage.setItem(
      "user-default-options",
      JSON.stringify(userDefaultOptions),
    );
  } catch (e) {
    console.error("Failed to set user default options: " + e.message);
  }
}

export function getUserDefaultOption(value) {
  const configValue = getEffectiveOption(value);
  if (configValue) {
    return configValue;
  }
  const defaultOptions = {
    view_style: "original",
    scroll_style: "scrollauto",
    image_quality: "balanced",
    "codec-preference": "auto",
    custom_image_quality: "50",
    "custom-fps": "30",
  };
  try {
    const userDefaultOptions =
      JSON.parse(localStorage.getItem("user-default-options")) || {};
    return userDefaultOptions[value] || defaultOptions[value] || "";
  } catch (e) {
    console.error("Failed to get user default options: " + e.message);
    return defaultOptions[value] || "";
  }
}

export function getPeerOption(value) {
  try {
    const obj = JSON.parse(value);
    const options = loadPeerOptions(obj.id);
    return options[obj.name] ?? getUserDefaultOption(obj.name);
  } catch (e) {
    console.error('Failed to get peer option: "' + value + '", ' + e.message);
  }
}

export function setPeerOption(param) {
  try {
    const obj = JSON.parse(param);
    setPeerField(obj.id, obj.name, obj.value);
  } catch (e) {
    console.error('Failed to set peer option: "' + param + '", ' + e.message);
  }
}

export { setUserDefaultOption };
