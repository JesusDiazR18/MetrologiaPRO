-- CreateTable
CREATE TABLE "InstrumentoEquipo" (
    "ID_Equipo" TEXT NOT NULL PRIMARY KEY,
    "Tipo" TEXT NOT NULL,
    "Codigo_Interno" TEXT NOT NULL,
    "Nombre_Equipo" TEXT NOT NULL,
    "Marca" TEXT,
    "Modelo" TEXT,
    "Serie" TEXT,
    "Rango_Medida" TEXT,
    "Resolucion" TEXT,
    "Tolerancia_Aceptable" REAL NOT NULL,
    "Unidad_Tolerancia" TEXT,
    "Area_Asignada" TEXT,
    "Responsable" TEXT,
    "Periodicidad_Meses" INTEGER NOT NULL,
    "Fecha_Ultima_Verificacion" DATETIME,
    "Fecha_Proximo_Control" DATETIME,
    "Foto_Equipo" TEXT,
    "Estado" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PatronReferencia" (
    "ID_Patron" TEXT NOT NULL PRIMARY KEY,
    "Codigo" TEXT NOT NULL,
    "Nombre_Patron" TEXT NOT NULL,
    "Fecha_Calibracion_Externa" DATETIME,
    "Fecha_Vencimiento_Certificado" DATETIME,
    "N_Certificado" TEXT,
    "Proveedor_Laboratorio" TEXT,
    "PDF_Certificado" TEXT,
    "Estado_Vigencia" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "HistorialVerificacion" (
    "ID_Log" TEXT NOT NULL PRIMARY KEY,
    "FK_ID_Equipo" TEXT NOT NULL,
    "Fecha_Ejecucion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "FK_ID_Patron_Usado" TEXT,
    "Medida_Instrumento" REAL,
    "Medida_Patron" REAL,
    "Variacion_Calculada" REAL,
    "Resultado_Status" TEXT NOT NULL,
    "Tecnico_Ejecutor" TEXT NOT NULL,
    "Firma_Digital" TEXT,
    "Observaciones" TEXT,
    "PDF_Certificado_interno" TEXT,
    CONSTRAINT "HistorialVerificacion_FK_ID_Equipo_fkey" FOREIGN KEY ("FK_ID_Equipo") REFERENCES "InstrumentoEquipo" ("ID_Equipo") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HistorialVerificacion_FK_ID_Patron_Usado_fkey" FOREIGN KEY ("FK_ID_Patron_Usado") REFERENCES "PatronReferencia" ("ID_Patron") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Usuario" (
    "Email" TEXT NOT NULL PRIMARY KEY,
    "Nombre" TEXT NOT NULL,
    "Rol" TEXT NOT NULL,
    "Firma_Imagen" TEXT
);

-- CreateIndex
CREATE INDEX "HistorialVerificacion_FK_ID_Equipo_idx" ON "HistorialVerificacion"("FK_ID_Equipo");

-- CreateIndex
CREATE INDEX "HistorialVerificacion_Fecha_Ejecucion_idx" ON "HistorialVerificacion"("Fecha_Ejecucion");
