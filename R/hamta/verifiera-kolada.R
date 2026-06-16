r <- readRDS("data/kolada-hos.rds")
cat("Regioner:\n"); print(as.data.frame(r$regioner))
cat("\nKPI i data:", length(unique(r$data$kpi)),
    " | i metadata:", nrow(r$indikatorer),
    " | i gruppen:", r$grupp$antal_indikatorer, "\n")
saknas_data <- setdiff(r$indikatorer$id, unique(r$data$kpi))
cat("KPI utan data:", paste(saknas_data, collapse = ", "), "\n")
cat("Ar:", paste(range(r$data$ar), collapse = "-"), "\n")
cat("\nIndelning (operating_area x perspective):\n")
print(table(r$indikatorer$operating_area, r$indikatorer$perspective, useNA = "ifany"))
cat("\nForsta rader:\n"); print(utils::head(as.data.frame(r$data), 3))
