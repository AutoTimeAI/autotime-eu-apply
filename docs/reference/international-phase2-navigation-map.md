# Dashboard navigation map

This map was fixed before the grouped-navigation code changed. Routes remain
live; grouping changes discovery and active state only.

| Existing destination                                                                                                                                     | Grouped destination             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `/dashboard`                                                                                                                                             | Overview                        |
| `/dashboard/jobs`, `/dashboard/match-score`                                                                                                              | Jobs                            |
| `/dashboard/applications`, `/dashboard/inbox`, `/dashboard/application-answers`, `/dashboard/documents`, `/dashboard/interview`, `/dashboard/follow-ups` | Applications                    |
| `/dashboard/international`                                                                                                                               | International                   |
| `/dashboard/profile`, `/dashboard/autofill-profile`, `/dashboard/cv-tailor`                                                                              | Profile                         |
| `/dashboard/insights`                                                                                                                                    | Insights                        |
| `/dashboard/extension`                                                                                                                                   | Account menu: Extension         |
| `/dashboard/settings`                                                                                                                                    | Account menu: Settings          |
| `/pricing`                                                                                                                                               | Account menu: Plans and billing |

No redirect is required because each existing page remains available at its
current URL. The extension's `/dashboard/jobs` link remains a canonical Jobs
entry point.
