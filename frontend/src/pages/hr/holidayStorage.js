const STORAGE_KEY = "hr-holidays";

export function loadHolidays() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveHolidays(holidays) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holidays));
}

export function onHolidaysChanged(listener) {
  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY) listener(loadHolidays());
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}
