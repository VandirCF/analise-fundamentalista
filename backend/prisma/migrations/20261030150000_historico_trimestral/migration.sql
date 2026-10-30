-- Histórico fundamentalista trimestral (F7, T-025). Gerada por prisma migrate diff a partir do schema anterior.
-- Não aplicada em nenhum banco nesta etapa: aplicar com 'npm run db:deploy' após revisão.

-- CreateTable
CREATE TABLE "DemonstracaoContabil" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "cdCvm" VARCHAR(6) NOT NULL,
    "tipo" VARCHAR(3) NOT NULL,
    "dtRefer" DATE NOT NULL,
    "dtInicioExerc" DATE NOT NULL,
    "versao" INTEGER NOT NULL,
    "conta" VARCHAR(20) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,
    "dataDivulgacao" DATE NOT NULL,

    CONSTRAINT "DemonstracaoContabil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicadorTrimestral" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "indicador" VARCHAR(20) NOT NULL,
    "valor" DOUBLE PRECISION,
    "dataDivulgacao" DATE NOT NULL,
    "calculadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndicadorTrimestral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemonstracaoContabil_ticker_dtRefer_idx" ON "DemonstracaoContabil"("ticker", "dtRefer");

-- CreateIndex
CREATE UNIQUE INDEX "DemonstracaoContabil_cdCvm_dtRefer_dtInicioExerc_conta_vers_key" ON "DemonstracaoContabil"("cdCvm", "dtRefer", "dtInicioExerc", "conta", "versao");

-- CreateIndex
CREATE UNIQUE INDEX "IndicadorTrimestral_ticker_ano_trimestre_indicador_key" ON "IndicadorTrimestral"("ticker", "ano", "trimestre", "indicador");

