import { useDb } from "./store";

export { useCurrentUser, useIsAdmin } from "./store";

/* Read hooks over the active data source. Swap the internals when the Cloud adapter lands. */

export function useForms() {
  return useDb().forms;
}

export function useForm(formId: string) {
  return useDb().forms.find((form) => form.id === formId);
}

export function useResponses(formId?: string) {
  const responses = useDb().responses;
  return formId ? responses.filter((response) => response.formId === formId) : responses;
}

export function useDailyReportConfig() {
  return useDb().dailyReport;
}

export function useThemeSettings() {
  return useDb().theme;
}

export function useIntegrations() {
  const db = useDb();
  return { settings: db.integrations, backups: db.backups };
}
