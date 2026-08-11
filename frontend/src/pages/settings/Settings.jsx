import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CURRENCY_OPTIONS } from "../../data/currencies";
import useSettings from "../../context/SettingsContext";

const Section = ({ title, children }) => (
  <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
    <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
    {children}
  </section>
);

export default function Settings() {
  const { t } = useTranslation();
  const {
    theme,
    language,
    dateFormat,
    currency,
    notifyEmail,
    notifyPush,
    companyName,
    companyAddress,
    updateTheme,
    updateLanguage,
    updateDateFormat,
    updateCurrency,
    updateNotifyEmail,
    updateNotifyPush,
    updateCompanyName,
    updateCompanyAddress,
  } = useSettings();

  const [saved, setSaved] = useState(false);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {t("settings.subtitle")}
          </p>
        </div>
        {saved && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            {t("settings.saved")}
          </span>
        )}
      </div>

      {/* Company Profile */}
      <Section title={t("settings.companyProfile")}>
        <div className="space-y-4">
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("settings.companyName")}
            </label>
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => updateCompanyName(e.target.value)}
              onBlur={showSaved}
              className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="GNS"
            />
          </div>
          <div>
            <label htmlFor="company-address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("settings.address")}
            </label>
            <textarea
              id="company-address"
              value={companyAddress}
              onChange={(e) => updateCompanyAddress(e.target.value)}
              onBlur={showSaved}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="123 Factory Road, Industrial Park"
            />
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section title={t("settings.preferences")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("common.language")}</label>
            <select
              value={language}
              onChange={(e) => { updateLanguage(e.target.value); showSaved(); }}
              className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="English">English</option>
              <option value="Hindi">हिन्दी</option>
              <option value="Tamil">தமிழ்</option>
              <option value="Telugu">తెలుగు</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.dateFormat")}</label>
            <select
              value={dateFormat}
              onChange={(e) => { updateDateFormat(e.target.value); showSaved(); }}
              className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              <option value="MM-DD-YYYY">MM-DD-YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.currency")}</label>
            <select
              value={currency}
              onChange={(e) => { updateCurrency(e.target.value); showSaved(); }}
              className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title={t("settings.notifications")}>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.emailNotifications")}</span>
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => { updateNotifyEmail(e.target.checked); showSaved(); }}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.pushNotifications")}</span>
            <input
              type="checkbox"
              checked={notifyPush}
              onChange={(e) => { updateNotifyPush(e.target.checked); showSaved(); }}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>
      </Section>

      {/* Theme */}
      <Section title={t("settings.appearance")}>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t("settings.theme")}</label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="theme"
                checked={theme === "light"}
                onChange={() => { updateTheme("light"); showSaved(); }}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t("settings.light")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="theme"
                checked={theme === "dark"}
                onChange={() => { updateTheme("dark"); showSaved(); }}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t("settings.dark")}</span>
            </label>
          </div>
        </div>
      </Section>
    </div>
  );
}
