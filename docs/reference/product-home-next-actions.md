# Home next-action rules

`getHomeNextAction` is pure, typed and deterministic. It applies this order:

1. no credible evidence — Add career evidence;
2. evidence without a saved lane — Discover role pathways;
3. no target country — Choose target countries;
4. lane without jobs — Add a job;
5. saved unanalysed job — Analyse job;
6. suitable analysed job — Prepare application;
7. prepared application — Review application;
8. applied job with an action — Review follow-up;
9. interview recorded — Prepare for interview;
10. otherwise — Add another job.

AI does not select or reorder Home actions. Supporting panels render only when
their underlying lane, country or application data exists.
