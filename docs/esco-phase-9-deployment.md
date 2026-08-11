# ESCO Phase 9 data setup

Phase 9 code is complete; production matching remains empty until the official reference dataset is imported.

1. Download the current ESCO classification CSV package from the [European Commission ESCO download page](https://esco.ec.europa.eu/en/use-esco/download). Select the current version, classification content, CSV, and English. Repeat for Irish, Dutch and German if multilingual labels are required.
2. Extract `skills*.csv`, `occupations*.csv`, and `occupationSkillRelations*.csv` from the package. The Commission documents these files in its [downloadable dataset structure](https://esco.ec.europa.eu/en/structure-esco-downloadable-datasets).
3. Apply both `20260810120000_esco_adaptive_matching.sql` and the corrective `20260811120000_defer_esco_vector_matching.sql` migration to the target Supabase project.
4. Run the one-off importer with service-role credentials in the operator's environment:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
node scripts/import-esco.mjs C:\path\skills_en.csv C:\path\occupations_en.csv C:\path\occupationSkillRelations_en.csv
```

Do not commit the service-role key or dataset archive. Re-run manually when adopting a later ESCO version. Job ingestion invokes deterministic ESCO classification after each sync. The MVP matcher uses explainable essential-skill overlap only. Embedding similarity is deferred until model/version metadata, backfill, quota controls and an explicit user-profile embedding lifecycle are designed.
