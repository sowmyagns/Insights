import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import {
  findSettingsCategory,
  LEGACY_SETTINGS_REDIRECTS,
} from "./settingsCatalog";
import SettingsSectionContent from "./SettingsSectionContent";

export default function SettingsSectionPage() {
  const { sectionId } = useParams();
  const mapped = LEGACY_SETTINGS_REDIRECTS[sectionId] || sectionId;
  const category = findSettingsCategory(mapped);

  if (!category) {
    return <Navigate to="/settings" replace />;
  }

  if (category.href) {
    return <Navigate to={category.href} replace />;
  }

  if (LEGACY_SETTINGS_REDIRECTS[sectionId] && sectionId !== mapped) {
    return <Navigate to={`/settings/${mapped}`} replace />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-success)] hover:text-[var(--color-success)] dark:text-teal-400"
      >
        <ArrowLeft className="h-4 w-4" />
        All settings
      </Link>
      <SettingsSectionContent sectionId={category.id} category={category} />
    </div>
  );
}
