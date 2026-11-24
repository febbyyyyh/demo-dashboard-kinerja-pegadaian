<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## FormKanwil architecture

- Pages write data only through `repository` (src/lib/formkanwil/repository.ts) and sign in only through `auth` (auth.ts); never call `setDb` from routes, so a Cloud adapter can replace the browser-storage one.
- Brand colours live in runtime CSS variables (`--primary`, `--primary-deep`, `--primary-glow`, `--lime`, `--font-ui`) written by theme.ts; every other token derives from them in src/styles.css, so never hardcode brand colours in components.
- Admin navigation is schema-driven from Form objects via `buildAdminNavigation` (navigation.ts); add menu entries there, not inline in the sidebar.
- Daily Report numbers come from pure functions in daily-report.ts (feeding forms via `Form.feedingSlot`, max two); views only format them, and rule changes need a test in src/test/daily-report.test.ts.
- Report exports (JPEG via html-to-image, CSV with BOM + formula escaping, PDF via jspdf-autotable) go through report-export.ts and `ExportableReportFrame` so the official header is always included.
- In react-hook-form Controllers around Radix Select, ignore empty or unchanged `onValueChange` values: Radix re-emits them after `reset()` and would wipe saved mappings.
- Preserve logic.ts, upc-import.ts, UpcListImportDialog, QuestionField, FormPreviewDialog and the respondent `/app` + `/app/isi/$code` flow; extend them rather than rewrite.
