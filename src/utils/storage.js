function isAvailable() {
  try {
    const test = "__sap_storage_test__";
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const memStore = {};

export function getItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memStore[key] ?? null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memStore[key] = value;
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    delete memStore[key];
  }
}

export const storageAvailable = isAvailable();
