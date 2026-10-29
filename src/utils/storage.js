// Token storage uses sessionStorage (not localStorage) so the JWT is wiped
// automatically when the browser tab / window is closed. This limits the
// exposure window for any XSS-based token theft compared to localStorage.

function isAvailable() {
  try {
    const test = "__sap_storage_test__";
    sessionStorage.setItem(test, "1");
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const memStore = {};

export function getItem(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return memStore[key] ?? null;
  }
}

export function setItem(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    memStore[key] = value;
  }
}

export function removeItem(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    delete memStore[key];
  }
}

export const storageAvailable = isAvailable();
